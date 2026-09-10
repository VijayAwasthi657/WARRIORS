const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const {
  registerUser,
  loginUser,
  authMiddleware,
  getUserByUniqueId,
} = require("./auth");

const db = require("./database");

const app = express();

// SERVER PORT

const PORT = process.env.PORT || 5000;

// MIDDLEWARE

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// DIRECTORIES

const uploadDirectory = path.join(
  __dirname,
  "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// MULTER STORAGE

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname
    );

    const uniqueName = `${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// HOME / HEALTH CHECK

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SecureDMS API is running",
  });
});

// REGISTER

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      userId,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !userId ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, Unique ID, email and password are required.",
      });
    }

    const user = await registerUser({
      name,
      userId,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Registration failed.",
    });
  }
});

// LOGIN

app.post("/api/login", async (req, res) => {
  try {
    const {
      login,
      password,
    } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Unique ID/email and password are required.",
      });
    }

    const result = await loginUser({
      login,
      password,
    });

    if (!result) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid Unique ID/email or password.",
      });
    }

    return res.json({
      success: true,
      message: "Login successful.",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});

// CURRENT USER

app.get(
  "/api/me",
  authMiddleware,
  (req, res) => {
    try {
      const user =
        getUserByUniqueId(
          req.user.userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.json({
        success: true,

        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error(
        "Current user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get user.",
      });
    }
  }
);

// UPLOAD DOCUMENTS

app.post(
  "/api/documents/upload",
  authMiddleware,
  upload.array("documents"),
  (req, res) => {
    try {
      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded.",
        });
      }

      const insertDocument =
        db.prepare(`
          INSERT INTO documents (
            id,
            owner_id,
            name,
            stored_name,
            type,
            mime_type,
            size,
            uploaded_at,
            deleted_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `);

      const newDocuments = [];

      const transaction = db.transaction(
        (files) => {
          for (const file of files) {
            const id = `${Date.now()}-${crypto
              .randomBytes(8)
              .toString("hex")}`;

            const type =
              path
                .extname(
                  file.originalname
                )
                .replace(".", "")
                .toUpperCase() ||
              "FILE";

            const uploadedAt =
              new Date().toISOString();

            insertDocument.run(
              id,
              req.user.userId,
              file.originalname,
              file.filename,
              type,
              file.mimetype,
              file.size,
              uploadedAt
            );

            newDocuments.push({
              id,

              ownerId:
                req.user.userId,

              name:
                file.originalname,

              storedName:
                file.filename,

              type,

              mimeType:
                file.mimetype,

              size:
                file.size,

              uploadedAt,

              url:
                `/api/documents/${id}/file`,
            });
          }
        }
      );

      transaction(req.files);

      return res.status(201).json({
        success: true,
        message:
          "Files uploaded successfully.",
        files: newDocuments,
      });
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Upload failed.",
      });
    }
  }
);

// GET USER DOCUMENTS

app.get(
  "/api/documents",
  authMiddleware,
  (req, res) => {
    try {
      const documents =
        db
          .prepare(`
            SELECT
              id,
              owner_id,
              name,
              stored_name,
              type,
              mime_type,
              size,
              uploaded_at
            FROM documents
            WHERE owner_id = ?
              AND deleted_at IS NULL
            ORDER BY uploaded_at DESC
          `)
          .all(req.user.userId);

      const validDocuments = [];

      for (const document of documents) {
        const filePath = path.join(
          uploadDirectory,
          document.stored_name
        );

        if (
          fs.existsSync(filePath)
        ) {
          validDocuments.push({
            id: document.id,

            ownerId:
              document.owner_id,

            name:
              document.name,

            storedName:
              document.stored_name,

            type:
              document.type,

            mimeType:
              document.mime_type,

            size:
              document.size,

            uploadedAt:
              document.uploaded_at,

            url:
              `/api/documents/${document.id}/file`,
          });
        }
      }

      return res.json({
        success: true,
        documents:
          validDocuments,
      });
    } catch (error) {
      console.error(
        "Get documents error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get documents.",
      });
    }
  }
);

// PREVIEW DOCUMENT

app.get(
  "/api/documents/:id/file",
  authMiddleware,
  (req, res) => {
    try {
      const document =
        db
          .prepare(`
            SELECT *
            FROM documents
            WHERE id = ?
              AND owner_id = ?
              AND deleted_at IS NULL
          `)
          .get(
            req.params.id,
            req.user.userId
          );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found.",
        });
      }

      const filePath = path.join(
        uploadDirectory,
        document.stored_name
      );

      if (
        !fs.existsSync(filePath)
      ) {
        return res.status(404).json({
          success: false,
          message:
            "File not found on server.",
        });
      }

      res.setHeader(
        "Content-Type",
        document.mime_type ||
          "application/octet-stream"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(
          document.name
        )}"`
      );

      return res.sendFile(filePath);
    } catch (error) {
      console.error(
        "Preview error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to open document.",
      });
    }
  }
);

// DOWNLOAD DOCUMENT

app.get(
  "/api/documents/:id/download",
  authMiddleware,
  (req, res) => {
    try {
      const document =
        db
          .prepare(`
            SELECT *
            FROM documents
            WHERE id = ?
              AND owner_id = ?
              AND deleted_at IS NULL
          `)
          .get(
            req.params.id,
            req.user.userId
          );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found.",
        });
      }

      const filePath = path.join(
        uploadDirectory,
        document.stored_name
      );

      if (
        !fs.existsSync(filePath)
      ) {
        return res.status(404).json({
          success: false,
          message:
            "File not found.",
        });
      }

      return res.download(
        filePath,
        document.name
      );
    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to download document.",
      });
    }
  }
);

// MOVE TO TRASH

app.post(
  "/api/documents/:id/trash",
  authMiddleware,
  (req, res) => {
    try {
      const document =
        db
          .prepare(`
            SELECT *
            FROM documents
            WHERE id = ?
              AND owner_id = ?
              AND deleted_at IS NULL
          `)
          .get(
            req.params.id,
            req.user.userId
          );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found.",
        });
      }

      const deletedAt =
        new Date().toISOString();

      db.prepare(`
        UPDATE documents
        SET deleted_at = ?
        WHERE id = ?
          AND owner_id = ?
      `).run(
        deletedAt,
        req.params.id,
        req.user.userId
      );

      return res.json({
        success: true,
        message:
          "Document moved to trash.",
      });
    } catch (error) {
      console.error(
        "Trash error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to move document to trash.",
      });
    }
  }
);

// GET TRASH

app.get(
  "/api/trash",
  authMiddleware,
  (req, res) => {
    try {
      const documents =
        db
          .prepare(`
            SELECT
              id,
              owner_id,
              name,
              stored_name,
              type,
              mime_type,
              size,
              uploaded_at,
              deleted_at
            FROM documents
            WHERE owner_id = ?
              AND deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
          `)
          .all(req.user.userId);

      const result =
        documents.map(
          (document) => ({
            id: document.id,

            ownerId:
              document.owner_id,

            name:
              document.name,

            storedName:
              document.stored_name,

            type:
              document.type,

            mimeType:
              document.mime_type,

            size:
              document.size,

            uploadedAt:
              document.uploaded_at,

            deletedAt:
              document.deleted_at,

            url:
              `/api/documents/${document.id}/file`,
          })
        );

      return res.json({
        success: true,
        documents: result,
      });
    } catch (error) {
      console.error(
        "Trash list error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get trash.",
      });
    }
  }
);

// RESTORE

app.post(
  "/api/trash/:id/restore",
  authMiddleware,
  (req, res) => {
    try {
      const document =
        db
          .prepare(`
            SELECT *
            FROM documents
            WHERE id = ?
              AND owner_id = ?
              AND deleted_at IS NOT NULL
          `)
          .get(
            req.params.id,
            req.user.userId
          );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Trash document not found.",
        });
      }

      db.prepare(`
        UPDATE documents
        SET deleted_at = NULL
        WHERE id = ?
          AND owner_id = ?
      `).run(
        req.params.id,
        req.user.userId
      );

      return res.json({
        success: true,
        message:
          "Document restored.",
      });
    } catch (error) {
      console.error(
        "Restore error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to restore document.",
      });
    }
  }
);

// PERMANENT DELETE

app.delete(
  "/api/trash/:id",
  authMiddleware,
  (req, res) => {
    try {
      const document =
        db
          .prepare(`
            SELECT *
            FROM documents
            WHERE id = ?
              AND owner_id = ?
              AND deleted_at IS NOT NULL
          `)
          .get(
            req.params.id,
            req.user.userId
          );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Trash document not found.",
        });
      }

      const filePath = path.join(
        uploadDirectory,
        document.stored_name
      );

      if (
        fs.existsSync(filePath)
      ) {
        fs.unlinkSync(filePath);
      }

      db.prepare(`
        DELETE FROM documents
        WHERE id = ?
          AND owner_id = ?
      `).run(
        req.params.id,
        req.user.userId
      );

      return res.json({
        success: true,
        message:
          "Document permanently deleted.",
      });
    } catch (error) {
      console.error(
        "Permanent delete error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to permanently delete document.",
      });
    }
  }
);

// MULTER / SERVER ERROR

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "File size cannot exceed 50 MB.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Internal server error.",
    });
  }
);

// VERCEL EXPORT

module.exports = app;

// LOCAL DEVELOPMENT SERVER

if (require.main === module) {
  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log("");
      console.log(
        "===================================="
      );
      console.log(
        "          SecureDMS Backend"
      );
      console.log(
        "===================================="
      );
      console.log(
        `Server running on port ${PORT}`
      );
      console.log(
        `Upload folder: ${uploadDirectory}`
      );
      console.log(
        "Users file: ./data/users.json"
      );
      console.log(
        "Database: ./data/securedms.db"
      );
      console.log("");
    }
  );
}

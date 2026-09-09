const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

//JWT SECRET

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "securedms-development-secret-change-this";

// USERS FILE

const dataDirectory = path.join(
  __dirname,
  "data"
);

const usersFile = path.join(
  dataDirectory,
  "users.json"
);

/* Create data directory */

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });
}

/* Create users.json */

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(
    usersFile,
    "[]",
    "utf8"
  );
}

//READ USERS

function readUsers() {
  try {
    const data = fs.readFileSync(
      usersFile,
      "utf8"
    );

    if (!data.trim()) {
      return [];
    }

    const users = JSON.parse(data);

    if (!Array.isArray(users)) {
      return [];
    }

    return users;
  } catch (error) {
    console.error(
      "Read users error:",
      error
    );

    return [];
  }
}

// SAVE USERS

function saveUsers(users) {
  try {
    fs.writeFileSync(
      usersFile,
      JSON.stringify(
        users,
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    console.error(
      "Save users error:",
      error
    );

    throw new Error(
      "Unable to save user account."
    );
  }
}

//  VALIDATE USER ID

function validateUserId(userId) {
  return /^[A-Z0-9-]{4,30}$/.test(
    userId
  );
}

// REGISTER USER

async function registerUser({
  name,
  userId,
  email,
  password,
}) {
  const users = readUsers();

  const cleanName =
    String(name || "").trim();

  const cleanUserId =
    String(userId || "")
      .trim()
      .toUpperCase();

  const cleanEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const cleanPassword =
    String(password || "");

  // REQUIRED FIELDS

  if (
    !cleanName ||
    !cleanUserId ||
    !cleanEmail ||
    !cleanPassword
  ) {
    throw new Error(
      "Name, Unique ID, email and password are required."
    );
  }

  // NAME VALIDATION

  if (cleanName.length < 2) {
    throw new Error(
      "Name must contain at least 2 characters."
    );
  }

  // USER ID VALIDATION

  if (!validateUserId(cleanUserId)) {
    throw new Error(
      "Unique ID must contain only letters, numbers and hyphens, and must be 4-30 characters long."
    );
  }

  // EMAIL VALIDATION

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(cleanEmail)) {
    throw new Error(
      "Please enter a valid email address."
    );
  }

  //PASSWORD VALIDATION

  if (cleanPassword.length < 8) {
    throw new Error(
      "Password must be at least 8 characters."
    );
  }

  // CHECK UNIQUE USER ID

  const existingUserId =
    users.find((user) => {
      return (
        String(user.userId || "")
          .trim()
          .toUpperCase() ===
        cleanUserId
      );
    });

  if (existingUserId) {
    throw new Error(
      "This Unique ID is already registered."
    );
  }

  // CHECK UNIQUE EMAIL

  const existingEmail =
    users.find((user) => {
      return (
        String(user.email || "")
          .trim()
          .toLowerCase() ===
        cleanEmail
      );
    });

  if (existingEmail) {
    throw new Error(
      "An account with this email already exists."
    );
  }

  //  HASH PASSWORD

  const passwordHash =
    await bcrypt.hash(
      cleanPassword,
      12
    );

  //     CREATE INTERNAL ID

  const internalId =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;

  //CREATE USER

  const newUser = {
    id: internalId,

    userId: cleanUserId,

    name: cleanName,

    email: cleanEmail,

    passwordHash,

    role: "user",

    createdAt:
      new Date().toISOString(),
  };

  users.push(newUser);

  saveUsers(users);

  //  SAFE RESPONSE

  return {
    id: newUser.id,

    userId: newUser.userId,

    name: newUser.name,

    email: newUser.email,

    role: newUser.role,

    createdAt:
      newUser.createdAt,
  };
}

//LOGIN USER

async function loginUser({
  login,
  password,
}) {
  const users = readUsers();

  const cleanLogin =
    String(login || "").trim();

  const cleanPassword =
    String(password || "");

  if (
    !cleanLogin ||
    !cleanPassword
  ) {
    return null;
  }

  const normalizedLogin =
    cleanLogin.toLowerCase();

  //  FIND USER

  const user =
    users.find((item) => {
      const itemEmail =
        String(item.email || "")
          .trim()
          .toLowerCase();

      const itemUserId =
        String(item.userId || "")
          .trim()
          .toLowerCase();

      return (
        itemEmail ===
          normalizedLogin ||
        itemUserId ===
          normalizedLogin
      );
    });

  if (!user) {
    return null;
  }

  //   CHECK PASSWORD HASH

  if (!user.passwordHash) {
    return null;
  }

  //  VERIFY PASSWORD

  const validPassword =
    await bcrypt.compare(
      cleanPassword,
      user.passwordHash
    );

  if (!validPassword) {
    return null;
  }

  //  CREATE JWT

  const token =
    jwt.sign(
      {
        id: user.id,

        userId:
          user.userId,

        email:
          user.email,

        role:
          user.role,
      },

      JWT_SECRET,

      {
        expiresIn: "8h",
      }
    );

  // RETURN LOGIN RESULT

  return {
    token,

    user: {
      id: user.id,

      userId:
        user.userId,

      name:
        user.name,

      email:
        user.email,

      role:
        user.role,
    },
  };
}

// VERIFY TOKEN

function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }

    return jwt.verify(
      token,
      JWT_SECRET
    );
  } catch (error) {
    return null;
  }
}

// AUTH MIDDLEWARE

function authMiddleware(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    let token = null;

    //  BEARER TOKEN

    if (
      authorization &&
      authorization.startsWith(
        "Bearer "
      )
    ) {
      token =
        authorization
          .substring(7)
          .trim();
    }

    //QUERY TOKEN
       Optional support

    if (
      !token &&
      req.query &&
      req.query.token
    ) {
      token =
        String(
          req.query.token
        ).trim();
    }

    //   NO TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required.",
      });
    }

    //  VERIFY TOKEN

    const user =
      verifyToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,

        message:
          "Invalid or expired token.",
      });
    }

    //ATTACH USER

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Authentication failed.",
    });
  }
}

//GET USER BY INTERNAL ID

function getUserById(id) {
  const users = readUsers();

  return (
    users.find(
      (user) =>
        String(user.id) ===
        String(id)
    ) || null
  );
}

//GET USER BY UNIQUE ID

function getUserByUniqueId(
  userId
) {
  const users = readUsers();

  const cleanUserId =
    String(userId || "")
      .trim()
      .toUpperCase();

  return (
    users.find(
      (user) =>
        String(user.userId || "")
          .trim()
          .toUpperCase() ===
        cleanUserId
    ) || null
  );
}

//EXPORT

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  authMiddleware,
  getUserById,
  getUserByUniqueId,
};

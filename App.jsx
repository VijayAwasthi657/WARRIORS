import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("securedms_token")
  );

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem("securedms_user");

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch (error) {
      console.error("User data parse error:", error);
      return null;
    }
  });

  const [authPage, setAuthPage] = useState("login");

  const handleLogin = (newToken, newUser) => {
    if (!newToken || !newUser) {
      return;
    }

    localStorage.setItem(
      "securedms_token",
      newToken
    );

    localStorage.setItem(
      "securedms_user",
      JSON.stringify(newUser)
    );

    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("securedms_token");
    localStorage.removeItem("securedms_user");

    setToken(null);
    setUser(null);
    setAuthPage("login");
  };

  if (!token || !user) {
    return (
      <AuthScreen
        page={authPage}
        setPage={setAuthPage}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <SecureDMS
      token={token}
      user={user}
      onLogout={handleLogout}
    />
  );
}

// AUTH SCREEN

function AuthScreen({
  page,
  setPage,
  onLogin,
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🛡️</div>

        <h1>WARRIORS</h1>

        <p className="auth-subtitle">
          Secure Document Management System
        </p>

        {page === "login" ? (
          <LoginForm
            onLogin={onLogin}
            setPage={setPage}
          />
        ) : (
          <RegisterForm setPage={setPage} />
        )}
      </div>
    </div>
  );
}

//LOGIN FORM

function LoginForm({
  onLogin,
  setPage,
}) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanLogin = login.trim();

    if (!cleanLogin || !password) {
      setError(
        "Please enter your Unique ID/email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            login: cleanLogin,
            password,
          }),
        }
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Login failed."
        );
      }

      if (!result.token || !result.user) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      onLogin(
        result.token,
        result.user
      );
    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.message ||
          "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit}
    >
      <h2>Welcome to WARRIORS</h2>

      <p>
        Sign in to access your secure documents.
      </p>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <label htmlFor="login">
        Unique ID or Email
      </label>

      <input
        id="login"
        type="text"
        placeholder="Enter your Unique ID or email"
        value={login}
        autoComplete="username"
        disabled={loading}
        onChange={(event) =>
          setLogin(event.target.value)
        }
      />

      <label htmlFor="login-password">
        Password
      </label>

      <div className="password-field">
        <input
          id="login-password"
          type={
            showPassword
              ? "text"
              : "password"
          }
          placeholder="Enter your password"
          value={password}
          autoComplete="current-password"
          disabled={loading}
          onChange={(event) =>
            setPassword(event.target.value)
          }
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() =>
            setShowPassword(
              (value) => !value
            )
          }
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>

      <button
        className="primary-button"
        disabled={loading}
        type="submit"
      >
        {loading
          ? "Signing in..."
          : "Login"}
      </button>

      <div className="auth-switch">
        <span>
          Don't have an account?
        </span>

        <button
          type="button"
          onClick={() =>
            setPage("register")
          }
        >
          Create WARRIORS Account
        </button>
      </div>
    </form>
  );
}

//REGISTER FORM

function RegisterForm({
  setPage,
}) {
  const [name, setName] = useState("");
  const [uniqueId, setUniqueId] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(null);

  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess(null);

    const cleanName =
      name.trim();

    const cleanUniqueId =
      uniqueId
        .trim()
        .toUpperCase();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanName ||
      !cleanUniqueId ||
      !cleanEmail ||
      !password
    ) {
      setError(
        "Name, Unique ID, email and password are required."
      );
      return;
    }

    if (cleanName.length < 2) {
      setError(
        "Name must contain at least 2 characters."
      );
      return;
    }

    /*
      IMPORTANT:
      Backend auth.js allows:
      A-Z, 0-9 and -

      So frontend validation is kept
      exactly the same.
    */
    if (
      !/^[A-Z0-9-]{4,30}$/.test(
        cleanUniqueId
      )
    ) {
      setError(
        "Unique ID must be 4-30 characters and contain only letters, numbers and hyphens."
      );
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `${API_URL}/api/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name: cleanName,
              userId:
                cleanUniqueId,
              email:
                cleanEmail,
              password,
            }),
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Registration failed."
        );
      }

      if (!result.user) {
        throw new Error(
          "Invalid registration response from server."
        );
      }

      setSuccess(
        result.user
      );

      setName("");
      setUniqueId("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setError(
        error.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="registration-success">
        <div className="success-icon">
          ✓
        </div>

        <h2>
          Account Created!
        </h2>

        <p>
          Your WARRIORS account has
          been created successfully.
        </p>

        <div className="user-id-box">
          <span>
            Your Unique ID
          </span>

          <strong>
            {success.userId ||
              success.uniqueId ||
              "-"}
          </strong>
        </div>

        <p className="important-text">
          Keep your Unique ID safe.
          You can use it to login to
          your WARRIORS account.
        </p>

        <button
          className="primary-button"
          type="button"
          onClick={() =>
            setPage("login")
          }
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit}
    >
      <h2>
        Create your WARRIORS Account
      </h2>

      <p>
        Register your personal secure account.
      </p>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <label htmlFor="register-name">
        Full Name
      </label>

      <input
        id="register-name"
        type="text"
        placeholder="Enter your full name"
        value={name}
        autoComplete="name"
        disabled={loading}
        onChange={(event) =>
          setName(event.target.value)
        }
      />

      <label htmlFor="register-user-id">
        Unique ID
      </label>

      <input
        id="register-user-id"
        type="text"
        placeholder="Example: WARRIOR-001"
        value={uniqueId}
        maxLength={30}
        autoComplete="username"
        disabled={loading}
        onChange={(event) =>
          setUniqueId(
            event.target.value
              .toUpperCase()
          )
        }
      />

      <small className="field-help">
        This ID identifies your account.
        Use 4-30 letters, numbers or
        hyphens.
      </small>

      <label htmlFor="register-email">
        Email
      </label>

      <input
        id="register-email"
        type="email"
        placeholder="Enter your email"
        value={email}
        autoComplete="email"
        disabled={loading}
        onChange={(event) =>
          setEmail(
            event.target.value
          )
        }
      />

      <label htmlFor="register-password">
        Password
      </label>

      <div className="password-field">
        <input
          id="register-password"
          type={
            showPassword
              ? "text"
              : "password"
          }
          placeholder="Minimum 8 characters"
          value={password}
          autoComplete="new-password"
          disabled={loading}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() =>
            setShowPassword(
              (value) => !value
            )
          }
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>

      <label htmlFor="confirm-password">
        Confirm Password
      </label>

      <div className="password-field">
        <input
          id="confirm-password"
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          placeholder="Confirm your password"
          value={confirmPassword}
          autoComplete="new-password"
          disabled={loading}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() =>
            setShowConfirmPassword(
              (value) => !value
            )
          }
          aria-label={
            showConfirmPassword
              ? "Hide confirm password"
              : "Show confirm password"
          }
        >
          {showConfirmPassword
            ? "🙈"
            : "👁️"}
        </button>
      </div>

      <button
        className="primary-button"
        disabled={loading}
        type="submit"
      >
        {loading
          ? "Creating Account..."
          : "Create Account"}
      </button>

      <div className="auth-switch">
        <span>
          Already have an account?
        </span>

        <button
          type="button"
          onClick={() =>
            setPage("login")
          }
        >
          Login
        </button>
      </div>
    </form>
  );
}

// SECURE DMS

function SecureDMS({
  token,
  user,
  onLogout,
}) {
  const [activePage, setActivePage] =
    useState("dashboard");

  const [documents, setDocuments] =
    useState([]);

  const [trash, setTrash] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [previewDocument, setPreviewDocument] =
    useState(null);

  const authHeaders = {
    Authorization:
      `Bearer ${token}`,
  };

  const handleUnauthorized =
    () => {
      onLogout();
    };

  const loadDocuments =
    async () => {
      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/api/documents`,
            {
              method: "GET",
              headers:
                authHeaders,
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        let result = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to load documents."
          );
        }

        setDocuments(
          Array.isArray(
            result.documents
          )
            ? result.documents
            : []
        );
      } catch (error) {
        console.error(
          "Load documents:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  const loadTrash =
    async () => {
      try {
        const response =
          await fetch(
            `${API_URL}/api/trash`,
            {
              method: "GET",
              headers:
                authHeaders,
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        let result = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to load trash."
          );
        }

        setTrash(
          Array.isArray(
            result.documents
          )
            ? result.documents
            : []
        );
      } catch (error) {
        console.error(
          "Load trash:",
          error
        );
      }
    };

  useEffect(() => {
    if (!token) {
      return;
    }

    loadDocuments();
    loadTrash();
  }, [token]);

  const handleUpload =
    async (event) => {
      const files =
        event.target.files;

      if (
        !files ||
        files.length === 0
      ) {
        return;
      }

      try {
        setLoading(true);

        const formData =
          new FormData();

        Array.from(files).forEach(
          (file) => {
            formData.append(
              "documents",
              file
            );
          }
        );

        const response =
          await fetch(
            `${API_URL}/api/documents/upload`,
            {
              method: "POST",
              headers:
                authHeaders,
              body:
                formData,
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        let result = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Upload failed."
          );
        }

        await loadDocuments();

        setActivePage(
          "documents"
        );
      } catch (error) {
        console.error(
          "Upload error:",
          error
        );

        alert(
          error.message ||
            "Upload failed."
        );
      } finally {
        event.target.value = "";
        setLoading(false);
      }
    };

  const moveToTrash =
    async (id) => {
      if (!id) {
        return;
      }

      if (
        !window.confirm(
          "Move this document to trash?"
        )
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/documents/${encodeURIComponent(
              id
            )}/trash`,
            {
              method: "POST",
              headers:
                authHeaders,
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        let result = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to move document."
          );
        }

        await loadDocuments();
        await loadTrash();
      } catch (error) {
        console.error(
          "Move to trash error:",
          error
        );

        alert(
          error.message ||
            "Unable to move document."
        );
      }
    };

  const restoreDocument =
    async (id) => {
      if (!id) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/trash/${encodeURIComponent(
              id
            )}/restore`,
            {
              method: "POST",
              headers:
                authHeaders,
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        let result = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to restore document."
          );
        }

        await loadDocuments();
        await loadTrash();
      } catch (error) {
        console.error(
          "Restore error:",
          error
        );

        alert(
          error.message ||
            "Unable to restore document."
        );
      }
    };

  const permanentDelete =
    async (id) => {
      if (!id) {
        return;
      }

      if (
        !window.confirm(
          "Permanently delete this document? This cannot be undone."
        )
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/trash/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
              headers:
                authHeaders,
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        let result = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to delete document."
          );
        }

        await loadTrash();
      } catch (error) {
        console.error(
          "Permanent delete error:",
          error
        );

        alert(
          error.message ||
            "Unable to delete document."
        );
      }
    };

  const openPreview =
    (document) => {
      if (!document) {
        return;
      }

      setPreviewDocument(
        document
      );
    };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            🛡️
          </div>

          <div>
            <h2>
              WARRIORS
            </h2>

            <span>
              Secure Document Management
            </span>
          </div>
        </div>

        <div className="user-box">
          <div className="profile-avatar">
            {user.name
              ?.charAt(0)
              .toUpperCase() || "U"}
          </div>

          <div>
            <strong>
              {user.name ||
                "User"}
            </strong>

            <span>
              {user.userId ||
                user.uniqueId ||
                "-"}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={
              activePage ===
              "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "dashboard"
              )
            }
          >
            📊 Dashboard
          </button>

          <button
            type="button"
            className={
              activePage ===
              "documents"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "documents"
              )
            }
          >
            📁 Documents
          </button>

          <label className="nav-item upload-nav">
            ⬆️ Upload

            <input
              type="file"
              multiple
              hidden
              disabled={loading}
              onChange={
                handleUpload
              }
            />
          </label>

          <button
            type="button"
            className={
              activePage ===
              "trash"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage(
                "trash"
              )
            }
          >
            🗑️ Trash
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() =>
              alert(
                `Name: ${
                  user.name || "-"
                }\nUnique ID: ${
                  user.userId ||
                  user.uniqueId ||
                  "-"
                }\nEmail: ${
                  user.email || "-"
                }`
              )
            }
          >
            👤 My Account
          </button>
        </nav>

        <button
          type="button"
          className="logout-btn"
          onClick={onLogout}
        >
          🚪 Logout
        </button>
      </aside>

      <main className="main-content">
        {activePage ===
          "dashboard" && (
          <Dashboard
            user={user}
            documents={
              documents
            }
            setActivePage={
              setActivePage
            }
          />
        )}

        {activePage ===
          "documents" && (
          <DocumentsPage
            documents={
              documents
            }
            loading={
              loading
            }
            handleUpload={
              handleUpload
            }
            openPreview={
              openPreview
            }
            moveToTrash={
              moveToTrash
            }
          />
        )}

        {activePage ===
          "trash" && (
          <TrashPage
            trash={trash}
            restoreDocument={
              restoreDocument
            }
            permanentDelete={
              permanentDelete
            }
          />
        )}
      </main>

      {previewDocument && (
        <PreviewModal
          document={
            previewDocument
          }
          token={token}
          onClose={() =>
            setPreviewDocument(
              null
            )
          }
        />
      )}
    </div>
  );
}

//DASHBOARD

function Dashboard({
  user,
  documents,
  setActivePage,
}) {
  const userId =
    user.userId ||
    user.uniqueId ||
    "-";

  return (
    <>
      <header className="topbar">
        <div>
          <h1>
            WARRIORS Dashboard
          </h1>

          <p>
            Welcome back,{" "}
            {user.name || "User"}.
          </p>
        </div>

        <div className="profile">
          <div className="profile-avatar">
            {user.name
              ?.charAt(0)
              .toUpperCase() || "U"}
          </div>

          <div>
            <strong>
              {user.name ||
                "User"}
            </strong>

            <span>
              {userId}
            </span>
          </div>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            📁
          </div>

          <div>
            <span>
              My Documents
            </span>

            <h2>
              {documents.length}
            </h2>

            <small>
              Your stored documents
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            🛡️
          </div>

          <div>
            <span>
              Account
            </span>

            <h2>
              Active
            </h2>

            <small>
              Your account is active
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            🆔
          </div>

          <div>
            <span>
              Unique ID
            </span>

            <h2 className="small-id">
              {userId}
            </h2>

            <small>
              Your unique identity
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            🔒
          </div>

          <div>
            <span>
              Security
            </span>

            <h2>
              Secure
            </h2>

            <small>
              Protected account
            </small>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Recent Documents
            </h2>

            <p>
              Your latest uploaded documents
            </p>
          </div>

          <button
            type="button"
            className="view-all"
            onClick={() =>
              setActivePage(
                "documents"
              )
            }
          >
            View All
          </button>
        </div>

        {documents.length ===
        0 ? (
          <div className="empty-state">
            <div>📂</div>

            <h3>
              No documents yet
            </h3>

            <p>
              Upload your first document.
            </p>
          </div>
        ) : (
          <div className="document-list">
            {documents
              .slice(0, 5)
              .map(
                (document) => (
                  <DocumentRow
                    key={
                      document.id
                    }
                    document={
                      document
                    }
                  />
                )
              )}
          </div>
        )}
      </section>
    </>
  );
}

// DOCUMENTS PAGE

function DocumentsPage({
  documents,
  loading,
  handleUpload,
  openPreview,
  moveToTrash,
}) {
  const [search, setSearch] =
    useState("");

  const searchText =
    search.trim().toLowerCase();

  const filteredDocuments =
    documents.filter(
      (document) =>
        String(
          document.name || ""
        )
          .toLowerCase()
          .includes(
            searchText
          )
    );

  return (
    <>
      <header className="topbar">
        <div>
          <h1>
            Documents
          </h1>

          <p>
            Manage your secure documents.
          </p>
        </div>
      </header>

      <section className="documents-toolbar">
        <div className="search-box">
          🔍

          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

        <label className="upload-button">
          ⬆️ Upload Document

          <input
            type="file"
            multiple
            hidden
            disabled={loading}
            onChange={
              handleUpload
            }
          />
        </label>
      </section>

      <section className="panel documents-page">
        <div className="panel-header">
          <div>
            <h2>
              My Documents
            </h2>

            <p>
              {filteredDocuments.length}{" "}
              documents found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div>⏳</div>

            <h3>
              Loading...
            </h3>
          </div>
        ) : filteredDocuments.length ===
          0 ? (
          <div className="empty-state">
            <div>📂</div>

            <h3>
              No documents found
            </h3>

            <p>
              Upload a document to get started.
            </p>
          </div>
        ) : (
          <div className="document-table">
            <div className="table-header">
              <span>
                Document
              </span>

              <span>
                Type
              </span>

              <span>
                Size
              </span>

              <span>
                Uploaded
              </span>

              <span>
                Action
              </span>
            </div>

            {filteredDocuments.map(
              (document) => (
                <div
                  className="table-row"
                  key={
                    document.id
                  }
                >
                  <div className="document-name">
                    <div
                      className={`file-icon ${String(
                        document.type ||
                          "file"
                      ).toLowerCase()}`}
                    >
                      {document.type ||
                        "FILE"}
                    </div>

                    <strong>
                      {document.name ||
                        "Unnamed file"}
                    </strong>
                  </div>

                  <span>
                    {document.type ||
                      "FILE"}
                  </span>

                  <span>
                    {formatFileSize(
                      document.size
                    )}
                  </span>

                  <span>
                    {formatDate(
                      document.uploadedAt
                    )}
                  </span>

                  <div className="document-actions">
                    <button
                      type="button"
                      className="view-button"
                      onClick={() =>
                        openPreview(
                          document
                        )
                      }
                    >
                      👁️ View
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        moveToTrash(
                          document.id
                        )
                      }
                      aria-label="Move to trash"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}

// TRASH PAGE

function TrashPage({
  trash,
  restoreDocument,
  permanentDelete,
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>
            Trash
          </h1>

          <p>
            Documents moved to trash.
          </p>
        </div>
      </header>

      <section className="panel documents-page">
        <div className="panel-header">
          <div>
            <h2>
              My Trash
            </h2>

            <p>
              {trash.length} documents
            </p>
          </div>
        </div>

        {trash.length ===
        0 ? (
          <div className="empty-state">
            <div>🗑️</div>

            <h3>
              Trash is empty
            </h3>

            <p>
              Deleted documents will appear here.
            </p>
          </div>
        ) : (
          <div className="document-table">
            <div className="table-header">
              <span>
                Document
              </span>

              <span>
                Type
              </span>

              <span>
                Size
              </span>

              <span>
                Deleted
              </span>

              <span>
                Action
              </span>
            </div>

            {trash.map(
              (document) => (
                <div
                  className="table-row"
                  key={
                    document.id
                  }
                >
                  <div className="document-name">
                    <div className="file-icon">
                      {document.type ||
                        "FILE"}
                    </div>

                    <strong>
                      {document.name ||
                        "Unnamed file"}
                    </strong>
                  </div>

                  <span>
                    {document.type ||
                      "FILE"}
                  </span>

                  <span>
                    {formatFileSize(
                      document.size
                    )}
                  </span>

                  <span>
                    {formatDate(
                      document.deletedAt
                    )}
                  </span>

                  <div className="document-actions">
                    <button
                      type="button"
                      className="restore-button"
                      onClick={() =>
                        restoreDocument(
                          document.id
                        )
                      }
                    >
                      ↩️ Restore
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        permanentDelete(
                          document.id
                        )
                      }
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}

//DOCUMENT ROW

function DocumentRow({
  document,
}) {
  return (
    <div className="document-item">
      <div
        className={`file-icon ${String(
          document.type ||
            "file"
        ).toLowerCase()}`}
      >
        {document.type ||
          "FILE"}
      </div>

      <div className="document-info">
        <strong>
          {document.name ||
            "Unnamed file"}
        </strong>

        <span>
          {formatFileSize(
            document.size
          )}{" "}
          •{" "}
          {formatDate(
            document.uploadedAt
          )}
        </span>
      </div>

      <span className="status secure">
        Secure
      </span>
    </div>
  );
}

// PREVIEW MODAL

function PreviewModal({
  document,
  token,
  onClose,
}) {
  const extension =
    String(
      document.name || ""
    )
      .split(".")
      .pop()
      ?.toLowerCase();

  const previewUrl =
    `${API_URL}/api/documents/${encodeURIComponent(
      document.id
    )}/file`;

  const downloadUrl =
    `${API_URL}/api/documents/${encodeURIComponent(
      document.id
    )}/download`;

  const isImage =
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "bmp",
    ].includes(
      extension
    );

  const isPdf =
    extension === "pdf";

  const isText =
    [
      "txt",
      "csv",
      "json",
      "xml",
    ].includes(
      extension
    );

  /*
    File preview endpoint supports
    token through query parameter.
  */
  const authenticatedUrl =
    `${previewUrl}?token=${encodeURIComponent(
      token
    )}`;

  const authenticatedDownloadUrl =
    `${downloadUrl}?token=${encodeURIComponent(
      token
    )}`;

  return (
    <div
      className="preview-overlay"
      onClick={onClose}
    >
      <div
        className="preview-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="preview-header">
          <div>
            <h2>
              {document.name ||
                "Document"}
            </h2>

            <span>
              {document.type ||
                "FILE"}{" "}
              •{" "}
              {formatFileSize(
                document.size
              )}
            </span>
          </div>

          <div className="preview-header-actions">
            <a
              className="download-button"
              href={
                authenticatedDownloadUrl
              }
              download={
                document.name ||
                true
              }
            >
              ⬇️ Download
            </a>

            <button
              type="button"
              className="close-button"
              onClick={onClose}
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="preview-content">
          {isImage ? (
            <img
              src={
                authenticatedUrl
              }
              alt={
                document.name ||
                "Document preview"
              }
              className="image-preview"
            />
          ) : isPdf ? (
            <iframe
              src={
                authenticatedUrl
              }
              title={
                document.name ||
                "PDF preview"
              }
              className="pdf-preview"
            />
          ) : isText ? (
            <iframe
              src={
                authenticatedUrl
              }
              title={
                document.name ||
                "Text preview"
              }
              className="text-preview"
            />
          ) : (
            <div className="unsupported-preview">
              <div>📄</div>

              <h3>
                Preview unavailable
              </h3>

              <p>
                This file type cannot be
                previewed in the browser.
              </p>

              <a
                className="download-button large"
                href={
                  authenticatedDownloadUrl
                }
                download={
                  document.name ||
                  true
                }
              >
                ⬇️ Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//HELPERS

function formatFileSize(bytes) {
  const size =
    Number(bytes);

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return "0 KB";
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  if (
    size <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      size /
      1024 /
      1024
    ).toFixed(2)} MB`;
  }

  return `${(
    size /
    1024 /
    1024 /
    1024
  ).toFixed(2)} GB`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString();
}

export default App;

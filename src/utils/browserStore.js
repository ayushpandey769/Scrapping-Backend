// In-memory store for browser sessions waiting for verification
// Key: email
// Value: { browser, page, timestamp }

export const browserStore = new Map();

export const saveSession = (email, browser, page) => {
  browserStore.set(email, {
    browser,
    page,
    timestamp: Date.now()
  });
};

export const getSession = (email) => {
  return browserStore.get(email);
};

export const removeSession = (email) => {
  browserStore.delete(email);
};

// Optional: specific error class for cleaner handling
export class VerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "VerificationError";
    this.statusCode = 202; // Accepted (processing not completed)
  }
}

// Cleanup sessions older than 10 minutes (prevents memory leak)
setInterval(() => {
  const TEN_MINUTES = 10 * 60 * 1000;
  for (const [email, session] of browserStore.entries()) {
    if (Date.now() - session.timestamp > TEN_MINUTES) {
      console.log(`🧹 Cleaning up stale session for ${email}`);
      session.browser.close().catch(() => {});
      browserStore.delete(email);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

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

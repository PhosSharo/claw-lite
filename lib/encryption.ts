import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Token encryption utility for OAuth tokens
 * Uses AES-256-GCM for authenticated encryption
 * 
 * IMPORTANT: Set TOKEN_ENCRYPTION_KEY in production for security!
 * In development, tokens are stored unencrypted with a warning.
 */

// 32-byte encryption key from environment (must be 64 hex characters)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

// Track if we've warned about missing encryption key
let hasWarnedAboutEncryption = false;

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
    return !!ENCRYPTION_KEY;
}

/**
 * Encrypts a sensitive token using AES-256-GCM
 * Returns a string in format: iv:authTag:encryptedData
 * 
 * In development (no ENCRYPTION_KEY), returns the token unencrypted with a warning.
 * 
 * @param token - The plaintext token to encrypt
 * @returns The encrypted token string (or plaintext in dev mode)
 */
export function encryptToken(token: string): string {
    if (!ENCRYPTION_KEY) {
        if (!hasWarnedAboutEncryption) {
            console.warn(
                "⚠️  SECURITY WARNING: TOKEN_ENCRYPTION_KEY not set. " +
                "Tokens are being stored UNENCRYPTED. " +
                "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
            );
            hasWarnedAboutEncryption = true;
        }
        // In development, return token as-is (prefixed to identify unencrypted tokens)
        return `plain:${token}`;
    }

    const iv = randomBytes(16);
    const cipher = createCipheriv(
        "aes-256-gcm",
        Buffer.from(ENCRYPTION_KEY, "hex"),
        iv
    );

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a token encrypted with encryptToken
 * 
 * @param encryptedToken - The encrypted token string (iv:authTag:encryptedData or plain:token)
 * @returns The decrypted plaintext token
 * @throws Error if decryption fails
 */
export function decryptToken(encryptedToken: string): string {
    // Handle unencrypted tokens (plain: prefix)
    if (encryptedToken.startsWith("plain:")) {
        if (!hasWarnedAboutEncryption) {
            console.warn(
                "⚠️  SECURITY WARNING: Decrypting unencrypted token. " +
                "Set TOKEN_ENCRYPTION_KEY for production."
            );
        }
        return encryptedToken.slice(6); // Remove "plain:" prefix
    }

    if (!ENCRYPTION_KEY) {
        throw new Error(
            "TOKEN_ENCRYPTION_KEY environment variable is not set and token appears encrypted. " +
            "Cannot decrypt without the key."
        );
    }

    const parts = encryptedToken.split(":");

    if (parts.length !== 3) {
        throw new Error("Invalid encrypted token format");
    }

    const [ivHex, authTagHex, encrypted] = parts;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(ENCRYPTION_KEY, "hex"),
        iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

/**
 * Checks if a value appears to be encrypted (has the iv:authTag:data format)
 * This is useful for migration scenarios where some tokens may not yet be encrypted
 * 
 * @param value - The value to check
 * @returns true if the value appears to be encrypted (not plain: prefix)
 */
export function isEncrypted(value: string): boolean {
    // plain: prefix means unencrypted
    if (value.startsWith("plain:")) return false;

    const parts = value.split(":");
    if (parts.length !== 3) return false;

    const [iv, authTag, data] = parts;
    // IV should be 32 hex chars (16 bytes), authTag should be 32 hex chars (16 bytes)
    return (
        /^[0-9a-f]{32}$/i.test(iv) &&
        /^[0-9a-f]{32}$/i.test(authTag) &&
        /^[0-9a-f]+$/i.test(data)
    );
}

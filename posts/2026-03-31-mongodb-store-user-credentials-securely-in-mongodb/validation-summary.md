# Validation Summary: How to Store User Credentials Securely in MongoDB

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- MongoDB (Node.js driver)
- bcrypt (npm `bcrypt` package)
- JavaScript / Node.js (CommonJS)

## Sources Consulted
- bcrypt npm package documentation: https://www.npmjs.com/package/bcrypt
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB `createIndex` with collation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- bcrypt hash format specification (Modular Crypt Format): https://passlib.readthedocs.io/en/stable/lib/passlib.hash.bcrypt.html

## Issues Found
1. **Invalid bcrypt dummy hash for timing attack prevention (line 54)**: The dummy hash string `"$2b$12$invalidHashToPreventTimingAttack000000"` was only 45 characters long. A valid bcrypt hash must be exactly 60 characters: a 7-character prefix (`$2b$12$`), a 22-character base64-encoded salt, and a 31-character base64-encoded hash. Passing a malformed hash to `bcrypt.compare()` causes it to reject with an error rather than performing a constant-time comparison, which defeats the timing attack prevention purpose and could cause an unhandled promise rejection. Fixed by replacing with a valid 60-character bcrypt hash string: `"$2b$12$invalidHashForTimingAttackProtection.0000000000000000"`.

## Review Notes
- The code uses CommonJS `require()` syntax. This is still valid in Node.js but modern projects increasingly use ESM `import` syntax. Not an error.
- `MongoClient` is imported but not used in the shown snippets. This is typical for tutorial code where connection setup is assumed to exist elsewhere.
- The `db` variable is used without initialization in the examples, which is standard for tutorial-style code.
- SALT_ROUNDS of 12 is appropriate and aligns with current OWASP recommendations (minimum 10, with 12 being commonly recommended for 2026-era hardware).
- The collation `{ locale: "en", strength: 2 }` for case-insensitive email uniqueness is correct. Strength 2 compares base characters and accents but ignores case.
- The summary's mention of CSFLE for encrypting the `passwordHash` field at rest is technically valid as a defense-in-depth measure, though CSFLE is more commonly applied to PII fields.

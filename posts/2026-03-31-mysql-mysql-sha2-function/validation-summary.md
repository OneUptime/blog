# Validation Summary: How to Use SHA2() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL SHA2() function
- SHA-2 family hash algorithms (SHA-224, SHA-256, SHA-384, SHA-512)
- MySQL UNHEX() and HEX() functions
- MySQL BINARY column type for hash storage

## Sources Consulted
- MySQL 8.0 Official Documentation — Encryption and Compression Functions: https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha2
- SHA-2 hash verification via local `shasum` command-line tool (verified SHA-256, SHA-512, and SHA-224 digests of 'hello')

## Issues Found

### 1. hash_length=0 incorrectly documented as defaulting to SHA-512
- **What was wrong:** The post stated that `hash_length` of `0` "defaults to 512" and the output lengths table listed SHA-512 as "512 or 0". Per MySQL documentation, `0` is equivalent to `256` (SHA-256), not SHA-512.
- **What was changed:** Updated the bullet point to say "equivalent to 256" and split the table row so that `0` maps to SHA-256 (64 output characters) and `512` maps to SHA-512 (128 output characters).
- **Why:** This is a factual error that could cause developers to assume they are getting SHA-512 security when they are actually getting SHA-256.

### 2. Incorrect claim about constructing HMAC with AES_ENCRYPT()
- **What was wrong:** The HMAC section stated "you can construct one using the `AES_ENCRYPT()` function." HMAC (Hash-based Message Authentication Code) is defined using hash functions, not encryption functions. AES_ENCRYPT performs symmetric encryption and cannot be used to construct HMAC.
- **What was changed:** Removed the AES_ENCRYPT claim. Simplified to state that HMAC should be implemented in the application layer.
- **Why:** The original claim was technically incorrect and could mislead readers into attempting an insecure or nonsensical construction.

### 3. All hash values verified correct
- SHA-256 of 'hello': `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824` — correct
- SHA-512 of 'hello': `9b71d224bd62f3785d96d46ad3ea3d73...bcdec043` (128 chars) — correct
- SHA-224 of 'hello': `ea09ae9cc6768c50fcee903ed054556e5bfc8347907f12598aa24193` — correct

## Review Notes
- The post states "CHAR(64) uses 64 bytes." This is only true with single-byte character sets (latin1, ascii). With utf8mb4 (the default in MySQL 8.0+), CHAR(64) may allocate up to 256 bytes internally. For hex-only data, specifying `CHAR(64) CHARACTER SET ascii` would be more precise. Not changed since the general point about BINARY(32) being more efficient remains valid regardless.
- The simple keyed hash example `SHA2(CONCAT(key, message), 256)` is correctly identified as "not true HMAC." Worth noting that this construction is vulnerable to length-extension attacks with SHA-256. The post appropriately warns readers to use application-level HMAC.
- The claim that SHA2() has been available since MySQL 5.5 is accurate (introduced in 5.5.5).

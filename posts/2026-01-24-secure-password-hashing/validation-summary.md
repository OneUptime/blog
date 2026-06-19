# Validation Summary: How to Handle Secure Password Hashing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Password hashing
- bcrypt
- Argon2id
- scrypt
- PBKDF2
- Python
- Node.js
- Go
- Java
- OWASP and NIST password storage guidance

## Sources Consulted
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- NIST SP 800-63B, Password Verifiers: https://pages.nist.gov/800-63-4/sp800-63b.html
- RFC 9106, Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications: https://datatracker.ietf.org/doc/rfc9106/
- argon2-cffi API Reference: https://argon2-cffi.readthedocs.io/en/stable/api.html
- pyca/bcrypt documentation: https://github.com/pyca/bcrypt
- node.bcrypt.js npm package documentation: https://www.npmjs.com/package/bcrypt
- node-argon2 npm package documentation and published type definitions: https://www.npmjs.com/package/argon2
- Go bcrypt package documentation: https://pkg.go.dev/golang.org/x/crypto/bcrypt
- Go argon2 package documentation: https://pkg.go.dev/golang.org/x/crypto/argon2
- jBCrypt documentation: https://www.mindrot.org/projects/jBCrypt/

## Issues Found
- The Python Argon2 verification example only caught `VerifyMismatchError`. The official `argon2-cffi` API documents that `PasswordHasher.verify()` can also raise `VerificationError` and `InvalidHashError`, while the sample function promised a boolean result. Updated the import and exception handling so invalid or otherwise unverifiable hashes return `False`.

## Review Notes
- The Argon2 parameters shown in the examples match the RFC 9106 low-memory profile used as the current `argon2-cffi` default profile: Argon2id, 64 MiB memory, 3 iterations, 4 lanes, 128-bit salt, and 256-bit tag.
- bcrypt examples use current APIs and correctly rely on library-generated salts. Future revisions could mention bcrypt's 72-byte password input limit, which is documented by bcrypt implementations and OWASP.
- Go was not installed in the review environment, so the Go examples were checked against official package documentation rather than executed locally.

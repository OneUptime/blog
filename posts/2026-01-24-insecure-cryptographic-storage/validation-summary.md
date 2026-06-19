# Validation Summary: How to Fix 'Insecure Cryptographic Storage'

## Status
validated

## Post Type
Security implementation guide

## Technologies Covered
- Node.js crypto module
- bcrypt for Node.js
- Argon2 for Node.js
- PyCryptodome AES modes
- Java JCA/JCE AES-GCM
- AWS KMS and envelope encryption
- boto3 AWS KMS APIs
- OWASP password storage and logging guidance

## Sources Consulted
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- bcrypt for Node.js documentation: https://github.com/kelektiv/node.bcrypt.js/
- argon2 npm package documentation: https://www.npmjs.com/package/argon2
- PyCryptodome AES documentation: https://www.pycryptodome.org/src/cipher/aes
- PyCryptodome modern cipher modes documentation: https://www.pycryptodome.org/src/cipher/modern
- Oracle Java Cipher documentation: https://docs.oracle.com/javase/8/docs/api/javax/crypto/Cipher.html
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS EnableKeyRotation API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_EnableKeyRotation.html
- AWS KMS GetKeyRotationStatus API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GetKeyRotationStatus.html
- AWS KMS ReEncrypt API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html

## Issues Found
- The bcrypt section stated that a cost factor of 12 takes about 250ms per hash. This is hardware-dependent, so it was changed to advise benchmarking the cost factor and to cite OWASP's minimum bcrypt work factor guidance.
- The bcrypt verification comment claimed `bcrypt.compare` is timing-safe. The package documentation describes comparing a plaintext password against a hash, but does not make that exact timing-safety claim, so the wording was changed to describe what the API verifies.
- The logging mask used a credit card regex that did not mask formatted card numbers with spaces or hyphens, even though the example data used hyphenated card numbers. The regex and replacement logic were updated to handle formatted card numbers while preserving the last four digits.
- The email masking regex included `|` inside a character class for the TLD. It was corrected to `[A-Za-z]{2,}`.
- The logging example defined a phone pattern but did not apply it. Phone masking was added so the implementation matches the stated secure logging behavior.
- The AWS KMS rotation example implied that `enable_key_rotation` immediately completed a rotation. AWS KMS automatic rotation schedules future key material rotation, while on-demand rotation is a separate operation. The method comments, log fields, and log message were corrected to describe configuring automatic rotation.
- The KMS rotation example used the KMS key creation date to decide when to rotate. AWS exposes key rotation status, rotation period, and next rotation date separately, so the code now checks `get_key_rotation_status` and updates automatic rotation when disabled or configured with a different period.
- The KMS re-encryption helper described re-encrypting application data. AWS KMS `ReEncrypt` only accepts ciphertext produced by KMS operations, such as encrypted data keys. The function and comments were changed to re-encrypt a KMS-encrypted data key.

## Review Notes
The remaining examples are broadly accurate for an implementation guide, but the Java KMS example is still illustrative rather than a complete standalone class because helper types such as `DataKey` and `EncryptedData` are not defined in the post. A production implementation should also clear plaintext keys in `finally` blocks and consider authenticated encryption context/AAD where appropriate.

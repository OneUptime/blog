# Validation Summary: How to Configure Encryption at Rest in MongoDB with WiredTiger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Enterprise (3.2+)
- WiredTiger storage engine
- Encryption at rest (AES-256-CBC)
- KMIP (Key Management Interoperability Protocol)
- OpenSSL
- TLS/SSL

## Sources Consulted
- MongoDB documentation: Encryption at Rest — https://www.mongodb.com/docs/manual/core/security-encryption-at-rest/
- MongoDB documentation: security.enableEncryption configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-security.enableEncryption
- MongoDB documentation: security.encryptionKeyFile configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-security.encryptionKeyFile
- MongoDB documentation: security.kmip options — https://www.mongodb.com/docs/manual/reference/configuration-options/#kmip-options
- MongoDB documentation: KMIP master key rotation — https://www.mongodb.com/docs/manual/tutorial/rotate-encryption-key/
- MongoDB documentation: db.serverStatus() — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB documentation: Release notes for storage engine defaults — https://www.mongodb.com/docs/manual/release-notes/3.2/
- OpenSSL enc man page for `-pbkdf2` flag

## Issues Found

1. **WiredTiger default version was incorrect**: The post stated WiredTiger is the "default in MongoDB 3.0+" but WiredTiger became the default storage engine in MongoDB 3.2, not 3.0. In 3.0 it was available but MMAPv1 was still the default. Changed to "default in MongoDB 3.2+".

2. **Local keyfile config example was wrong**: The `mongod.conf` example for local key management used `encryptionKeyIdentifier` (a KMIP option) and included a `kmip:` block with an incorrect comment about "keyVaultNamespace approach" (which is a Client-Side Field Level Encryption concept, unrelated to storage encryption at rest). Replaced the entire config block with the correct `security.encryptionKeyFile` option pointing to the local keyfile path.

3. **Misleading `db.serverStatus().security` verification**: The post showed `db.serverStatus().security` with output containing `SSLServerSubjectDN` and `javascriptEnabled` as proof of encryption at rest. These fields relate to TLS/SSL and JavaScript engine status, not encryption at rest. Removed this misleading verification method, keeping the log grep and `getCmdLineOpts` approaches which are accurate.

4. **Key rotation command missing `--kmipServerCAFile`**: The KMIP key rotation command was missing the `--kmipServerCAFile` flag, which is required to establish a trusted connection to the KMIP server. Added the missing flag.

5. **OpenSSL enc command missing `-pbkdf2` flag**: The `openssl enc -aes-256-cbc -k` command omitted the `-pbkdf2` flag. In OpenSSL 3.x (standard on modern Linux distributions), omitting this flag triggers a deprecation warning or failure due to use of the legacy key derivation function. Added `-pbkdf2` to the command.

## Review Notes
- The post correctly notes that `mongodump` output is unencrypted and recommends encrypting backup storage separately. This is an important operational consideration.
- The `mongodump` example includes a plaintext password in the URI (`admin:password`). In practice, users should use `--config` files or environment variables to avoid exposing credentials in shell history. This is kept as-is since it's a demonstrative example.
- The encryption cipher mode (AES-256-CBC) is the default, but MongoDB also supports AES-256-GCM. The post doesn't mention this alternative, which is acceptable for a focused tutorial.
- Key rotation section correctly notes this feature requires MongoDB Enterprise 3.4+.

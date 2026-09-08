# How to Rotate SQLCipher Keys Without a Plaintext SQLite File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLCipher, SQLite, Encryption, Key Management, Security

Description: Rotate a SQLCipher key in place or into another encrypted file, then verify access without ever exporting plaintext.

---

SQLCipher can re-encrypt an existing database with `PRAGMA rekey` or the programmatic `sqlite3_rekey` APIs. Rotation does not require a plaintext database. The main risks are exposing keys in process arguments or logs, interrupting the page rewrite, rotating while other processes still write, and updating the key store before the new database is proven readable.

## Prepare two key versions

Generate the new key with an approved cryptographic random source and store it in a secret manager or platform keystore. Track a non-secret key identifier such as `customer-db-v8`; never use the key itself as metadata.

During rotation, the service needs controlled access to both the current and next keys. Restrict that overlap to the rotation job and retain the previous key until verification and rollback deadlines have passed. Do not pass keys on a command line, interpolate them into logs, or store them in shell history.

Take a verified backup of the still-encrypted database before rewriting it. If the database uses WAL, quiesce all other connections and use a database-aware backup. Copying only the main file can omit committed state.

## Quiesce and authenticate the current database

Stop new work, drain in-flight transactions, and close every application connection. Open one dedicated read-write connection with the old key. SQLCipher requires the key before the first operation that reads or writes database pages.

Prefer the byte-oriented API so the secret does not become SQL text:

```c
sqlite3 *db = NULL;
int rc = sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE, NULL);
if (rc != SQLITE_OK) fail(rc);

rc = sqlite3_key(db, old_key_bytes, old_key_length);
if (rc != SQLITE_OK) fail(rc);

rc = sqlite3_exec(db, "SELECT count(*) FROM sqlite_schema", NULL, NULL, NULL);
if (rc != SQLITE_OK) fail(rc);  /* Wrong key or incompatible settings. */
```

If a database was created with non-default cipher settings, apply the same settings in their documented order on every open. Do not guess at compatibility parameters during an incident.

## Rekey the database

With the database unlocked and writable, call the rekey API:

```c
rc = sqlite3_rekey(db, new_key_bytes, new_key_length);
if (rc != SQLITE_OK) fail(rc);

rc = sqlite3_close(db);
if (rc != SQLITE_OK) fail(rc);
db = NULL;
```

The equivalent CLI operation is `PRAGMA rekey`, but production automation should avoid constructing a SQL string containing a secret. The operation re-encrypts every database page, so reserve an exclusive maintenance window, stable power, adequate storage headroom, and enough time for the full database size.

Do not use `PRAGMA rekey` to encrypt a plaintext SQLite database. SQLCipher documents `sqlcipher_export()` for that conversion.

## Verify with a completely new connection

Reopen the database using only the new key and run both cryptographic and logical checks:

```sql
SELECT count(*) FROM sqlite_schema;
PRAGMA cipher_integrity_check;
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

`cipher_integrity_check` is available in SQLCipher 4.2.0 and later. It requires page HMACs to be enabled and the correct key to be supplied. Under those conditions it returns rows for HMAC or page-envelope problems and returns no rows when that check finds no error. `integrity_check` should return one row containing `ok`. Foreign keys require their separate pragma.

Verify application invariants and representative reads and writes. Then close and reopen once more to ensure no connection-local state masked a problem. In an isolated negative test, confirm that the previous key can no longer read the schema.

Only after these checks should deployment metadata select the new key identifier. Start one application instance, observe it, then release the rest. Keep the encrypted pre-rotation backup and old key protected until the rollback period ends.

## Use an encrypted-to-encrypted export when needed

When changing cipher compatibility settings or producing a second artifact is operationally safer, attach a new database with a non-empty new key and use `sqlcipher_export()`:

```sql
-- The source has already been keyed and verified.
ATTACH DATABASE 'next.db' AS next KEY 'new passphrase';
PRAGMA next.cipher_page_size = 4096;  -- Example target cipher setting.
PRAGMA next.auto_vacuum = INCREMENTAL;  -- Set the intended target mode before export.
SELECT sqlcipher_export('next');
PRAGMA next.user_version = 8;  -- Set the application's actual schema version.
DETACH DATABASE next;
```

The values above are illustrative. Create the target at a new, nonexistent path and use only settings that match the planned target format. Qualify target settings with the attached schema name, as shown, so they are not accidentally applied to `main`. Inject the key through a binding facility that explicitly supports parameterized or byte-oriented attached-database keys, and disable SQL statement logging during rotation. Never attach the target with `KEY ''`, because an empty key creates plaintext. SQLCipher does not transfer `user_version` or `auto_vacuum`; read the intended values from trusted application metadata, set them explicitly on `next`, and verify them after reopening the exported file.

## Plan for interruption

Test rotation on a copy of production-sized data and inject process termination, low disk space, and incorrect-key failures. The job must never delete the last known-good encrypted copy. On any uncertain outcome, stop application access, restore the verified encrypted backup, and diagnose offline rather than repeatedly trying keys against the only file.

Audit the rotation without recording key material: database identity, old and new key identifiers, timestamps, software versions, verification results, and operator or workload identity are sufficient.

## Conclusion

Rotate SQLCipher keys with one quiesced writer, secure byte-oriented key APIs, a verified encrypted backup, and a fresh-connection verification step. Use `sqlite3_rekey` for an in-place rewrite or `sqlcipher_export()` between two encrypted databases. Never create an empty-key intermediate, and do not activate the new key identifier until cryptographic and application checks pass.

## Official Documentation

- [SQLCipher API and changing the key](https://www.zetetic.net/sqlcipher/sqlcipher-api/#changing-the-key)
- [SQLCipher `PRAGMA rekey`](https://www.zetetic.net/sqlcipher/sqlcipher-api/#rekey)
- [SQLCipher `sqlcipher_export()`](https://www.zetetic.net/sqlcipher/sqlcipher-api/#sqlcipher_export)
- [SQLCipher integrity checking](https://www.zetetic.net/sqlcipher/sqlcipher-api/#cipher_integrity_check)

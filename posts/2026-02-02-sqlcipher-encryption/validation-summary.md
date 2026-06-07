# Validation Summary: How to Implement Encryption with SQLCipher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQLCipher (full-database encryption for SQLite)
- SQLite
- Python (sqlcipher3 bindings)
- Node.js (@journeyapps/sqlcipher)
- Android (net.zetetic:sqlcipher-android with Room)
- iOS (SQLCipher CocoaPod)
- AES-256-CBC
- PBKDF2 (HMAC-SHA512 inside SQLCipher 4; HMAC-SHA256 in OWASP-style application-layer key derivation example)
- Homebrew (for installing SQLCipher on macOS)

## Sources Consulted
- SQLCipher official documentation: https://www.zetetic.net/sqlcipher/sqlcipher-api/
- SQLCipher design overview: https://www.zetetic.net/sqlcipher/design/
- sqlcipher-android (new library) GitHub: https://github.com/sqlcipher/sqlcipher-android
- @journeyapps/sqlcipher (node-sqlite3 fork) on npm: https://www.npmjs.com/package/@journeyapps/sqlcipher
- node-sqlite3 API (which @journeyapps/sqlcipher derives from): https://github.com/TryGhost/node-sqlite3
- sqlcipher3 PyPI: https://pypi.org/project/sqlcipher3/
- Android Room with SQLCipher integration guide (Zetetic)
- OWASP Password Storage Cheat Sheet (PBKDF2 iteration recommendations)

## Issues Found

1. **Node.js section heading was misleading.** The heading read "Node.js with better-sqlite3-sqlcipher" but the package shown (`@journeyapps/sqlcipher`) is a fork of `node-sqlite3`, not `better-sqlite3`. The callback-style API in the code (`db.run`, `db.get`, `db.all` with callbacks) matches node-sqlite3, not better-sqlite3 (which is synchronous). Updated the heading and intro sentence to refer to `@journeyapps/sqlcipher` / "node-sqlite3 fork".

2. **Incorrect use of `.verbose()` in Node.js example.** The code did `const Database = require('@journeyapps/sqlcipher').verbose();` followed by `new Database('secure_app.db')`. The `.verbose()` method returns the sqlite3 module object (with `Database`, `Statement`, etc. as properties), not the `Database` constructor itself. Per the official `@journeyapps/sqlcipher` README, the correct usage is `const sqlite3 = require('@journeyapps/sqlcipher').verbose();` then `new sqlite3.Database(...)`. Fixed both lines.

3. **Android Kotlin imports/classes mismatched the Gradle dependency.** The Gradle block declares the modern library `net.zetetic:sqlcipher-android:4.5.6@aar`, but the Kotlin code used the old library's package names (`net.sqlcipher.database.SQLiteDatabase`, `net.sqlcipher.database.SupportFactory`, `SQLiteDatabase.loadLibs(context)`). The new `sqlcipher-android` library uses the `net.zetetic.database.sqlcipher` package, the class is named `SupportOpenHelperFactory`, and native loading is done via `System.loadLibrary("sqlcipher")`. Updated the imports, the factory class name, and the library-loading call to match the new library API.

4. **Incorrect claim about key rotation.** The intro to the "Changing the Encryption Key" section stated that "SQLCipher supports key rotation without re-encrypting the entire database." This contradicts both the SQLCipher documentation and the in-code comment a few lines below ("This re-encrypts the entire database"). `PRAGMA rekey` does re-encrypt every page of the database with the new key. Rewrote the sentence to accurately describe what `PRAGMA rekey` does.

## Review Notes

- The `derive_key` Python helper uses PBKDF2-HMAC-SHA256 with 600,000 iterations (OWASP 2023+ guidance) as an application-layer KDF before passing the derived bytes to SQLCipher as a raw hex key. This is distinct from SQLCipher 4's internal KDF, which uses PBKDF2-HMAC-SHA512 with 256,000 iterations. Both are correct; readers should understand the post is showing two different KDF layers.
- `PRAGMA cipher_compatibility = 4` is the default in current SQLCipher 4.x releases, so setting it explicitly is redundant but harmless and provides good forward-compatibility documentation.
- The Node.js example does not wrap operations in `db.serialize(...)`. With node-sqlite3-style APIs, operations are queued internally so this typically works, but `db.serialize` is the documented way to guarantee ordering. Left as-is since it is not strictly incorrect.
- The Gradle dependency pins `net.zetetic:sqlcipher-android:4.5.6`. Newer 4.6.x point releases exist; the pinned version still works but may want a refresh in a future update.
- The Android example calls `db.credentialDao().getAll()` directly on the main thread inside `onCreate`. Room will throw at runtime unless `allowMainThreadQueries()` is enabled. This is a code-smell rather than a SQLCipher-specific technical error, so left as-is.
- The Mermaid `flowchart TD` uses `{Key Derivation}` (rhombus shape) for a non-decision label; this is stylistic, not incorrect.

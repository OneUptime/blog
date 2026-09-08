# Validation Summary: How to Make SQLite Enforce Foreign Keys on Every Application Connection

## Status
validated

## Post Type
Technical guide with Python and SQL examples.

## Technologies Covered
- SQLite foreign keys, connection settings, transactions, indexes, and database checks
- Python standard-library sqlite3
- Application connection factories, pools, migrations, and integration testing

## Sources Consulted
- SQLite foreign-key support: https://www.sqlite.org/foreignkeys.html
- SQLite foreign_keys pragma: https://www.sqlite.org/pragma.html#pragma_foreign_keys
- SQLite foreign_key_check pragma: https://www.sqlite.org/pragma.html#pragma_foreign_key_check
- SQLite integrity_check pragma: https://www.sqlite.org/pragma.html#pragma_integrity_check
- SQLite defer_foreign_keys pragma: https://www.sqlite.org/pragma.html#pragma_defer_foreign_keys
- SQLite compile-time options: https://www.sqlite.org/compile.html
- SQLite table rebuild procedure: https://www.sqlite.org/lang_altertable.html#otheralter
- Python sqlite3 connection, cursor, and transaction APIs: https://docs.python.org/3/library/sqlite3.html
- Author profile link verified: https://github.com/nawazdhandala

## Issues Found
1. The connection factory indexed fetchone() directly. When unsupported foreign-key enforcement produces no result row, this raises TypeError before the intended close and RuntimeError. Changed the code to retain the row and check for None before indexing it. Both missing and disabled results now reach the explicit failure path.
2. The integration checklist required every orphan insert to fail immediately, despite discussing deferred constraints. Updated it to expect insertion failure for immediate constraints and commit failure for unresolved deferred violations.

## Review Notes
- Executed the extracted Python factory and SQL schema on Python 3.13.1 with SQLite 3.51.0 using disposable in-memory databases. Valid inserts, rejected orphans, rollback and reuse, and repeated connection creation passed.
- Confirmed experimentally that changing enforcement inside a transaction has no effect, historical orphans survive enabling enforcement, and foreign_key_check detects them while integrity_check returns ok.
- Tested deferred checking through defer_foreign_keys: an unresolved orphan caused commit failure, the transaction remained active, and rollback restored usability. Successful commit and rollback reset the setting.
- Mocked missing and disabled pragma results to verify explicit connection cleanup and RuntimeError. A SQLite library compiled without foreign-key support was not available for direct testing.
- Verified diagnostics execute and the schema/index statements are valid. Official documentation supports the parent-key uniqueness/collation requirements, child-index recommendation, default enforcement caveat, and migration guidance. All referenced documentation links resolve to the intended resources.
- The Python example uses the current default legacy transaction control. If adapted to autocommit=False on Python 3.12 or later, initialization must occur before that mode opens a transaction. Python documents a future default change; the current example remains valid and verifies enforcement before returning.
- No ORM or pool implementation is supplied, so actual pool recycling and application-specific connection paths were not exercised. Repeated factory creation was tested instead. No terminal commands or configuration files require validation.

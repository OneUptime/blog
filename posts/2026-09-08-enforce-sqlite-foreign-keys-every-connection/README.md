# How to Make SQLite Enforce Foreign Keys on Every Application Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Database, Data Integrity, Application Development, Testing

Description: Enable and verify SQLite foreign-key enforcement at connection creation, then detect existing violations and test every pool path.

---

Declaring `REFERENCES` in an SQLite schema is not enough to guarantee enforcement. In standard SQLite builds, foreign-key enforcement is disabled by default for each new connection unless the library was compiled with a different default. Applications should set the policy explicitly instead of depending on a build-time default.

## Enable enforcement before the connection is used

Run this immediately after opening every connection and before beginning a transaction:

```sql
PRAGMA foreign_keys = ON;
```

Changing `foreign_keys` while a multi-statement transaction is active has no effect. A reliable connection factory therefore enables it before the connection enters a pool and verifies the result:

```python
import sqlite3

def connect(path: str) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    enabled = db.execute("PRAGMA foreign_keys").fetchone()
    if enabled is None or enabled[0] != 1:
        db.close()
        raise RuntimeError("SQLite foreign-key enforcement is unavailable")
    return db
```

Do this in the lowest common connection hook, not at one application entry point. Background workers, migration commands, tests, administrative scripts, read-write replicas, and temporary connections must all use the same factory. If an ORM or pool offers a connection-created event, install the pragma there.

## Prove the library supports foreign keys

A result of `0` after enabling may indicate that the pragma ran inside a transaction. If querying the pragma returns no row at all, the SQLite library may have been compiled without foreign-key support. Record the library version and compile options in diagnostics:

```sql
SELECT sqlite_version();
PRAGMA compile_options;
```

Fail application startup when integrity depends on a feature the deployed library does not provide. Silently continuing creates data that a later connection may reject.

## Check data created while enforcement was off

Enabling enforcement does not retroactively repair orphaned rows. Audit all constraints:

```sql
PRAGMA foreign_key_check;
```

An empty result means no violations were found. Rows returned by the pragma identify the child table, child row identifier when available, referenced parent table, and foreign-key constraint index. `PRAGMA integrity_check` does not report foreign-key violations, so run both checks when validating a database:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

Back up the database before remediation. Decide whether each orphan should be deleted, linked to a recovered parent, or quarantined. Do not disable enforcement globally merely to import questionable data.

## Index child keys

When a parent row is deleted or its key changes, SQLite searches the child table for matching references. Without an index on child-key columns, this can scan the entire table while holding a write transaction:

```sql
CREATE TABLE account (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE invoice (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES account(id),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
);

CREATE INDEX invoice_account_id_idx ON invoice(account_id);
```

The parent key must be a primary key or covered by a unique constraint or index with compatible collation. Test composite keys and custom collations carefully, because schema mistakes may be detected only when a modifying statement is prepared or executed.

## Use deferred constraints deliberately

Foreign keys are immediate by default. A `DEFERRABLE INITIALLY DEFERRED` constraint may temporarily be violated inside a transaction, but it must be valid at `COMMIT`. This is useful when inserting a related graph in an order that cannot satisfy every relationship statement by statement.

Do not confuse deferred checking with disabled checking. Always handle commit failure and roll back the transaction. `PRAGMA defer_foreign_keys` is reset at each commit or rollback, so code that relies on it must set it for the specific transaction and test that path explicitly.

## Test every way a connection is created

Add an integration test that enumerates each application connection path. For every path:

1. assert `PRAGMA foreign_keys` returns `1`;
2. insert a valid parent and child;
3. verify that an orphan insert fails for an immediate constraint, or that committing an unresolved orphan fails for a deferred constraint;
4. verify the transaction can be rolled back and the connection reused;
5. run the same check after a pool recycle.

Use a disposable database so the test cannot damage real data. Also run `foreign_key_check` after migrations and after restoring a backup.

## Keep maintenance tools consistent

Migration tools often open their own connections. Enable foreign keys before their transaction begins. If a table rebuild requires temporarily disabling enforcement, take an exclusive maintenance window, validate the rewritten schema and data with `foreign_key_check`, then close that connection. New application connections should never inherit a relaxed policy.

## Conclusion

Make foreign-key enforcement a connection invariant. Enable it before every connection enters use, verify the returned value, fail closed when support is missing, and audit historical data with `foreign_key_check`. Index child keys and test pooled, background, migration, and recovery connections so no hidden path bypasses the policy.

## Official Documentation

- [SQLite foreign-key support](https://www.sqlite.org/foreignkeys.html)
- [SQLite `foreign_keys` pragma](https://www.sqlite.org/pragma.html#pragma_foreign_keys)
- [SQLite `foreign_key_check` pragma](https://www.sqlite.org/pragma.html#pragma_foreign_key_check)
- [SQLite compile-time options](https://www.sqlite.org/compile.html)

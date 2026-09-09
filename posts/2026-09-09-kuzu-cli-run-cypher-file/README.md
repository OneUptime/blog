# Run a File of Cypher Commands Through the Kuzu CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Cypher, CLI, Database, Automation

Description: Execute Cypher files with the Kuzu CLI, control transaction boundaries, and detect query errors that do not produce a failing shell exit status.

Kuzu's CLI accepts Cypher on standard input. To execute a saved file, redirect it into the CLI and pass the database path as the positional argument. The details that matter for automation are statement termination, working-directory paths, transaction boundaries, and error detection.

This tutorial uses the official Kuzu 0.11.3 CLI. The project is archived, so retain a pinned binary and check its version rather than assuming a command installed from an old tutorial has identical behavior.

## Prepare a small script

Create `setup.cypher` containing complete semicolon-terminated statements:

```cypher
CREATE NODE TABLE Person(id INT64 PRIMARY KEY, name STRING);
CREATE REL TABLE Knows(FROM Person TO Person);
BEGIN TRANSACTION;
CREATE (:Person {id: 1, name: 'Ada'});
CREATE (:Person {id: 2, name: 'Ben'});
MATCH (a:Person {id: 1}), (b:Person {id: 2})
CREATE (a)-[:Knows]->(b);
COMMIT;
MATCH (a:Person)-[:Knows]->(b:Person)
RETURN a.name AS source, b.name AS destination;
```

The schema is created first. The sample data changes share an explicit transaction, and the final read checks the result. On a fresh database, the final row is Ada followed by Ben.

This script is deliberately for a new database. Running it again encounters existing tables and keys. For a repeatable maintenance task, define whether rerunning should be a no-op, an update, or an error; do not replace every `CREATE` with `MERGE` without deciding which fields identify each record.

## Execute through standard input

From the directory containing the script:

```bash
kuzu --version
kuzu example.kuzu -d 256 -b < setup.cypher
```

`-d 256` limits the buffer pool to 256 MiB for this small example. `-b` disables the progress bar in the 0.11.3 binary. The [CLI documentation](https://kuzudb.github.io/docs/client-apis/cli/) documents redirected input and the available output modes.

The database path determines whether changes persist. Omitting it opens an in-memory database, so a later CLI invocation cannot see the previous invocation's data. Use an absolute path in scheduled jobs to avoid creating a second database in an unexpected directory.

Paths inside Cypher, such as a `COPY` input file, are also sensitive to the process working directory. A script stored at `/opt/jobs/import.cypher` does not automatically make `/opt/jobs` the current directory. Prefer explicit absolute input paths or deliberately change into a known directory before execution.

## Keep shell commands out of Cypher files

A plain Cypher file should contain statements and Cypher comments. Do not paste a terminal prompt such as `kuzu>` or shell commands such as `cd` into it. CLI meta-commands such as `:mode` are shell-specific and should be placed on their own lines if you intentionally use them.

A newline does not terminate a multiline Cypher statement. The semicolon does. Keep quotes and comments balanced, and do not split a script in application code by blindly calling `split(';')`: a semicolon can occur inside a quoted string.

The CLI can process several complete statements. That does not make the file one atomic operation. Statements outside a manual transaction commit separately, so an error halfway through a script may leave earlier work in place.

## Do not treat exit status as a query-success guarantee

In the pinned 0.11.3 CLI, a query error can be printed while the shell continues to later statements and eventually exits with status zero. Therefore, `set -e` alone does not establish that every Cypher statement succeeded. This behavior is visible in the [shell implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/embedded_shell.cpp).

Capture logs and test a known failure in your exact binary:

```bash
kuzu example.kuzu -d 256 -s -b < setup.cypher > run.log 2>&1
```

For unattended execution that must stop after the first failed statement, use a client API with explicit result or exception handling. Keep statements in a structured collection rather than inventing a Cypher parser:

```python
import kuzu

statements = [
    "CREATE (:Person {id: 10, name: 'Cara'})",
    "CREATE (:Person {id: 11, name: 'Dan'})",
]
with kuzu.Database("example.kuzu", buffer_pool_size=256 * 1024 * 1024) as db:
    with kuzu.Connection(db) as conn:
        conn.execute("BEGIN TRANSACTION").close()
        try:
            for statement in statements:
                conn.execute(statement).close()
            conn.execute("COMMIT").close()
        except Exception:
            try:
                conn.execute("ROLLBACK").close()
            except RuntimeError:
                pass
            raise
```

This is an alternative runner for a controlled statement list. Close the CLI before opening the same writable database from Python. The example assumes the schema already exists and IDs 10 and 11 are new.

## Check completion using data invariants

A successful import should satisfy expected counts and key constraints, not merely produce an output file. Check that the expected node tables exist, the number of loaded rows matches the source, and relationships connect the intended endpoints.

Retain the script version, CLI version, database path, start and finish time, and log location. If retrying after failure, inspect what committed before deciding to replay. A script-level retry can otherwise duplicate relationships or encounter primary-key failures.

## Conclusion

Use input redirection for a file of Cypher commands, keep paths and transaction boundaries explicit, and verify completion through database invariants. For strict fail-fast automation, move the statement execution into a checked client API loop.

## Official Documentation

- [CLI usage](https://kuzudb.github.io/docs/client-apis/cli/)
- [Shell execution source](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/embedded_shell.cpp)
- [CLI startup and options](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/shell_runner.cpp)
- [Transactions](https://kuzudb.github.io/docs/cypher/transaction/)

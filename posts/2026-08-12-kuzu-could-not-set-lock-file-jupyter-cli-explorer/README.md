# Fix Kuzu “Could Not Set Lock on File” Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, File Locking, Jupyter, Kuzu Explorer, Concurrency

Description: Resolve Kuzu file-lock errors without risking corruption by enforcing one writer, closing notebook objects, and using read-only tools deliberately.

---

Kuzu's `Could not set lock on file` error is a protection, not stale clutter to delete. It normally means another `Database` object already has the on-disk graph open in a mode that cannot safely coexist with the new process. The common pattern is a Jupyter kernel holding a read-write database while the CLI or Kuzu Explorer tries to open the same path.

Kuzu's documented rule is precise: for one database path, use either one `READ_WRITE` `Database` object or multiple `READ_ONLY` objects. Multiple `Connection` objects created from the same read-write `Database` are safe; separate database objects are the problem when any of them can write.

## Understand What Is Being Locked

Kuzu is embedded in its host process. Creating this object starts the database machinery inside the Python kernel:

~~~python
import kuzu

db = kuzu.Database("/srv/graphs/app.kuzu")
conn = kuzu.Connection(db)
~~~

The `db` object owns components such as storage, buffer, and transaction managers. Its caches know about writes made through connections created from that object. A second `Database` object has independent caches and cannot be notified safely about the first object's changes. That is why Kuzu's supported concurrency model allows only one `Database` object when it is read-write.

The file is not merely locked during an individual query. It remains owned for the lifetime of the `Database` object, often the lifetime of the notebook kernel or server process.

## The Fast, Safe Jupyter Fix

If a notebook opened the graph read-write and you now need the CLI or Explorer, finish work in the notebook, then close its Kuzu objects. Prefer an explicit lifecycle:

~~~python
import kuzu

db = kuzu.Database("/srv/graphs/app.kuzu")
conn = kuzu.Connection(db)
result = None

try:
    result = conn.execute("MATCH (n) RETURN count(*)")
    print(list(result))
finally:
    if result is not None:
        result.close()
    conn.close()
    db.close()
~~~

If the notebook cell lost references, a query is still running, or object cleanup is uncertain, restart the Jupyter kernel/server. Kuzu's concurrency FAQ explicitly recommends restarting or closing Jupyter to release the database lock before opening the CLI or Explorer.

After restart, do not rerun the cell that opens the database. Then launch the other tool. If the new tool still cannot acquire the lock, identify the real owner rather than deleting files:

~~~bash
lsof /srv/graphs/app.kuzu
ps -ef | grep '[k]uzu'
~~~

On Linux, `fuser /srv/graphs/app.kuzu` is another read-only diagnostic. Confirm the PID belongs to the expected notebook, CLI, API service, or container before stopping anything.

## Using the CLI Beside a Notebook

The default CLI open is read-write:

~~~bash
kuzu /srv/graphs/app.kuzu
~~~

That will conflict with a notebook that already owns the write-capable database. If every process is genuinely read-only, open both in read-only mode. The CLI documents `-r`/`--read_only`:

~~~bash
kuzu --read_only /srv/graphs/app.kuzu
~~~

The Python side must also be read-only:

~~~python
import kuzu

db = kuzu.Database("/srv/graphs/app.kuzu", read_only=True)
conn = kuzu.Connection(db)
~~~

Do not assume opening the second process as read-only makes it safe beside an existing writer. Kuzu says a `READ_WRITE` database object cannot safely coexist with a separate read-only or read-write object on the same database. “Multiple read-only objects” means all open objects are read-only.

Use a copied or exported graph for exploratory notebook work if the production API must continue writing.

## Using Kuzu Explorer Safely

Explorer embeds another Kuzu instance inside its Docker container. The official launch documentation supports `MODE=READ_ONLY`:

~~~bash
docker run -p 8000:8000 \
  -v /srv/graphs:/database \
  -e KUZU_FILE=app.kuzu \
  -e MODE=READ_ONLY \
  --rm kuzudb/explorer:latest
~~~

`KUZU_FILE` selects `app.kuzu` inside the mounted `/database` directory. If the database was created by an earlier Kuzu version, replace `latest` with the matching Explorer image version because storage formats can change between versions. Mounting the database into the container does not share the original process's in-memory buffer manager.

There is an important archived Kuzu caveat: its concurrency page documents a known issue where Explorer may not recognize the file-lock permission flags set by a process outside the container because those flags are not propagated as expected. Therefore, lack of an Explorer error does not prove concurrent access is safe.

Manually enforce one of these states:

- all processes, including Explorer, are `READ_ONLY`; or
- every other process is stopped before Explorer opens the graph read-write.

For visualization of a changing production graph, create a quiesced copy or restore a recent logical export into a separate path. Staleness is safer than corrupting the live writer's assumptions.

## Reuse One Database Object Inside an Application

The lock rule does not require serializing all work through one connection. Kuzu explicitly supports multiple connections created from the same read-write `Database` and concurrent queries from those connections.

~~~python
import kuzu

db = kuzu.Database("/srv/graphs/app.kuzu")

def make_connection() -> kuzu.Connection:
    return kuzu.Connection(db)
~~~

Create the database once at process startup, inject it into request handlers, and create or pool connections from that shared object. Do not construct `kuzu.Database(path)` inside every HTTP request, notebook function, or worker task.

Kuzu wraps statements in transactions and its transaction manager safely coordinates connections from the same object. It allows multiple read transactions but only one write transaction at a time; Kuzu rejects a second concurrent writer, so applications must serialize or retry competing writes. That is a throughput issue, not a reason to create another database instance.

## Diagnose Path Mistakes Before Blaming Locks

Two paths that look different can identify the same file through symlinks, bind mounts, container volumes, or relative working directories. Normalize the path in configuration and log it at startup:

~~~python
from pathlib import Path

database_path = Path("/srv/graphs/app.kuzu").resolve(strict=True)
print(database_path)
~~~

Also check file and directory ownership. Permission problems can prevent a database open or the creation of runtime companion files, even though they are distinct from a lock held by another process. From the same user/container as Kuzu:

~~~bash
id
ls -ld /srv/graphs
ls -l /srv/graphs/app.kuzu
test -w /srv/graphs
test -r /srv/graphs/app.kuzu
test -w /srv/graphs/app.kuzu
~~~

A read-write open needs appropriate directory and file permissions for Kuzu's runtime companions. Starting with `0.11.0`, Kuzu can create `.wal`, `.shadow`, and `.tmp` files beside the single main database file. A read-only mount or mismatched UID can prevent a read-write open from creating or updating them.

## What Not to Do

Do not:

- delete a supposed lock, WAL, shadow, or temporary file while a process may be running;
- use `kill -9` before trying a graceful close;
- copy only the main database file while writes are active and assume it is consistent;
- start Explorer read-write because its container failed to observe the host lock;
- mix one writer with “just one” read-only CLI process;
- place the database on a filesystem whose locking behavior you have not tested;
- use in-memory mode as a way to share one graph across processes.

Kuzu's `.wal`, `.shadow`, and `.tmp` files have documented recovery, checkpoint, and spill roles. Treat them as engine-managed files.

## A Safe Tool-Switching Runbook

1. Identify every process and container with the database open.
2. Decide whether the next state is one writer or all readers.
3. Finish, commit, or roll back manual transactions.
4. Close connections and the database object gracefully.
5. Restart Jupyter if object ownership is uncertain.
6. Confirm the old process is gone with `lsof` or container inspection.
7. Open the CLI or Explorer in the selected mode.
8. Close that tool before returning the writer to service.

For frequent inspection, automate a snapshot/export workflow instead of repeating manual ownership transfers.

## Official Documentation

- [Kuzu connections and concurrency model](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu CLI read-only option](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu Explorer modes and mounts](https://kuzudb.github.io/docs/visualization/kuzu-explorer/)
- [Kuzu transactions](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu on-disk files](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu database export/import](https://kuzudb.github.io/docs/migrate/)
- [Kuzu archived repository](https://github.com/kuzudb/kuzu)

## Conclusion

Resolve Kuzu lock errors by changing process ownership, not by removing engine files. Keep one read-write `Database` object and share connections inside that process, or make every separate process read-only. Close or restart Jupyter before switching tools, and treat Explorer's container lock limitation as a reason for stricter operational discipline.

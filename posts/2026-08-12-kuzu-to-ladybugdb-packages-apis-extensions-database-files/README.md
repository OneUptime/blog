# Kuzu to LadybugDB: What Actually Changes in Packages, APIs, Extensions, and Database Files?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, LadybugDB, Graph Databases, API Migration, Extensions

Description: Migrate Kuzu deliberately by mapping renamed packages and APIs, retesting extensions, and rebuilding database files through portable exports.

---

LadybugDB is the active database whose official repository says it was formerly known as Kuzu. That shared lineage preserves many familiar ideas: an embedded `Database`, one or more `Connection` objects, a structured property graph, Cypher, node and relationship tables, and `COPY FROM`. It does not make a production migration a search-and-replace exercise.

Four surfaces must be handled separately: distribution packages, client API calls, extensions, and persisted data. If all four are hidden behind a small adapter and a repeatable export/import test, the migration is manageable. If package names, raw files, and extension binaries are mixed together, failures become hard to diagnose.

## Start with a Concrete Name Map

The official installation pages establish these primary package changes:

| Surface | Frozen Kuzu | LadybugDB |
| --- | --- | --- |
| Python | `pip install kuzu` | `pip install ladybug` |
| Python import | `import kuzu` | `import ladybug as lb` |
| Node.js | `npm install kuzu` | `npm install @ladybugdb/core` |
| Java | `com.kuzudb:kuzu` | `com.ladybugdb:lbug` |
| Rust | `cargo add kuzu` | `cargo add lbug` |
| Go | `github.com/kuzudb/go-kuzu` | `github.com/LadybugDB/go-ladybug` |
| CLI | `kuzu` | `lbug` |
| Typical file name | `example.kuzu` | `example.lbdb` |
| Per-user state | `~/.kuzu` | `~/.lbug` |

Update lockfiles and container build stages along with application source. Check transitive code generators, migration scripts, health checks, PATH lookups, native-library names, and deployment allowlists. A service may compile successfully while an operations script still calls `kuzu` or backs up only `*.kuzu`.

Do not copy a version number mechanically between ecosystems. Kuzu ended at `0.11.3`; Ladybug development continued and its latest official release as of August 12, 2026 is `0.19.1`. Select a Ladybug version from its own release stream and pin it explicitly.

## The Core API Looks Familiar, but Test the Boundary

For simple Python applications, the edit can appear small:

~~~python
# Kuzu
import kuzu

db = kuzu.Database("app.kuzu")
conn = kuzu.Connection(db)
result = conn.execute("MATCH (u:User) RETURN u.id ORDER BY u.id")

# LadybugDB
import ladybug as lb

db = lb.Database("app.lbdb")
conn = lb.Connection(db)
result = conn.execute("MATCH (u:User) RETURN u.id ORDER BY u.id")
~~~

The class names and query shape remain recognizable. Still audit every method used by your program: prepared statements, async connections, result iteration, DataFrame/Arrow conversion, UDF registration, timeouts, interrupts, and database constructor options. Compare the current generated API documentation rather than assuming an older Kuzu signature remains identical.

Node.js has a similar conceptual API but a new module name:

~~~javascript
const lbug = require("@ladybugdb/core");

const db = new lbug.Database("app.lbdb");
const conn = new lbug.Connection(db);
const result = await conn.query(
  "MATCH (u:User) RETURN u.id ORDER BY u.id"
);
const rows = await result.getAll();
~~~

Ladybug documents both async `query()`/`getAll()` and synchronous `querySync()`/`getAllSync()` paths. Preserve the application's intended async behavior; replacing an awaited call with a synchronous one can block an event loop even if its results are correct.

## Keep Cypher Compatibility as a Test, Not an Assumption

The basic schema and query language remain close enough that many statements carry over:

~~~cypher
CREATE NODE TABLE User(
    id STRING PRIMARY KEY,
    email STRING,
    created_at TIMESTAMP
);

CREATE REL TABLE Follows(
    FROM User TO User,
    since DATE
);

MATCH (a:User)-[f:Follows]->(b:User)
RETURN a.id, b.id, f.since
ORDER BY a.id, b.id;
~~~

Run the real application's query corpus, not only this happy path. Later Ladybug releases can add functions, types, extensions, optimizer behavior, and validation that did not exist in Kuzu `0.11.3`. Check parameter binding, returned type representations, nulls, unordered results, transaction boundaries, and error handling. When comparing result sets, add `ORDER BY`; neither engine should be expected to provide a stable implicit row order.

A useful adapter keeps engine-specific setup in one module:

~~~python
import ladybug as lb

def open_graph(path: str) -> tuple[lb.Database, lb.Connection]:
    db = lb.Database(path)
    conn = lb.Connection(db)
    conn.execute("CALL THREADS=4")
    return db, conn
~~~

Application repositories can then migrate the adapter and test fixtures before sweeping away all old Kuzu references.

## Extensions Are New Artifacts, Not Reusable Binaries

Kuzu `0.11.3` bundled `algo`, `fts`, `json`, and `vector` because the public Kuzu extension server was retired. Other Kuzu extensions required the archived local server image and an `INSTALL ... FROM` URL. Ladybug once again documents an official extension service, a current extension catalog, and the normal lifecycle:

~~~cypher
CALL SHOW_OFFICIAL_EXTENSIONS() RETURN *;
INSTALL json;
LOAD json;
CALL SHOW_LOADED_EXTENSIONS() RETURN *;
~~~

Ladybug stores installed extension libraries under `~/.lbug/extensions`, not `~/.kuzu/extensions`. Extensions are compiled native code coupled to an engine, release, OS, and CPU architecture. Never copy a `.kuzu_extension` artifact into Ladybug's directory or rename its suffix. Install the Ladybug build that matches the deployed engine.

Also remember that loading is session-scoped. A successful migration shell does not ensure the application process has loaded `fts`, `vector`, or another required extension. Add explicit startup loading and a capability check. Recreate and query extension-backed indexes in acceptance tests rather than checking only that `LOAD` succeeds.

The current Ladybug list is broader than the four Kuzu-bundled extensions and includes connectors such as `adbc`, `delta`, `duckdb`, `iceberg`, `neo4j`, `postgres`, and `sqlite`. Availability is not behavioral equivalence. Validate the exact functions, options, credentials, and indexes your application uses.

## Database Files: Similar Layout Does Not Mean Rename-Compatible

Kuzu `0.11.0` and later use a single primary database file plus runtime companions such as `.wal`, `.shadow`, and `.tmp`. Ladybug's current file documentation describes the same categories with examples such as:

~~~text
example.lbdb
example.lbdb.wal
example.lbdb.shadow
example.lbdb.tmp
~~~

That architectural similarity is not a documented guarantee that any Kuzu file can be opened by any Ladybug release. The suffix itself carries no compatibility information. Do not do this:

~~~bash
# This changes a name, not a storage format.
mv production.kuzu production.lbdb
~~~

Treat the raw Kuzu file as the rollback artifact and the logical export as the migration artifact. From the pinned Kuzu engine, quiesce writes, finish or roll back open transactions, checkpoint, and export:

~~~cypher
CHECKPOINT;
EXPORT DATABASE '/var/lib/graph-export';
~~~

The export directory contains schema, macros, generated `COPY FROM` statements, and data files. Parquet is the documented default. Check the generated Cypher into a controlled migration bundle or at least retain its checksum so schema changes are reviewable.

Create a new, empty Ladybug database and import a copy of the bundle:

~~~bash
lbug /var/lib/ladybug/candidate.lbdb
~~~

~~~cypher
IMPORT DATABASE '/var/lib/graph-export';
~~~

Ladybug documents that import must target an empty database and that a failed import does not have automatic rollback. Delete only the disposable candidate and retry from a clean file; never retry into a partially populated production target.

## Validate the Migration in Layers

Use checks that can identify which surface failed:

1. **Package layer:** print engine versions and verify native modules load on every OS/architecture.
2. **Schema layer:** compare node/relationship tables, property types, defaults, multiplicities, macros, and indexes.
3. **Data layer:** compare per-table counts, primary-key hashes, relationship endpoint counts, null distributions, and selected aggregates.
4. **Query layer:** replay representative reads and writes with bound parameters and stable ordering.
5. **Extension layer:** load each required extension and exercise its functions or indexes.
6. **Operational layer:** restart, checkpoint, back up, restore, and test concurrent requests.

Run both engines from immutable environments. If the baseline uses an accidentally newer package on one developer laptop, differences cannot be attributed reliably.

## Cutover Without Splitting the Graph

During final cutover, stop Kuzu writes, produce the final logical export, import into a fresh Ladybug file, execute acceptance checks, and move the API to Ladybug. Do not allow two writable copies and try to merge their files later. If rollback is required, route traffic back to the preserved Kuzu environment and account explicitly for any writes accepted after the cutover.

Backups must change too. Update paths from `.kuzu` to `.lbdb`, include logical exports in recovery tests, and avoid copying a live primary file without following the engine's transaction/checkpoint rules.

## Official Documentation

- [Kuzu archive announcement and final extension guidance](https://github.com/kuzudb/kuzu)
- [Kuzu installation and package names](https://kuzudb.github.io/docs/installation/)
- [Kuzu client API overview](https://kuzudb.github.io/docs/client-apis/)
- [Kuzu on-disk files](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu export and import](https://kuzudb.github.io/docs/migrate/)
- [Ladybug repository and package map](https://github.com/LadybugDB/ladybug)
- [Ladybug installation](https://docs.ladybugdb.com/installation/)
- [Ladybug Python API](https://docs.ladybugdb.com/client-apis/python/)
- [Ladybug Node.js API](https://docs.ladybugdb.com/client-apis/nodejs/)
- [Ladybug extensions](https://docs.ladybugdb.com/extensions/)
- [Ladybug on-disk files](https://docs.ladybugdb.com/developer-guide/files/)
- [Ladybug migration commands](https://docs.ladybugdb.com/migrate/)

## Conclusion

Kuzu-to-Ladybug migration preserves the graph model more than it preserves operational identity. Rename and repin packages, verify each client method, install Ladybug-native extensions, and rebuild a clean database from a logical export. The familiar API lowers the migration cost; only a layered validation run establishes compatibility.

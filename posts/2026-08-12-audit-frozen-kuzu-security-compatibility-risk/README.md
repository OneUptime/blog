# How to Audit a Frozen Kuzu Deployment for Security and Compatibility Risk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Security Audit, Dependency Management, Compatibility, Risk Management

Description: Audit a frozen Kuzu stack from pinned engine and extension artifacts through input boundaries, runtime compatibility, recovery, and migration readiness.

---

Kuzu's official repository was archived on October 10, 2025, and its last release is `0.11.3`. An archive is not evidence of a vulnerability, but it changes the assurance model: there is no active Kuzu release train to absorb future compiler, operating-system, runtime, dependency, or security fixes. Your deployment either constrains that risk, maintains the code, or migrates.

A useful audit produces evidence and owners, not a generic “legacy dependency” ticket. The result should answer four questions: exactly what is running, what untrusted inputs can reach it, what platform changes can break it, and how quickly the graph can be restored or moved.

## 1. Prove the Deployed Version

Start at the running artifact rather than a manifest in source control. Kuzu ships as native binaries and language bindings, so a Python lockfile, container tag, and loaded shared library can disagree.

Collect version and artifact evidence from every environment:

~~~bash
kuzu --version
python -c 'import kuzu; print(kuzu.__version__)'
npm ls kuzu --depth=0
# Linux
sha256sum "$(command -v kuzu)"
# macOS
shasum -a 256 "$(command -v kuzu)"
~~~

Use `Get-FileHash` for the equivalent check on Windows.

For containers, record the image digest, base-image digest, OS packages, CPU architecture, and libc. For Java, Rust, Go, C, or C++, record the package coordinate or source commit and the linked native library. Keep this in an inventory that maps service, environment, owner, data path, engine version, and recovery objective.

If any environment is older than `0.11.3`, document why. The final release bundles `algo`, `fts`, `json`, and `vector`, avoiding the retired public Kuzu extension server for those common capabilities. Upgrade through a tested logical export/import path rather than assuming raw-file compatibility.

## 2. Inventory Every Extension and Native Artifact

Extensions are part of the executable database surface. Despite the archived on-disk-files page saying `~/.kuzu/extensions`, the `0.11.3` runtime places dynamically installed official extensions below `~/.kuzu/extension/0.11.3/<platform>/`, and a named `LOAD` resolves them there. In `0.11.3`, four extensions are bundled; other official extensions installed by name require a local extension server, while self-built extensions can be loaded directly by library path.

From the application startup path and representative sessions, identify:

- which extensions are loaded;
- their exact files and hashes, or the containing engine or binding artifact for a statically linked extension;
- which engine version, OS, and architecture they target;
- whether they came from the bundled release, a local Kuzu extension server, or an internal build;
- who can replace files in the resolved extension directory;
- which extensions can access local files, HTTP endpoints, cloud storage, or external databases.

Do not treat an extension name as a version. Preserve the actual binary or a reproducible build and verify that its directory is not writable by the unprivileged application user. Never load a library from an upload directory or user-controlled path.

## 3. Draw the Input and Trust Boundaries

Kuzu is embedded; it does not itself create a network service for your application. Risk depends on the host process. Trace how inputs become Cypher, file paths, URLs, credentials, extension names, or database paths.

Parameters should carry values:

~~~python
result = conn.execute(
    "MATCH (u:User) WHERE u.id = $id RETURN u.email",
    parameters={"id": request.user_id},
)
~~~

Do not let callers supply table names, clauses, `INSTALL`, `LOAD`, `COPY FROM`, `ATTACH`, or arbitrary paths through the same API used for normal reads. Parameters are not a way to parameterize grammar or identifiers; expose fixed operations and validate any unavoidable identifier against an allowlist.

Review these boundaries separately:

- public HTTP/gRPC request to application handler;
- handler to prepared Cypher and parameters;
- import job to local/remote data source;
- engine process to filesystem and network;
- extension to credentials and external services;
- operator CLI or notebook to the production database file.

Run the process with the least filesystem and network access its workload requires. A read-only application should open the `Database` with `read_only=True` and have OS-level write restrictions too.

## 4. Test Runtime Compatibility Before Platform Upgrades

Kuzu `0.11.3`'s installation and system-requirement pages freeze the platform assumptions that upstream tested. New Python, Node.js, Java, compilers, libc, macOS, Windows, or CPU releases can arrive after Kuzu stops publishing binaries.

Build a compatibility matrix containing the current and next planned versions of:

| Layer | Evidence to capture |
| --- | --- |
| OS/base image | release, architecture, libc, kernel |
| Python/Node/Java | exact runtime and native ABI |
| Kuzu binding | package version, wheel/addon/JAR hash |
| C/C++ toolchain | compiler and standard library when built from source |
| Extensions | names, hashes, external library dependencies |
| Filesystem | local/container volume type and lock behavior |

For each candidate upgrade, create a fresh environment, install only pinned artifacts, restore a copy through the documented export, and run the application query suite. Test startup and packaging failures as well as query results. A native module that cannot load is a compatibility incident even if the Cypher is unchanged.

## 5. Audit File Ownership, Locking, and Backup Semantics

Starting with Kuzu `0.11.0`, an on-disk database uses a primary single file and can create `.wal`, `.shadow`, and `.tmp` companions. The main file represents data at the last checkpoint; the WAL contains committed updates since that checkpoint until a successful checkpoint removes it.

Do not copy or modify these files selectively while a writer is active. Establish one owned database path, one writable engine process, controlled directory permissions, and a backup procedure tested against the actual pinned version. Kuzu allows one `READ_WRITE` `Database` object or multiple `READ_ONLY` objects for the same database; mixing a writer with another database object is unsafe and normally prevented by locking.

A recovery test should cover:

1. quiescing writes;
2. closing long-running transactions;
3. loading every extension that owns an index, then creating a logical `EXPORT DATABASE` directory;
4. restoring into a new, empty database;
5. checking schema, counts, relationships, indexes, and application queries;
6. recording elapsed recovery time and any manual step.

Possessing a raw file is not proof of recoverability. Keep a logical export because it is also the practical migration boundary.

## 6. Exercise Transaction and Failure Behavior

Kuzu documents atomic, durable, serializable transactions, multiple readers, and at most one write transaction at a time. Every query, DDL command, data modification, and `COPY FROM` participates in a transaction. Audit the application for manual transactions left open across network calls, oversized bulk writes, retry loops that repeat non-idempotent work, and queries with no timeout.

Set a measured query timeout where exposed and cap execution resources at the connection or database boundary. Test:

- process termination before and after commit;
- restart with a WAL present;
- rollback after a failed multi-step operation;
- concurrent reads during writes;
- two attempted writer processes;
- disk-full and permission-denied conditions;
- malformed imports with `IGNORE_ERRORS` disabled and enabled intentionally.

Do this on copies. Failure testing against the only production file defeats the purpose of the audit.

## 7. Assess Exposure, Impact, and Compensating Controls

Rate findings by reachable capability, not merely package age. A frozen engine inside an offline batch container processing trusted Parquet has a different exposure from one accepting arbitrary Cypher and URLs from public users.

High-priority findings include:

- untrusted query text or file/URL paths;
- writable extension directories;
- floating package or container tags;
- multiple processes attempting read-write access;
- no restorable logical export;
- unsupported runtime upgrade already required;
- extension credentials broader than the job needs;
- production database mounted in development notebooks or Explorer.

Useful compensating controls include a fixed query API, prepared parameters, process sandboxing, read-only mounts, outbound network allowlists, immutable images, extension hash verification, resource limits, and shorter data-retention windows. Controls reduce exposure; they do not create upstream maintenance.

## 8. Define Exit Triggers Now

Record conditions that force migration or fork work rather than reopening the same debate during an incident:

- a relevant vulnerability without a safe mitigation;
- a required OS/runtime version has no working Kuzu artifact;
- a necessary extension cannot be reproduced;
- recovery tests fail or exceed the objective;
- a product requirement needs fixes beyond `0.11.3`;
- the deployment must accept a more hostile input boundary.

LadybugDB is the active successor to evaluate first. Its official repository identifies the former Kuzu name, but migration still needs package/API updates and a logical data transfer. Fund that proof of concept while the current system is healthy.

## Audit Deliverable

End with a concise register, for example:

~~~text
Finding: Node 24 target has no tested frozen binding baseline
Exposure: next base-image upgrade
Impact: service fails at startup
Control: retain pinned Node image for 60 days
Owner: graph-platform
Exit date: 2026-10-01
Durable fix: complete Ladybug compatibility run
Evidence: image digest, install log, query-suite report
~~~

Every accepted risk needs an owner and date. “Kuzu is archived” is context; it is not itself a remediation.

## Official Documentation

- [Archived Kuzu repository](https://github.com/kuzudb/kuzu)
- [Kuzu 0.11.3 final release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu installation artifacts](https://kuzudb.github.io/docs/installation/)
- [Kuzu system requirements](https://kuzudb.github.io/docs/system-requirements/)
- [Kuzu extensions and local server guidance](https://kuzudb.github.io/docs/extensions/)
- [Kuzu 0.11.3 extension-directory implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp#L195-L198)
- [Kuzu prepared statements](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [Kuzu connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu transactions and checkpoints](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu on-disk files](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu export/import](https://kuzudb.github.io/docs/migrate/)
- [LadybugDB active repository](https://github.com/LadybugDB/ladybug)

## Conclusion

Audit frozen Kuzu as a complete native data stack: engine, binding, extensions, host process, filesystem, and recovery path. Prove versions and hashes, narrow untrusted inputs, test upcoming platforms, and restore a logical export. Then attach dated exit triggers to every temporary control. The goal is not to declare old software safe forever; it is to know the risk and retain a tested way out.

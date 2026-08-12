# Kuzu Was Archived: Should You Pin 0.11.3, Fork It, or Migrate?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, LadybugDB, Graph Databases, Migration, Software Lifecycle

Description: Choose a defensible path after Kuzu's archive: pin 0.11.3 briefly, maintain a fork deliberately, or migrate to active LadybugDB releases.

---

Kuzu is no longer merely a slow-moving dependency. Its official repository was archived on October 10, 2025, is read-only, and identifies `v0.11.3` as its final release. The project announcement says existing releases remain usable, but that is a statement about continued availability—not a promise of future security fixes, platform builds, compatibility work, or support.

The right response is therefore not “upgrade at once” or “it still runs, so do nothing.” Treat the archive as a lifecycle event. Pinning, forking, and migrating are all reasonable in different circumstances, but each transfers risk to a different place.

## The Short Decision Rule

Use this default order:

1. **Pin `0.11.3` as a stabilization step** while you inventory the deployment and create a portable export.
2. **Migrate to LadybugDB** when you need ongoing releases, new platform support, or upstream fixes. Ladybug's official repository describes it as the database formerly known as Kuzu and remains active.
3. **Fork Kuzu only when migration is materially harder than ownership**, and only if your team can build, test, package, and secure a native database engine and all required bindings.

Pinning is a time-buying tactic, not a long-term maintenance strategy. A fork is a product commitment, not a Git command. Migration is usually the durable path, but it still deserves a staged compatibility test.

## What `0.11.3` Actually Gives You

Kuzu `0.11.3` packages the `0.11.2` engine together with four extensions:

- `algo`
- `fts`
- `json`
- `vector`

Those four no longer need a network `INSTALL` step in `0.11.3`. This matters because Kuzu's public extension server was retired with the archive. Other extensions—and any extension on an older Kuzu release—require a locally hosted extension repository.

Moving from an earlier Kuzu version to `0.11.3` can therefore remove an immediate deployment dependency and put every environment on the last known upstream bits. Test the upgrade through Kuzu's documented export/import route; do not replace a database binary under a live process or assume every historical on-disk format can be opened directly.

Pin every layer, not just one package name:

~~~text
Engine or CLI:  0.11.3
Python wheel:   kuzu==0.11.3
Node package:   kuzu@0.11.3
Java artifact:  com.kuzudb:kuzu:0.11.3
Container:      immutable digest, not :latest
Extensions:     exact artifacts for 0.11.3, OS, and architecture
~~~

Also retain checksums and a copy of the release assets you are licensed to redistribute internally. A package registry retaining an old artifact is not a recovery plan.

## When a Pin Is Defensible

A temporary pin is reasonable when the database is embedded in a controlled application, exposed only through a narrow internal interface, and running on an OS/runtime combination already covered by the final artifacts. It is especially useful while you build a migration test rather than changing the engine during an incident.

Put explicit exit criteria around the pin. For example:

- logical export created and restored in a clean environment;
- supported application queries captured as regression tests;
- dependency and native-binary inventory completed;
- operating-system and language-runtime upgrade dates known;
- migration proof of concept scheduled and owned;
- compensating controls documented for untrusted input and file access.

A pin becomes indefensible when it silently blocks required OS, CPU, Python, Node.js, Java, or compiler upgrades; when untrusted users can submit Cypher or paths; when a vulnerability has no upstream fix; or when nobody can reproduce the build.

## When a Fork Makes Sense

The archived repository is MIT-licensed, so a fork is technically possible. The hard question is whether it is operationally sensible. Kuzu is a C++ database engine with several language bindings, a storage format, transaction and recovery logic, WebAssembly builds, and dynamically loaded extensions. Maintaining only the line that your application calls does not maintain that system.

Choose a fork only when at least one of these is true:

- a regulatory or product constraint requires the frozen Kuzu API for a defined period;
- your deployment depends on a feature that is absent from the migration target;
- the data or application is costly enough to fund dedicated database-engine ownership;
- you need a narrowly scoped backport and have a dated plan to retire the fork.

Before approving it, demonstrate reproducible builds on every supported platform, run upstream and application tests, establish vulnerability intake, own extension ABI compatibility, and decide how to version on-disk changes. Keep the fork small: feature development increases divergence and makes a later migration harder.

## Why LadybugDB Is the Natural Migration Target

Ladybug's official repository explicitly says the database was formerly known as Kuzu. Its packages and branding have changed, and development has continued beyond the frozen Kuzu line. As of August 12, 2026, the latest official Ladybug release is `v0.19.1`, while Kuzu remains at `v0.11.3`.

That lineage makes Ladybug the first target to evaluate, not proof that migration is a package rename. Client imports, package coordinates, executable names, default file suffixes, extension delivery, and behavior added in later releases all need testing. For example, Python uses `ladybug` and commonly `import ladybug as lb`; Node.js uses `@ladybugdb/core`; and the CLI is `lbug`.

Use a compatibility branch and run the same corpus against both engines:

~~~python
# Frozen baseline
import kuzu
old_db = kuzu.Database("baseline.kuzu")
old_conn = kuzu.Connection(old_db)

# Migration candidate
import ladybug as lb
new_db = lb.Database("candidate.lbdb")
new_conn = lb.Connection(new_db)
~~~

Compare result values, null behavior, ordering only where the query includes `ORDER BY`, errors, transaction behavior, and performance envelopes. Do not compare only row counts.

## Move Data Logically, Not by Renaming a File

Kuzu `0.11.0` introduced a single-file on-disk format, but “single file” does not mean “stable interchange format.” A database file also embodies a storage version and may depend on checkpoint/recovery behavior in its engine version. Renaming `graph.kuzu` to `graph.lbdb` proves nothing.

Create a logical export from a quiesced Kuzu `0.11.3` process:

~~~cypher
CHECKPOINT;
EXPORT DATABASE '/srv/migration/kuzu-export';
~~~

The documented export contains `schema.cypher`, `macro.cypher`, `copy.cypher`, and data files, using Parquet by default. Preserve that directory as the auditable handoff. Load required extensions before export because Kuzu documents that only indexes whose dependent extensions are loaded are exported.

Restore into a new, empty target database. Kuzu and Ladybug documentation both warn that `IMPORT DATABASE` requires an empty database and does not automatically roll back a failed import. Therefore, make the candidate database disposable, save the import logs, and recreate it before retrying.

## A Practical Three-Phase Plan

### Phase 1: Stabilize

Pin `0.11.3`, remove floating versions, record hashes, stop runtime extension downloads, back up the database, and produce a logical export. Record the final Kuzu environment in a lockfile and container digest.

### Phase 2: Prove

Build the Ladybug candidate separately. Recreate schema and data through documented export/import artifacts, then validate counts per table, primary-key uniqueness, relationship endpoints, null distributions, extension-backed indexes, and representative query results. Exercise crash/restart and concurrent request behavior as well as happy-path reads.

### Phase 3: Cut Over and Retain Rollback

Quiesce writes, take a final export, import it into a clean target, run automated acceptance queries, and switch traffic. Keep the frozen Kuzu binary, checksums, logical export, and read-only copy for the rollback window. Never let both engines write independently and later expect file-level reconciliation.

## Official Documentation

- [Archived Kuzu repository and lifecycle announcement](https://github.com/kuzudb/kuzu)
- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu installation and package coordinates](https://kuzudb.github.io/docs/installation/)
- [Kuzu extension archive guidance](https://kuzudb.github.io/docs/extensions/)
- [Kuzu database export and import](https://kuzudb.github.io/docs/migrate/)
- [Kuzu on-disk file layout](https://kuzudb.github.io/docs/developer-guide/files/)
- [Active Ladybug repository](https://github.com/LadybugDB/ladybug)
- [Ladybug 0.19.1 release](https://github.com/LadybugDB/ladybug/releases/tag/v0.19.1)
- [Ladybug database migration documentation](https://docs.ladybugdb.com/migrate/)

## Conclusion

Pin Kuzu `0.11.3` immediately if you need stability, but attach a deadline and migration work to that decision. Fork only when you are prepared to own a native database product. For most maintained applications, validate LadybugDB as the successor, move through a logical export, and preserve a tested rollback artifact. The archive does not make a working deployment fail today; it changes who owns every failure tomorrow.

# Validation Summary: How to Install and Configure Neo4j on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation, configuration, and operations walkthrough for Neo4j 5.x on Ubuntu)

## Technologies Covered
- Neo4j 5.x (Community and Enterprise editions)
- Cypher query language
- neo4j-admin CLI (set-initial-password, import, backup/restore, dump/load, clustering)
- cypher-shell
- Neo4j Debian/APT repository
- Ubuntu / systemd
- Neo4j HTTP and Bolt APIs

## Sources Consulted
- Neo4j Debian Packages repository — https://debian.neo4j.com/ (valid repo components; edition chosen by package name)
- Debian-based installation, Operations Manual — https://neo4j.com/docs/operations-manual/current/installation/linux/debian/
- Clustering settings reference — https://neo4j.com/docs/operations-manual/current/clustering/settings/
- Deploy a basic cluster — https://neo4j.com/docs/operations-manual/current/clustering/setup/deploy/
- Cluster server discovery — https://neo4j.com/docs/operations-manual/current/clustering/setup/discovery/
- Restore a database dump — https://neo4j.com/docs/operations-manual/current/backup-restore/restore-dump/
- Restore a database backup — https://neo4j.com/docs/operations-manual/current/backup-restore/restore-backup/
- Dump and load a Neo4j database (offline) — https://neo4j.com/docs/operations-manual/current/docker/dump-load/

## Issues Found

1. **Enterprise repository line used an invalid component (`stable enterprise`).**
   The Neo4j Debian repository's third field is a version line (`latest`, `5`, `4.4`, etc.), not an edition. There is no `enterprise` component — both editions are served from the same repository and the edition is selected by the package name (`neo4j` vs `neo4j-enterprise`). Changed the line to `https://debian.neo4j.com stable latest` and added a comment clarifying that the edition is chosen by the package name. As written, `stable enterprise` would have produced an apt repository with no usable package list.

2. **`neo4j-admin database load --from-path` pointed at the `.dump` file instead of its directory.**
   In Neo4j 5.x, `--from-path` for `database load` must be a directory; the command derives the artifact name from the positional database argument (`neo4j` → `neo4j.dump`). Changed `--from-path=/backups/neo4j.dump neo4j` to `--from-path=/backups neo4j` and added a clarifying comment. The original would have failed to locate the dump.

3. **`neo4j-admin database restore` used a non-existent `--database=` flag.**
   In Neo4j 5.x the database name is a positional argument, not a flag. Changed `--from-path=/backups/neo4j-2024-01-15 --database=neo4j` to `--from-path=/backups/neo4j-2024-01-15 neo4j`.

4. **Clustering section used removed Neo4j 4.x syntax.**
   The post targets Neo4j 5.x throughout (Java 17, `server.*` config namespace, 5.x `neo4j-admin database ...` commands), but the clustering block used the retired 4.x "Causal Clustering" settings: `dbms.mode=CORE` and the `causal_clustering.*` family (`initial_discovery_members`, `discovery_listen_address`, `transaction_listen_address`, `raft_listen_address`). These do not exist in Neo4j 5.x. Replaced them with the current 5.x settings drawn from the official "Deploy a basic cluster" example: `server.default_listen_address`, `server.default_advertised_address`, `dbms.cluster.endpoints`, `initial.dbms.default_primaries_count`, `server.cluster.listen_address`, and `server.cluster.raft.listen_address`. Also renamed the sub-heading from "Causal Clustering Configuration" to "Cluster Configuration" to match current terminology.

## Review Notes
- The bulk of the post is accurate for Neo4j 5.x: the APT/GPG repository setup, `neo4j-admin dbms set-initial-password`, the `server.*` configuration namespace (network, memory, SSL), Browser access on port 7474, Bolt on 7687, Cypher CRUD/aggregation/index/constraint syntax (`CREATE CONSTRAINT ... REQUIRE ... IS UNIQUE`, `IS NODE KEY`, `IS NOT NULL`, `CREATE FULLTEXT INDEX`), `LOAD CSV`, `neo4j-admin database import full`, offline backup, user/role management Cypher, and the HTTP transactional endpoint health check were all verified as correct and current.
- `CALL dbms.listQueries()` and `CALL dbms.killQuery()` still function in Neo4j 5.x but are deprecated in favour of `SHOW TRANSACTIONS` and `TERMINATE TRANSACTIONS`. Left as-is since they remain valid, but worth modernizing in a future revision.
- `CALL dbms.queryJmx(...)` and `CALL dbms.components()` remain valid in 5.x.
- Config values such as `db.logs.query.enabled=VERBOSE`, `db.logs.query.threshold`, and `db.tx_log.rotation.retention_policy` are correct 5.x setting names.
- Version caveat: the post pins to Neo4j 5.x; if the reader installs via `stable latest`, a future Neo4j 2025.x / major release could introduce further setting renames, so the `server.*`/`dbms.cluster.*` names should be re-verified against the installed version.

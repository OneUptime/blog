# Validation Summary: How to Set Up Database Backups with Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (Docker container management UI)
- Docker / Docker Compose (Compose file format v3.8)
- PostgreSQL (`pg_dump`, `pg_restore`, custom format)
- MySQL (`mysqldump`)
- MongoDB (`mongodump`)
- `prodrigestivill/postgres-backup-local` Docker image
- `fradelg/mysql-cron-backup` Docker image
- AWS S3 / AWS CLI (offsite storage)
- Bash, cron, Ubuntu 22.04 base image

## Sources Consulted
- `prodrigestivill/postgres-backup-local` image docs / env vars: https://github.com/prodrigestivill/docker-postgres-backup-local
- `fradelg/mysql-cron-backup` image docs / env vars: https://github.com/fradelg/docker-mysql-cron-backup
- PostgreSQL `pg_dump` documentation (--format=custom, --blobs, --no-password): https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore` documentation (stdin input behavior): https://www.postgresql.org/docs/current/app-pgrestore.html
- MySQL `mysqldump` documentation (--single-transaction, --routines, --triggers, --events): https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools install on Ubuntu 22.04: https://www.mongodb.com/docs/database-tools/installation/installation-linux/
- Ubuntu 22.04 (Jammy) package availability: confirmed `mongodb-clients` is not in jammy main/universe (removed after focal due to MongoDB SSPL licensing)
- AWS CLI `s3 cp` and `--storage-class` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Bash manual on `&&` operator and line continuation: https://www.gnu.org/software/bash/manual/bash.html#Lists-of-Commands

## Issues Found

1. **`mongodb-clients` package does not exist on Ubuntu 22.04.**
   - The Step 4 docker-compose `entrypoint` ran `apt-get install -y ... mongodb-clients ...` against the `ubuntu:22.04` base image. The `mongodb-clients` package was removed from Ubuntu's repos after Focal (20.04) — MongoDB Inc. distributes server/tools only through their own APT repo since the SSPL relicensing. On Jammy this `apt-get install` would fail with "E: Unable to locate package mongodb-clients", breaking the whole entrypoint and preventing `mongodump` from being available.
   - Fix: replaced the single `apt-get install` line with the standard MongoDB Database Tools install procedure for Ubuntu 22.04 — install `gnupg`/`curl`/`ca-certificates`, fetch and dearmor the `pgp.mongodb.com/server-7.0.asc` signing key into `/usr/share/keyrings/`, add the `repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse` source pinned with `signed-by=`, then install `mongodb-database-tools` (which provides `mongodump`/`mongorestore`).

2. **Broken `&&` line-continuation in the `bash -c "..."` entrypoint.**
   - The original entrypoint placed `&&` at the START of subsequent lines:
     ```
       cron \
     && cp /scripts/backup.sh /etc/cron.daily/db-backup
     && chmod +x /etc/cron.daily/db-backup
     && cron -f
     ```
     After the YAML folded scalar (`>`) preserves the newlines (more-indented lines in `>` keep their line breaks per the YAML 1.2 spec), bash receives a multi-line script where lines 2/3/4 begin with `&&`. Bash treats an unescaped newline as a command terminator, so the previous command completes at end of line 1, and `&&` at the start of line 2 becomes `syntax error near unexpected token \`&&'`. Only the first `apt-get` line plus the joined `cp` (joined via the `\` continuation on the `cron` line) would have run — `chmod +x` and `cron -f` would never execute.
   - Fix: moved `&&` to the END of each command line (`cmd1 &&\n cmd2 &&\n cmd3 ...`). A newline is permitted after `&&` because the operator's right-hand-side requires another command, so bash keeps reading. This both avoids the syntax error and makes the dependency between steps explicit.

## Review Notes

- **`pg_dump --blobs` is deprecated in PostgreSQL 16+** in favour of `--large-objects`. The deprecated alias still works in PG 17, so the code is not broken — left as-is to avoid extending the scope of the fix. Readers running PG 18+ should switch to `--large-objects`.
- **`pg_dump --blobs` is also redundant** with `--format=custom`: large objects have been included by default since PostgreSQL 9.0; the explicit flag changes nothing.
- **`.sql.gz` filename is misleading for a `--format=custom` dump.** `--format=custom` produces a binary archive (already zlib-compressed internally at level 6), not SQL text. Wrapping it in gzip yields negligible additional compression and a `.sql.gz` extension that suggests a plain-SQL dump. A more accurate name would be `.dump` or `.dump.gz`. Step 5's `zcat "$LATEST_PG" | pg_restore -d "$TEST_DB"` works correctly because `pg_restore` reads custom-format from stdin when no input file is given — but if a reader sees `.sql.gz` and tries `zcat … | psql` instead, it will fail. Not a hard error, just a naming / discoverability concern.
- **`pg_dump --no-password` only disables the prompt, it does not supply credentials.** The script relies on the reader having configured `PGPASSWORD`, a `.pgpass` file, or `trust`/peer auth inside the container — none of which is set up explicitly in the post. In practice with the postgres official image's default `local` peer/trust config this often "just works" when invoked via `docker exec` as the postgres OS user, but it is environment-dependent.
- **MongoDB backup leaves `/tmp/mongo_backup_$DATE` inside the database container.** The `docker cp` only copies out; nothing cleans up the source path inside the Mongo container, so repeated runs accumulate orphan dump dirs. A `docker exec "$CONTAINER" rm -rf "/tmp/mongo_backup_$DATE"` after the `docker cp` would close that leak.
- **Custom-format dumps don't actually need gzip.** The `pg_dump --format=custom | gzip` pipeline pays the CPU cost of double-compression for very little size win because custom-format already runs zlib at level 6. For larger DBs, dropping the gzip step (or switching to `--format=plain | gzip`) reduces backup time.
- **`MAX_BACKUPS=30` with `CRON_TIME=0 2 * * *`** in `fradelg/mysql-cron-backup` is daily-count, not days-count — daily runs make these effectively equivalent, but the inline comment `# Keep 30 days` would be misleading if someone changed `CRON_TIME` to e.g. hourly.
- **Using `ubuntu:22.04` and running `apt-get update && apt-get install -y …` from the `entrypoint`** repeats the install on every container start, which is slow and pulls fresh package versions each time (reproducibility risk). For production, baking the same steps into a small `Dockerfile` and pushing the resulting image would be cleaner. Out of scope for a technical-correctness fix.

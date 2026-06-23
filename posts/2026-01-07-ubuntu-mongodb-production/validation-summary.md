# Validation Summary: How to Install and Secure MongoDB for Production on Ubuntu

## Status
validated

## Post Type
Tutorial / production deployment guide

## Technologies Covered
- Ubuntu Linux
- MongoDB Community Server 7.0
- MongoDB replica sets
- MongoDB authentication and RBAC
- MongoDB TLS configuration
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- UFW and iptables
- systemd and cron
- Prometheus, Grafana, and Percona MongoDB Exporter
- Bash scripting

## Sources Consulted
- MongoDB official Ubuntu installation guide for MongoDB 7.0: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB official Ubuntu installation guide for MongoDB 8.0: https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB self-managed configuration options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB TLS/SSL configuration guide: https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- MongoDB Transparent Huge Pages guidance: https://www.mongodb.com/docs/manual/tutorial/disable-transparent-huge-pages/
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB replica set architecture and arbiter guidance: https://www.mongodb.com/docs/manual/core/replica-set-architecture-three-members/ and https://www.mongodb.com/docs/manual/core/replica-set-architectures/
- Percona MongoDB Exporter README and releases: https://github.com/percona/mongodb_exporter

## Issues Found
- MongoDB 7.0 was described as supporting Ubuntu 24.04. Updated the prerequisites and comments to state that MongoDB 7.0 supports Ubuntu 20.04 and 22.04, and that Ubuntu 24.04 should use the MongoDB 8.0 repository.
- The limits configuration used `mongod` as the account name, but MongoDB's Ubuntu packages run as the `mongodb` user. Updated the limits entries to target `mongodb`.
- The package list named `mongodb-org-shell`, which is no longer the package name for `mongosh`. Updated it to `mongodb-mongosh` and clarified `mongodb-org-tools`.
- The architecture section implied a three data-bearing member replica set plus an arbiter as typical. Updated the wording to recommend three data-bearing members and use an arbiter only when a third data-bearing member cannot be deployed.
- The replica set keyfile command wrote into `/etc/mongodb` before ensuring the directory existed. Added `sudo mkdir -p /etc/mongodb`.
- The TLS section appended a second top-level `net:` block to `mongod.conf`, which would produce an invalid or overridden configuration. Replaced it with a YAML snippet showing TLS nested under the existing `net:` section.
- The TLS example referenced a CA file path that would not exist after the preceding self-signed certificate commands. Updated the example to create `ca.crt` from the self-signed test certificate and note that production should use the real CA certificate.
- The backup script used `set -euo pipefail` while checking `$?` after commands that would already exit the script on failure. Reworked the `mongodump` and S3 upload commands into `if` statements so the intended alert paths can run.
- The restore script used `$1` with `set -u`, causing an unbound variable error when no argument was supplied. Changed it to `${1:-}` and added a cleanup trap.
- The MongoDB Exporter example claimed to download the latest release but used v0.40.0. Updated it to v0.51.0, the latest GitHub release found during review.
- The maintenance script dropped `admin.system.profile` instead of the profiling collections for application databases. Updated it to iterate non-system databases and skip databases where profiling is enabled.
- The troubleshooting profiler example authenticated to `admin` and then profiled `admin`. Added `use myapp` before enabling profiling and reading `system.profile`.

## Review Notes
- The guide remains MongoDB 7.0-oriented. For new Ubuntu 24.04 deployments, the installation section should be expanded in a future revision with separate MongoDB 8.0 commands rather than mixing release lines.
- The TLS test command assumes a client certificate exists at `/etc/mongodb/ssl/client.pem`; the article now notes that this must be issued by the CA when client certificate validation is enabled.

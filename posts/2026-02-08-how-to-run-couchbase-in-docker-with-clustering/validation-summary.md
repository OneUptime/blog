# Validation Summary: How to Run Couchbase in Docker with Clustering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Couchbase Server Community Edition 7.2
- Couchbase CLI
- Couchbase SQL++ / N1QL
- Couchbase scopes and collections
- Couchbase backup tooling
- Couchbase Node.js SDK

## Sources Consulted
- Couchbase Server Docker installation documentation: https://docs.couchbase.com/server/current/install/getting-started-docker.html
- Couchbase Server ports documentation: https://docs.couchbase.com/server/current/install/install-ports.html
- Couchbase CLI `cluster-init` reference: https://docs.couchbase.com/server/7.2/cli/cbcli/couchbase-cli-cluster-init.html
- Couchbase CLI `node-init` reference: https://docs.couchbase.com/server/current/cli/cbcli/couchbase-cli-node-init.html
- Couchbase CLI `server-add` reference: https://docs.couchbase.com/server/current/cli/cbcli/couchbase-cli-server-add.html
- Couchbase bucket creation documentation: https://docs.couchbase.com/server/7.2/manage/manage-buckets/create-bucket.html
- Couchbase scopes and collections documentation: https://docs.couchbase.com/server/7.2/manage/manage-scopes-and-collections/manage-scopes-and-collections.html
- Couchbase SQL++ language reference: https://docs.couchbase.com/server/7.2/n1ql/n1ql-language-reference/index.html
- Couchbase SQL++ INSERT reference: https://docs.couchbase.com/server/7.2/n1ql/n1ql-language-reference/insert.html
- Couchbase SQL++ CREATE PRIMARY INDEX reference: https://docs.couchbase.com/server/7.2/n1ql/n1ql-language-reference/createprimaryindex.html
- Couchbase `cbq` documentation: https://docs.couchbase.com/server/7.2/tools/tools-ref.html
- Couchbase `cbbackupmgr` documentation: https://docs.couchbase.com/server/7.2/backup-restore/cbbackupmgr.html
- Couchbase `cbbackupmgr config` reference: https://docs.couchbase.com/server/7.2/backup-restore/cbbackupmgr-config.html
- Couchbase `cbbackupmgr backup` reference: https://docs.couchbase.com/server/7.2/backup-restore/cbbackupmgr-backup.html
- Couchbase `cbbackupmgr info` reference: https://docs.couchbase.com/server/current/backup-restore/cbbackupmgr-info.html
- Couchbase Node.js SDK connection documentation: https://docs.couchbase.com/nodejs-sdk/current/howtos/managing-connections.html
- Couchbase Node.js SDK query example: https://docs.couchbase.com/nodejs-sdk/current/hello-world/overview.html
- Docker Hub Couchbase Server image listing: https://hub.docker.com/r/couchbase/server

## Issues Found
- The Docker image name used `couchbase:community-7.2.0`. Changed it to `couchbase/server:community-7.2.0`, matching Couchbase's documented Docker image repository for this version.
- The multi-node setup added servers with `--server-add cb-node2:8091` and `--server-add cb-node3:8091`. In Couchbase Server 7.1 and later, node addition occurs over a secure connection. Changed these to `https://cb-node2:18091` and `https://cb-node3:18091`.
- The multi-node setup initialized additional nodes without assigning stable node hostnames. Added `--node-init-hostname` for all three nodes so the cluster advertises Docker-network hostnames consistently.
- The query section described N1QL as the current name. Updated it to SQL++ and noted that N1QL is the former name, matching Couchbase 7.2 documentation.
- The `cbq` command relied on `cbq` being on `PATH` and used the short endpoint option. Updated it to call `/opt/couchbase/bin/cbq` with the documented `-engine` option.
- The backup section used `cbbackupmgr list`, which is not a documented `cbbackupmgr` subcommand. Changed it to `cbbackupmgr info --all`.
- The Node.js SDK example connected to `couchbase://localhost` while the preceding cluster advertises Docker-network node names. Changed the text and connection string to target an application running on the same Docker network with `couchbase://cb-node1`.

## Review Notes
- Docker Compose `deploy.resources` is commonly associated with orchestration-style resource declarations; users may still need to verify memory enforcement in their local Docker Compose version.
- Exposing only the first Couchbase node is fine for the web console examples, but SDK clients running on the host need Couchbase alternate addresses or externally reachable mappings for every advertised node.

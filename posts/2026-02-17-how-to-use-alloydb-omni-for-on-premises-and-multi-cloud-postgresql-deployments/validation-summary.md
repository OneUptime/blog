# Validation Summary: How to Use AlloyDB Omni for On-Premises and Multi-Cloud PostgreSQL Deployments

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud AlloyDB Omni
- PostgreSQL
- Docker
- Kubernetes
- AWS EC2
- pgBackRest
- PostgreSQL backup, WAL archiving, and monitoring SQL

## Sources Consulted
- Google Cloud AlloyDB Omni install guide: https://cloud.google.com/alloydb/omni/docs/get-started
- Google Cloud AlloyDB Omni installation customization: https://docs.cloud.google.com/alloydb/omni/containers/current/docs/install
- Google Cloud AlloyDB Omni Kubernetes deployment guide: https://docs.cloud.google.com/alloydb/omni/kubernetes/current/docs/deploy-kubernetes
- Google Cloud AlloyDB Omni Kubernetes run/connect guide: https://docs.cloud.google.com/alloydb/omni/current/docs/run-connect
- Google Cloud AlloyDB Omni columnar engine overview: https://docs.cloud.google.com/alloydb/omni/kubernetes/current/docs/columnar-engine/overview
- Google Cloud AlloyDB Omni columnar engine configuration: https://docs.cloud.google.com/alloydb/omni/containers/current/docs/columnar-engine/configure
- Google Cloud AlloyDB Omni backup overview: https://docs.cloud.google.com/alloydb/omni/containers/current/docs/backup-overview
- Google Cloud AlloyDB Omni pgBackRest setup: https://cloud.google.com/alloydb/omni/docs/set-up-pgbackrest
- PostgreSQL documentation for ALTER SYSTEM, pg_dump, pg_restore, pg_stat_database, and pg_stat_activity: https://www.postgresql.org/docs/
- Kubernetes documentation for Secrets, custom resources, kubectl apply, and kubectl exec: https://kubernetes.io/docs/
- Docker CLI documentation for docker run, docker exec, docker cp, and restart policies: https://docs.docker.com/reference/cli/docker/
- AWS CLI EC2 run-instances documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html

## Issues Found
- The Docker example used an undocumented `PG_DATABASE` environment variable and then connected to `myapp`. Removed that variable and added an explicit `createdb` command before connecting.
- The Docker password comment referred to `PG_PASSWORD`, but the documented environment variable is `POSTGRES_PASSWORD`. Updated the comment.
- The version verification example hard-coded PostgreSQL 15.x. Replaced it with a major-version placeholder because AlloyDB Omni follows PostgreSQL versioned releases and the latest supported version changes.
- The Kubernetes example used a raw `Deployment`, `PVC`, and `Service` for production. Replaced it with the documented AlloyDB Omni operator `DBCluster` custom resource pattern and matching password Secret.
- The Kubernetes connection command targeted `deploy/alloydb-omni`, which does not apply to operator-managed DBCluster deployments. Replaced it with the documented pod selector and `kubectl exec -c database` pattern.
- The columnar engine example used undocumented container environment variables and the wrong memory flag, `google_columnar_engine.memory_size_in_bytes`. Replaced it with DBCluster `parameters` and `google_columnar_engine.memory_size_in_mb`.
- The columnar engine SQL example used `pg_reload_conf()`, but enabling the columnar engine and memory-size changes require a restart. Updated the instructions to restart the container.
- The AWS EC2 Docker example mounted `/data/alloydb` without creating it first. Added `sudo mkdir -p /data/alloydb`.
- The backup section used `pg_basebackup`, while Google recommends pgBackRest for single-server AlloyDB Omni container deployments. Replaced the example with pgBackRest backup commands and noted that the one-time pgBackRest setup and stanza creation must be completed first.
- The WAL archiving example used a local `cp` archive command without the documented pgBackRest archive command. Updated it to use `pgbackrest archive-push` and added `max_wal_senders`.

## Review Notes
The post is technically relevant and salvageable. The revised Kubernetes section assumes the AlloyDB Omni operator is already installed; a future expansion could show the Helm or OLM operator installation steps, but that would be a larger tutorial addition rather than a correctness fix.

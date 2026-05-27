# Validation Summary: How to Set Up AlloyDB Omni for Running AlloyDB On-Premises

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB Omni
- PostgreSQL
- Docker
- Kubernetes
- Helm
- pgBackRest
- pg_dump

## Sources Consulted
- Google Cloud AlloyDB Omni install guide: https://cloud.google.com/alloydb/omni/docs/get-started
- Google Cloud AlloyDB Omni container customization guide: https://docs.cloud.google.com/alloydb/omni/containers/current/docs/install
- Google Cloud AlloyDB Omni columnar engine configuration: https://docs.cloud.google.com/alloydb/omni/containers/current/docs/columnar-engine/configure
- Google Cloud AlloyDB Omni columnar engine flags reference: https://docs.cloud.google.com/alloydb/omni/containers/15.7.1/docs/reference/columnar-engine-flags
- Google Cloud AlloyDB Omni Kubernetes installation guide: https://docs.cloud.google.com/alloydb/omni/kubernetes/current/docs/deploy-kubernetes
- Google Cloud AlloyDB Omni database parameters guide: https://docs.cloud.google.com/alloydb/omni/containers/current/docs/configure-database-flags
- Google Cloud AlloyDB Omni backup overview: https://cloud.google.com/alloydb/omni/containers/current/docs/backup-overview
- Google Cloud AlloyDB Omni pgBackRest setup guide: https://docs.cloud.google.com/alloydb/omni/current/docs/set-up-pgbackrest
- Docker image manifest checks for `google/alloydbomni:17.5.0`, `google/alloydbomni:16.8.0`, and `google/alloydbomni:latest`

## Issues Found
- The post used the old/non-documented image path `gcr.io/alloydb-omni/pg-service`. Updated Docker examples to use the documented `google/alloydbomni` image and verified the referenced tags exist.
- The prerequisites omitted current documented requirements for Linux kernel version, cgroups v2, AVX2-capable CPU, and minimum disk/RAM guidance. Updated the prerequisite list.
- The Docker examples included `PGDATA` and `--restart unless-stopped`, while Google examples use the default data path and `--restart=always`. Updated commands and flag explanations to match the documented install/customization flow.
- The columnar engine example used `google_columnar_engine.memory_size_percentage`, which is not the documented AlloyDB Omni container flag. Replaced it with `google_columnar_engine.memory_size_in_mb` and changed the reload step to a container restart because these columnar settings require restart.
- The production configuration mounted a custom file over `postgresql.auto.conf`, which can conflict with PostgreSQL's `ALTER SYSTEM` file. Changed the example to append settings to `postgresql.conf` in the mounted data directory and restart the container.
- The Kubernetes example used a raw StatefulSet with the obsolete image path. Replaced it with the documented AlloyDB Omni operator install command and a `DBCluster` custom resource manifest.
- The physical backup example used `pg_basebackup` directly. Replaced it with Google-recommended pgBackRest guidance for physical backups and retained `pg_dump` for logical database backups.
- The upgrade commands used the obsolete image path and older restart policy. Updated them to use `google/alloydbomni:NEW_VERSION` and `--restart=always`.

## Review Notes
The guide is now technically valid as a practical overview. For a production-grade follow-up, the backup section should include the full pgBackRest stanza and backup-volume setup before the backup command, and the Kubernetes section could add connection details after the `DBCluster` is created.

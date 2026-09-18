# Validation Summary: CloudNativePG Backup Succeeds but Restore Fails: Check WAL and Backup Layout

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands and a Kubernetes configuration fragment.

## Technologies Covered

- CloudNativePG 1.30
- Barman Cloud CNPG-I plugin 0.15.0
- Barman Cloud CLI 3.20.0
- PostgreSQL physical backups, WAL archiving, timelines, and point-in-time recovery
- Kubernetes custom resources, kubectl, and JSONPath
- S3-compatible object storage, AWS KMS, and archive storage tiers

## Sources Consulted

- [CloudNativePG 1.30 recovery documentation](https://cloudnative-pg.io/docs/1.30/recovery/) — recovery bootstrap, backup selection, recovery targets, and fresh-cluster recovery. Retrieved directly with curl after the web reader failed to load the page.
- [Barman Cloud plugin usage](https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/) — external cluster configuration, ObjectStore references, and separate recovery and archiving configuration.
- [Barman Cloud plugin parameters](https://cloudnative-pg.io/plugin-barman-cloud/docs/parameters/) — barmanObjectName, serverName, and the compatibility-only ObjectStore field; documentation displays version 0.15.0.
- [Barman Cloud plugin troubleshooting](https://cloudnative-pg.io/plugin-barman-cloud/docs/troubleshooting/) — Backup inspection, plugin sidecar logs, previous-container logs, and restore failure diagnosis.
- [Barman 3.20.0 cloud command reference](https://docs.pgbarman.org/release/3.20.0/user_guide/barman_cloud.html#barman-cloud-backup-list) — backup-list arguments, JSON output, endpoint override, and object-store permissions.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource queries, namespace, output, selectors, and sorting.
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) — resource inspection syntax.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — all-container and previous-container options.
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) — array selection and quoted newline output.
- [PostgreSQL continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html) — WAL continuity, base-backup recovery boundaries, timelines, and expected missing-file requests.
- [PostgreSQL pg_stat_archiver documentation](https://www.postgresql.org/docs/current/monitoring-stats.html#PG-STAT-ARCHIVER-VIEW) — archive statistics and limitations of using the latest archived WAL as evidence of continuity.
- [Amazon S3 archived-object restoration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects.html) — retrieval requirements for offline archive tiers.

## Issues Found

No technical issues found.

## Review Notes

- The README was left unchanged. Its commands and YAML fragment match the documented interfaces. The fragment is explicitly partial and requires an existing ObjectStore and a complete Cluster manifest; example names and storage paths must be replaced for the actual environment.
- Confirmed that recovery source aliases, ObjectStore names, and archived server names represent different identifiers. Recovery reads and subsequent WAL archive writes have separate plugin configuration paths.
- Confirmed that timestamp and LSN targets allow automatic selection of the nearest backup completed before the target. Explicit backup selection does not permit recovery to an earlier state than that backup supports.
- The distinction between a completed backup operation and a tested restore is sound. Catalog access alone does not establish access to every data object, continuous WAL, or decryption capability. S3 listing, downloads, uploads, and KMS decryption use distinct permissions.
- PostgreSQL can legitimately request absent archive files at the end of recovery. Missing WAL required for consistency or an explicit target remains a failure. Current archive statistics cannot establish that every older segment is available.
- Plugin documentation is unversioned at the linked URLs and can change. The displayed version matched the post during review; recording deployed operator, plugin, and Barman versions remains appropriate.
- Validation was based on official documentation and static inspection. No live Kubernetes cluster, backup archive, or credentials were supplied, so no actual restore or authenticated CLI execution was performed.

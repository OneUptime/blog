# Validation Summary: How to Migrate Workloads Between Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Velero
- Velero File System Backup
- Argo CD
- Submariner
- Istio VirtualService
- PostgreSQL pg_dump, pg_restore, and pg_basebackup
- jq and yq

## Sources Consulted
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Velero File System Backup: https://velero.io/docs/main/file-system-backup/
- Velero Backup API type: https://velero.io/docs/main/api-types/backup/
- Velero AWS plugin compatibility: https://github.com/velero-io/velero-plugin-for-aws
- Argo CD app create command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Submariner getting started: https://submariner.io/getting-started/
- Submariner subctl deployment reference: https://submariner.io/operations/deployment/subctl/
- Submariner usage guide: https://submariner.io/operations/usage/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL backup and restore overview: https://www.postgresql.org/docs/current/backup.html

## Issues Found
- The post described live migration and streaming database migration as "zero downtime." I changed those references to "near-zero downtime" because the examples use dual deployment, traffic shifting, and database cutover patterns that can minimize downtime but do not guarantee true zero downtime for every workload.
- The Ingress annotation jq filter could fail on Ingress objects without annotations. I changed it to use `(.metadata.annotations // {})` before calling `keys[]`.
- The Velero examples used the deprecated Restic naming and fields. I changed the cross-cloud example to Velero File System Backup terminology, `defaultVolumesToFsBackup`, and `--default-volumes-to-fs-backup`.
- The Velero installation examples did not install the node-agent required for File System Backup. I added `--use-node-agent` to both source and destination installs.
- The Velero AWS plugin example used an old plugin version. I updated it to a newer compatible example version, `velero/velero-plugin-for-aws:v1.12.0`.
- The Submariner example used raw `Broker` and `Submariner` manifests that do not match the documented recommended deployment workflow. I replaced it with `subctl deploy-broker`, `subctl join`, and `subctl verify` commands.
- The Istio VirtualService example used `networking.istio.io/v1beta1`. I updated it to the current stable `networking.istio.io/v1` API version.

## Review Notes
The remaining examples are illustrative and assume supporting infrastructure exists, such as valid kubeconfig contexts, DNS or service discovery for cross-cluster service names, destination namespaces, storage classes, credentials, and PostgreSQL replication permissions. For production migrations, the database examples should be expanded with explicit promotion, write freeze, and application cutover steps.

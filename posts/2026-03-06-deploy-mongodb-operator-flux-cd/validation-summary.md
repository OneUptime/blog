# Validation Summary: How to Deploy MongoDB Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm
- Percona Operator for MongoDB
- Percona Server for MongoDB
- Percona Backup for MongoDB
- MongoDB replica sets
- Amazon S3-compatible backup storage

## Sources Consulted
- Percona Operator for MongoDB system users documentation: https://docs.percona.com/percona-operator-for-mongodb/system-users.html
- Percona Operator for MongoDB custom resource options: https://docs.percona.com/percona-operator-for-mongodb/operator.html
- Percona Operator for MongoDB versions compatibility: https://docs.percona.com/percona-operator-for-mongodb/versions.html
- Percona Operator for MongoDB 1.22.0 release notes: https://docs.percona.com/percona-operator-for-mongodb/RN/Kubernetes-Operator-for-PSMONGODB-RN1.22.0.html
- Percona Operator for MongoDB Kubernetes installation guide: https://docs.percona.com/percona-operator-for-mongodb/kubernetes.html
- Percona Operator for MongoDB backup and restore documentation: https://docs.percona.com/percona-operator-for-mongodb/backups.html
- Percona Helm chart repository index: https://percona.github.io/percona-helm-charts/
- Percona Operator for MongoDB v1.22.0 example CR and secrets manifests: https://github.com/percona/percona-server-mongodb-operator/tree/v1.22.0/deploy
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The prerequisites listed Kubernetes v1.25 or later, which is not accurate for the documented Percona Operator versions. Updated the prerequisite to reference the Kubernetes versions tested for Percona Operator 1.22.0.
- The examples used older Percona Operator 1.16-era versions. Updated the Helm chart, `crVersion`, Percona Server for MongoDB image, backup image, PMM client image, and client image to current 1.22.0-compatible examples.
- The credentials Secret comment incorrectly described the system users Secret as the MongoDB internal authentication key. Updated the comment to reflect that the Secret defines Operator-managed MongoDB system users.
- The Kustomize resource list omitted `cluster.yaml`, so the MongoDB cluster manifest from Step 5 would not be applied. Added `cluster.yaml` to the Kustomization.
- `backup.yaml` repeated the same `PerconaServerMongoDB` resource instead of showing a single cluster resource with backup configuration, which could lead to duplicate or confusing manifests. Changed `backup.yaml` to contain only S3 credentials and showed the backup block as configuration to add under `spec` in `cluster.yaml`.
- The scheduled backup examples used the deprecated `keep` field. Replaced it with the current `retention` subsection.
- The S3 example included `endpointUrl` for AWS S3, but Percona documents it as unnecessary for original Amazon S3 and required for S3-compatible alternatives such as MinIO. Removed it from the AWS S3 example.
- The backup storage example did not mark a main storage, which is now part of the current multi-storage backup configuration model. Added `main: true` to the storage.
- The cluster manifest included `mongod: {}` with a comment saying it exposed MongoDB, but exposure is controlled through Service objects and replica set expose options, not that empty field. Removed it.
- The connection example used an older image and a non-SRV URI with the `userAdmin` system user. Updated it to use the current image, `databaseAdmin`, and the Operator-documented replica set SRV connection format.

## Review Notes
The post is now aligned with the current Percona Operator for MongoDB 1.22.0 documentation and Flux HelmRelease API. The tutorial still uses placeholder credentials and a placeholder storage class; readers should replace these for their own cluster and secret-management workflow.

# Validation Summary: How to Use the Percona Operator for MongoDB on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Percona Operator for MongoDB (PSMDB Operator)
- Percona Server for MongoDB
- Percona Backup for MongoDB (PBM)
- Kubernetes
- Helm 3
- kubectl
- Amazon S3 (for backups)

## Sources Consulted
- Percona Operator for MongoDB official documentation: https://docs.percona.com/percona-operator-for-mongodb/
- Percona Operator GitHub repository (deploy/secrets.yaml, deploy/cr.yaml): https://github.com/percona/percona-server-mongodb-operator
- Percona Helm Charts repository: https://github.com/percona/percona-helm-charts
- Docker Hub for image tag verification: percona/percona-server-mongodb and percona/percona-backup-mongodb

## Issues Found
1. **Missing system user secret keys**: The credentials secret in Step 2 was missing `MONGODB_DATABASE_ADMIN_USER` and `MONGODB_DATABASE_ADMIN_PASSWORD`, which are part of the standard set of system users defined in the official `deploy/secrets.yaml`. Added both keys to the secret creation command.

## Review Notes
- The `crVersion: 1.15.0` is paired with `percona/percona-server-mongodb:7.0.8-5`, but v1.15.0 shipped with MongoDB 6.0.9-7 as the default. Using 7.0.8-5 is valid but is not the default pairing for that operator version. This is not incorrect but could be noted for clarity.
- The backup tasks `keep` field is correct for crVersion 1.15.0. Newer operator versions (v1.17+) replaced `keep` with a `retention` object. If the post is updated to a newer crVersion in the future, the backup task config would need updating.
- The scaling approach using `kubectl patch` on the CR works correctly, though the official docs recommend editing and applying the CR YAML with `kubectl apply`. Both approaches are valid since they modify the custom resource (not the StatefulSet directly).
- All Helm chart names, repo URLs, API versions, CRD kinds, kubectl shortnames, and S3 credential key names were verified as correct.

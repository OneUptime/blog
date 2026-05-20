# Validation Summary: How to Deploy MongoDB with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments, StatefulSets, Services, Secrets, ConfigMaps, PersistentVolumeClaims, Jobs, and CronJobs
- MongoDB 7.0
- MongoDB replica sets
- MongoDB Controllers for Kubernetes
- Percona MongoDB Exporter
- MongoDB Database Tools
- AWS CLI / S3 backup upload

## Sources Consulted
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases, hooks, and waves: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- MongoDB official Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB `mongod` command documentation: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Database Tools `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Controllers for Kubernetes documentation: https://www.mongodb.com/docs/kubernetes/current/
- MongoDB Controllers for Kubernetes GitHub repository: https://github.com/mongodb/mongodb-kubernetes
- Deprecated MongoDB Community Kubernetes Operator repository: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Helm chart listing for `mongodb-kubernetes`: https://artifacthub.io/packages/helm/mongodb-helm-charts/mongodb-kubernetes
- Percona MongoDB Exporter documentation: https://github.com/percona/mongodb_exporter

## Issues Found
- The post described the MongoDB Community Operator as the current production operator and claimed backup support. The old Community Operator repository is deprecated/archived, and the current MongoDB Controllers for Kubernetes project supports MongoDB Community replica sets, user management, custom roles, and Prometheus integration, while backup integration is an Enterprise/Ops Manager capability. Updated the wording and Helm chart example to use `mongodb-kubernetes` chart version `1.8.0`.
- The standalone MongoDB Deployment mounted `mongod.conf` but did not pass it to `mongod`, so the configuration would be ignored. Added container args to start MongoDB with `--config /etc/mongod.conf` while preserving the official image entrypoint.
- The replica set StatefulSet used `command: mongod`, which bypasses the official MongoDB image entrypoint and prevents `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` initialization behavior from running correctly. Changed it to container args so the entrypoint remains active.
- The replica set snippets referenced Secret keys named `username` and `password`, but the earlier Secret defines `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`. Updated the references consistently.
- The replica set initialization hook was not idempotent and could fail on later Argo CD syncs after the replica set was already initialized. Wrapped `rs.initiate()` in a `try` / `catch` around `rs.status()`.
- The backup CronJob used `mongo:7.0` while running both `mongodump` and `aws s3 cp`; the official MongoDB image is not an AWS CLI image. Updated the example to call out a custom image that includes MongoDB Database Tools and the AWS CLI.
- The connection Secret defined the same `MONGODB_URI` key twice, which is ambiguous and invalid in strict YAML processing. Changed the standalone URI to a commented alternative and left one active key.

## Review Notes
- The YAML snippets parse successfully after edits.
- The examples still use placeholder values such as `fast-ssd`, `myorg/mongodb-database-tools-awscli:7.0`, and sample credentials. These are acceptable for a tutorial but should be replaced with environment-specific storage classes, image names, and externally managed secrets in production.

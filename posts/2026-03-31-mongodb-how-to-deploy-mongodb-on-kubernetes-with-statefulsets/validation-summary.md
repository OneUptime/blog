# Validation Summary: How to Deploy MongoDB on Kubernetes with StatefulSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Kubernetes StatefulSets
- Kubernetes Services (Headless and ClusterIP)
- PersistentVolumeClaims
- MongoDB Replica Sets
- mongosh

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Official MongoDB Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB replica set configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- Kubernetes container command/args behavior: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
1. **StatefulSet used `command` instead of `args` (Critical):** The StatefulSet spec used `command` to invoke `mongod` directly. In Kubernetes, `command` overrides the Docker image's `ENTRYPOINT`, which for the official `mongo:7.0` image is `docker-entrypoint.sh`. This entrypoint script is responsible for processing the `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` environment variables to create the root user on first initialization. By bypassing it, the root user would never be created, causing all subsequent authentication steps (replica set init, verification) to fail or operate without auth. Changed `command` to `args`, which overrides Docker `CMD` instead, preserving the entrypoint script.

## Review Notes
- The `MONGO_REPLICA_SET_KEY` is created in the Secret (Step 2) but never mounted or used in the StatefulSet. For production deployments, keyFile authentication between replica set members should be configured using `--keyFile`. This is not technically wrong (unused secrets are harmless) but could be misleading to readers expecting inter-member authentication.
- The connection string in Step 6 uses the ClusterIP service as the initial contact point. This works because the MongoDB driver discovers the full replica set topology via the `replicaSet=rs0` parameter, and the headless service DNS names (used by replica set members) are resolvable cluster-wide. This is a valid pattern.
- Resource limits of 1Gi memory for MongoDB are quite low for production workloads but acceptable for a tutorial/development context.

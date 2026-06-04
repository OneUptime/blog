# Validation Summary: How to Set Up MongoDB Sharded Clusters on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- MongoDB Controllers for Kubernetes
- MongoDB Ops Manager / Cloud Manager
- Kubernetes
- Helm
- kubectl
- mongosh
- mongodump
- PyMongo
- Percona MongoDB exporter

## Sources Consulted
- MongoDB Controllers for Kubernetes: Deploy a Sharded Cluster: https://www.mongodb.com/docs/kubernetes/current/tutorial/deploy-sharded-cluster/
- MongoDB Controllers for Kubernetes: Install the Operator: https://www.mongodb.com/docs/kubernetes-operator/current/tutorial/install-k8s-operator/
- MongoDB Controllers for Kubernetes: Database Architecture: https://www.mongodb.com/docs/kubernetes-operator/v1.33/tutorial/mdb-resources-arch/
- MongoDB Controllers for Kubernetes GitHub README: https://github.com/mongodb/mongodb-kubernetes
- MongoDB Community Kubernetes Operator GitHub README: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Manual: Sharding: https://www.mongodb.com/docs/current/sharding/
- MongoDB Manual: Shards: https://www.mongodb.com/docs/manual/core/sharded-cluster-shards/
- MongoDB Manual: sh.shardCollection(): https://www.mongodb.com/docs/v7.0/reference/method/sh.shardCollection/
- MongoDB Manual: Manage Sharded Cluster Balancer: https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer
- MongoDB Manual: Back Up a Self-Managed Sharded Cluster with Database Dumps: https://www.mongodb.com/docs/manual/tutorial/backup-sharded-cluster-with-database-dumps/
- PyMongo Driver: Create a MongoClient: https://www.mongodb.com/docs/languages/python/pymongo-driver/v4.15/connect/mongoclient/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Percona MongoDB exporter Docker image: https://hub.docker.com/r/percona/mongodb_exporter

## Issues Found
- The original post claimed the MongoDB Community Kubernetes Operator can deploy and manage sharded clusters. The Community Operator only manages MongoDB Community replica sets; sharded clusters are supported by MongoDB Controllers for Kubernetes through `MongoDB` resources of type `ShardedCluster` with Ops Manager or Cloud Manager integration. Updated the operator name, description, install commands, and resource examples.
- The original config server and shard manifests used separate `MongoDBCommunity` replica sets with `mongod` command overrides such as `--configsvr` and `--shardsvr`. That is not a supported way to create an operator-managed sharded cluster. Replaced them with a single `apiVersion: mongodb.com/v1`, `kind: MongoDB`, `spec.type: ShardedCluster` manifest using `shardCount`, `mongodsPerShardCount`, `mongosCount`, and `configServerCount`.
- The original mongos Deployment manually launched `mongos` and used `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`, which apply to container initialization of `mongod`, not authentication for a `mongos` router. Updated the section to scale operator-managed mongos routers through `mongosCount`.
- The original initialization steps manually ran `sh.addShard()` against operator-created replica sets. For an operator-managed `ShardedCluster`, the operator and Ops Manager / Cloud Manager configure shards automatically. Updated the section to wait for the `MongoDB` resource and use `sh.status()` only for verification.
- The original sharding example included `sh.enableSharding()` as a required step. MongoDB 6.0 and later do not require enabling sharding on a database before running `sh.shardCollection()`. Removed that required step and added the shard-key index caveat for populated collections.
- The original PyMongo URI used `replicaSet=false`, which is not appropriate when connecting to `mongos`. Removed the replica set option and percent-encoded the example password in the URI.
- The original additional-shard instructions created another `MongoDBCommunity` replica set and manually added it with `sh.addShard()`. Replaced this with increasing `spec.shardCount` on the `MongoDB` resource.
- The original backup example ran `mongodump` separately against config servers and shards. MongoDB's documented database-dump backup procedure for supported sharded cluster versions connects through `mongos` and requires a controlled backup window. Updated the backup guidance accordingly.
- The monitoring exporter image tag was old, and the URI pointed to a hard-coded `mongos` service with an unescaped password. Updated the image to the current `percona/mongodb_exporter:0.51.0` tag and changed the URI to use a placeholder operator-created mongos service with a URI-escaped password.

## Review Notes
The revised post still uses placeholders for Ops Manager / Cloud Manager API keys, project identifiers, database users, and the generated mongos service name because those values are environment-specific. For a future production-focused update, the post could add a separate user-management example with `MongoDBUser` and a concrete service-discovery note for the exact operator version in use.

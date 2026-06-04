# Validation Summary: How to Configure MongoDB Sharded Clusters for Horizontal Scaling on Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- MongoDB sharded clusters
- MongoDB Controllers for Kubernetes
- MongoDB Community Kubernetes Operator
- Kubernetes custom resources, pods, services, and StatefulSets
- mongosh
- MongoDB shard keys and balancer operations

## Sources Consulted
- MongoDB Controllers for Kubernetes: Deploy a Sharded Cluster - https://www.mongodb.com/docs/kubernetes/current/tutorial/deploy-sharded-cluster/
- MongoDB Controllers for Kubernetes: MongoDB Database Resource Specification - https://www.mongodb.com/docs/kubernetes/current/reference/k8s-operator-specification/
- MongoDB Community Kubernetes Operator README and supported features - https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Community Kubernetes Operator deploy/configure documentation - https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/deploy-configure.md
- MongoDB Manual: Config Servers - https://www.mongodb.com/docs/manual/core/sharded-cluster-config-servers/
- MongoDB Manual: Configuration File Options - https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: sh.shardCollection() - https://www.mongodb.com/docs/v8.0/reference/method/sh.shardcollection/
- MongoDB Manual: enableSharding command - https://www.mongodb.com/docs/manual/reference/command/enableSharding/
- MongoDB Manual: Manage Sharded Cluster Balancer - https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/
- MongoDB Manual: Config Database - https://www.mongodb.com/docs/manual/reference/config-database/
- Docker Official Image notes for mongo / mongosh - https://hub.docker.com/_/mongo

## Issues Found
- The original post used `MongoDBCommunity` resources and `type: ReplicaSet` with `additionalMongodConfig.sharding.clusterRole` to create config servers and shards. The official Community Operator supports replica sets, not sharded clusters, and the MongoDB Kubernetes resource specification lists `sharding.clusterRole` as an operator-owned setting. Replaced the deployment model with the supported `apiVersion: mongodb.com/v1`, `kind: MongoDB`, `type: ShardedCluster` resource used by MongoDB Controllers for Kubernetes.
- The original post manually deployed `mongos` with the `mongo:6.0` image and used the legacy `mongo` shell in probes and commands. MongoDB 6.x uses `mongosh`; the legacy `mongo` shell is no longer the correct shell for these examples. Updated connection and verification commands to use `mongosh`.
- The original post manually ran `sh.addShard()` after creating shard replica sets. With the Kubernetes sharded-cluster operator resource, shard creation and registration are handled by the operator. Replaced manual add-shard steps with verification through `sh.status()` and scaling by increasing `shardCount`.
- The original post described `sh.enableSharding()` as required before sharding a collection. Starting in MongoDB 6.0, this is not required before `sh.shardCollection()`. Updated the text to mark it optional.
- The balancer window example used `db.settings.update(...)`. MongoDB's current balancer documentation uses `updateOne(...)`; updated the example accordingly.
- The connection helper script used Kubernetes JSONPath regex filtering, which `kubectl` JSONPath does not support. Replaced it with a portable `kubectl` plus `awk` flow.
- Several examples used hard-coded generated shard and service names. Replaced them with values discovered from `sh.status()` or Kubernetes services, because operator-generated names can vary by configuration.
- Adjusted broad scaling claims from "scale storage and throughput linearly" and "petabyte-scale workloads" to more defensible wording, since linear scaling and petabyte readiness depend on workload, shard key, hardware, and operational design.

## Review Notes
The corrected post assumes MongoDB Controllers for Kubernetes with Ops Manager or Cloud Manager, which is the officially documented path for Kubernetes-managed sharded clusters. Future improvements could add prerequisites for installing the operator, creating the Ops Manager or Cloud Manager ConfigMap and credentials Secret, and defining database users, but those additions were outside the requested scope of correcting technical inaccuracies without adding new sections.

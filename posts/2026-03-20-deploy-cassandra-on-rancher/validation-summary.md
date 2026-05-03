# Validation Summary: How to Deploy Cassandra on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Apache Cassandra (NoSQL distributed database)
- Rancher (Kubernetes management)
- Kubernetes (StatefulSets, namespaces, resources, anti-affinity)
- Helm (Bitnami charts)
- Longhorn (StorageClass for persistent volumes)
- nodetool (Cassandra cluster management CLI)
- cqlsh (Cassandra Query Language shell)
- CQL (keyspace and table creation)

## Sources Consulted
- Bitnami Cassandra Helm chart README and parameters reference: https://github.com/bitnami/charts/tree/main/bitnami/cassandra
- Apache Cassandra documentation for `nodetool status` output (UN = Up/Normal): https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/status.html
- Apache Cassandra CQL reference for CREATE KEYSPACE and SimpleStrategy replication: https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html
- Helm CLI reference for `helm repo add`, `helm repo update`, and `helm install`: https://helm.sh/docs/helm/
- Kubernetes documentation for `kubectl create namespace`, `kubectl get pods -w`, `kubectl logs`, and `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found. All parameter names in the values file (`replicaCount`, `dbUser.user`, `dbUser.password`, `persistence.enabled`, `persistence.storageClass`, `persistence.size`, `resources`, `jvm.maxHeapSize`, `jvm.newHeapSize`, `cluster.name`, `cluster.seedCount`, `podAntiAffinityPreset`) match the Bitnami Cassandra Helm chart's documented parameters. CLI commands, CQL syntax, and the `UN` status convention are all accurate.

## Review Notes
- The pod naming `cassandra-0` is correct because the Bitnami chart's StatefulSet inherits the release name (`cassandra` here).
- `seedCount: 2` is sensible relative to `replicaCount: 3` (seeds must be a subset of total replicas; Cassandra docs recommend a small number of seeds per datacenter).
- The 25% heap-of-memory-limit guideline (`maxHeapSize: 1024M` against a 4Gi limit) matches Cassandra's general tuning advice for production, though larger machines (>8Gi) typically benefit from G1GC and a larger fixed heap (8–16G); worth calling out in a future iteration.
- `podAntiAffinityPreset: hard` will cause pods to remain `Pending` if there are not enough distinct nodes — the prerequisite of "at least 3 worker nodes" already covers this, but it could be made more explicit.
- `SimpleStrategy` is acceptable for single-datacenter demos but `NetworkTopologyStrategy` is recommended for production multi-DC deployments; the post correctly stays within a single-DC scope.

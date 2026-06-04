# Validation Summary: Configuring Multi-Datacenter Replication for Cassandra on Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- K8ssandra Operator
- Kubernetes
- Helm
- Cassandra Query Language (CQL)
- Prometheus metrics and alerting
- DataStax/Apache Cassandra Java driver

## Sources Consulted
- K8ssandra Operator architecture: https://docs.k8ssandra.io/components/k8ssandra-operator/
- K8ssandra multi-cluster connectivity: https://docs.k8ssandra.io/reference/multi-cluster/
- K8ssandra Operator Helm install docs: https://docs.k8ssandra.io/install/local/multi-cluster-helm/
- K8ssandra Operator CRD reference v1.21: https://docs.k8ssandra.io/reference/crd/releases/k8ssandra-operator-releases/k8ssandra-operator-crds-1.21/
- K8ssandra Cassandra metrics endpoints: https://docs.k8ssandra.io/tasks/monitor/metrics-endpoints/
- Apache Cassandra cassandra.yaml configuration: https://cassandra.apache.org/doc/4.1.0/cassandra/configuration/cass_yaml_file.html
- Apache Cassandra CQL data definition docs: https://cassandra.apache.org/doc/4.0/cassandra/cql/ddl.html
- Apache Cassandra consistency and replication architecture docs: https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Apache Cassandra metrics reference: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/metrics.html
- Apache Cassandra nodetool repair reference: https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/repair.html
- DataStax Java driver DefaultConsistencyLevel API: https://docs.datastax.com/en/drivers/java/latest/com/datastax/oss/driver/api/core/DefaultConsistencyLevel.html

## Issues Found
- The disaster recovery bullet claimed another datacenter can continue without data loss. This was too absolute for Cassandra because the guarantee depends on replication settings, consistency levels, hints, and repair. Updated the wording to include those conditions.
- The architecture section implied inter-datacenter communication happens through seed nodes. Seeds are for discovery; gossip and internode messaging handle ongoing membership and communication. Updated the wording.
- The `ClientConfig` example included `spec.kubeConfigSecret.namespace`, but the current K8ssandra CRD only documents `name` under `kubeConfigSecret`. Removed the unsupported field.
- The `EACH_QUORUM` consistency description said "writes only." Current Cassandra architecture docs define it as requiring a quorum in each datacenter. Updated the description and availability caveat.
- The network section placed `internode_encryption` at the top level of `cassandraYaml`, but Cassandra configures internode encryption under `server_encryption_options`. Removed the invalid top-level key.
- The network section implied Cassandra uses separate ports for intra-node and inter-datacenter communication. Updated it to describe internode storage and native transport ports, and clarified that `ssl_storage_port`/7001 is only used when the legacy SSL storage port is enabled.
- The Prometheus alert example used non-documented metric names and labels (`cassandra_client_request_latency_p99{scope="CrossDC"}`). Replaced it with K8ssandra's documented metric naming pattern for client request latency and the documented storage hints metric name.
- The datacenter recovery command used `nodetool repair -dc dc2 --full`, which can restrict participants to the recovered datacenter. Changed the example to run a full repair for the affected keyspace after recovery.

## Review Notes
The post remains a high-level operational guide. In a future revision, it could note that K8ssandra recommends using `k8ssandra-client` for data-plane registration and that ClientConfig changes require the operator's remote-client cache to refresh, but the existing manual kubeconfig flow is still conceptually valid when the referenced secret contains a usable kubeconfig.

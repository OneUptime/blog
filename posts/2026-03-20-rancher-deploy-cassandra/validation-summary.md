# Validation Summary: How to Deploy Cassandra on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Apache Cassandra
- CQL
- K8ssandra Operator
- Reaper
- Stargate

## Sources Consulted
- Bitnami Cassandra Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/cassandra/README.md
- Bitnami Cassandra Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/cassandra/values.yaml
- K8ssandra Operator install docs: https://docs.k8ssandra.io/install/
- K8ssandra Operator Helm chart reference: https://docs.k8ssandra.io/reference/helm-chart/k8ssandra-operator/
- K8ssandra Operator CRD reference: https://docs.k8ssandra.io/reference/crd/releases/k8ssandra-operator-releases/k8ssandra-operator-crds-1.1/
- Apache Cassandra CQL reference: https://cassandra.apache.org/doc/latest/cassandra/developing/cql/cql_singlefile.html
- Apache Cassandra repair operations guide: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/repair.html
- Apache Cassandra `nodetool repair`: https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/repair.html
- Apache Cassandra `nodetool netstats`: https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/netstats.html
- Apache Cassandra `cassandra-rackdc.properties` documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/configuration/cass_rackdc_file.html
- Apache Cassandra `cassandra.yaml` snitch guidance: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html
- Apache Cassandra hardware guidance: https://cassandra.apache.org/doc/3.11/cassandra/operating/hardware.html

## Issues Found
- The Bitnami values example used unsupported or outdated chart keys: `cluster.replicaCount`, `jvmOpts`, and an inline top-level `configuration` block. I replaced them with current supported fields from the Bitnami chart: `replicaCount`, `cluster.datacenter`, `cluster.endpointSnitch`, `cluster.numTokens`, `jvm.maxHeapSize`, and `jvm.extraOpts`.
- The post mixed `datacenter1` and `dc1` while also using `NetworkTopologyStrategy`. I standardized the datacenter name to `dc1` and set `GossipingPropertyFileSnitch` so the datacenter-aware replication example matches the deployment configuration.
- The K8ssandra Operator install command used the default namespace-scoped behavior while the `K8ssandraCluster` manifest targeted the `databases` namespace. I added `--set global.clusterScoped=true` so the operator can watch and reconcile clusters outside its own namespace.
- The `reaper.repairSchedules` block was not valid for the current `K8ssandraCluster` CRD. I replaced it with the supported `reaper.autoScheduling.enabled` field.
- Step 4 defined a `K8ssandraCluster` manifest but never applied it. I added `kubectl apply -f k8ssandra-cluster.yaml` so the operator path actually deploys a cluster.
- The repair progress example used `nodetool compactionstats`, which reports compactions rather than repair streaming activity. I changed it to `nodetool netstats`.
- The prerequisites recommended 4 GB RAM per node, which is below Apache Cassandra's published production guidance. I updated the recommendation to 8 GB+ RAM per node for production use.

## Review Notes
- The Bitnami example still assumes a Helm-based deployment for the pod DNS names shown in later commands. If the post is expanded later, it would benefit from separate verification and troubleshooting commands for the K8ssandra Operator deployment path.
- `metrics.serviceMonitor.enabled` assumes Prometheus Operator CRDs are already installed. That is common in Rancher monitoring setups, but it is still an environment prerequisite.
- K8ssandra Operator supports monitoring integration, but current releases do not deploy Prometheus and Grafana for you; they integrate with user-provided monitoring stacks.
- The manifest pins `serverVersion: "4.1.3"`. That syntax is valid, but the exact Cassandra patch version should be reviewed periodically against current K8ssandra compatibility guidance.

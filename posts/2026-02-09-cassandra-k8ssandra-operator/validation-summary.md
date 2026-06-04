# Validation Summary: How to Run Apache Cassandra on Kubernetes Using K8ssandra Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Cassandra
- Kubernetes
- K8ssandra Operator
- Cass Operator
- Medusa
- Reaper
- Stargate
- Helm
- Prometheus and Grafana

## Sources Consulted
- K8ssandra Operator install with Helm: https://docs.k8ssandra.io/install/local/single-cluster-helm/
- K8ssandra Operator Helm chart reference: https://docs.k8ssandra.io/reference/helm-chart/k8ssandra-operator/
- K8ssandra Operator CRDs v1.10: https://docs.k8ssandra.io/reference/crd/releases/k8ssandra-operator-releases/k8ssandra-operator-crds-1.10/
- K8ssandra Operator architecture: https://docs.k8ssandra.io/components/k8ssandra-operator/architecture/
- K8ssandra Medusa backup and restore: https://docs.k8ssandra.io/tasks/backup-restore/
- K8ssandra Reaper repair guide: https://docs.k8ssandra.io/tasks/repair/
- K8ssandra monitoring with kube-prometheus-stack: https://docs.k8ssandra.io/tasks/monitor/prometheus-grafana/
- K8ssandra security and generated secrets: https://docs.k8ssandra.io/tasks/secure/security/
- Apache Cassandra CQL secondary indexes: https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexes.html
- Apache Cassandra nodetool rebuild: https://cassandra.apache.org/doc/stable/cassandra/managing/tools/nodetool/rebuild.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The install commands omitted the required cert-manager dependency. Added the Jetstack Helm repository and cert-manager installation before installing K8ssandra Operator.
- The Cassandra datacenter manifest used `cassandraConfig`, which is not the current K8ssandraCluster field. Changed it to `config` and nested `cassandraYaml` under the existing datacenter config block.
- The JVM example used deprecated or Cassandra-3.11-only options (`heapSize`, `heapNewGenSize`, and raw G1 flags). Replaced them with current `heap_initial_size`, `heap_max_size`, `gc`, and G1-specific CRD fields.
- The Medusa S3 secret used separate `access_key_id` and `secret_access_key` keys. Updated it to the required `credentials` key containing an AWS credentials-file format.
- The Cassandra namespace was created after the Medusa secret command. Moved namespace creation before creating the secret.
- The Reaper spec included an unsupported `enabled` field. Removed it because Reaper is enabled by the presence of `spec.reaper`.
- The manual backup example created `MedusaBackup` directly. Updated it to create `MedusaBackupJob`, which is the documented way to trigger a backup, and changed the watch command to `medusabackupjobs`.
- The Reaper service name and UI URL were incorrect for K8ssandra Operator naming. Updated them to `prod-cluster-dc1-reaper-service` and `/webui`.
- The monitoring section incorrectly said K8ssandra Operator bundles Prometheus and Grafana. Updated the text and commands to install kube-prometheus-stack separately and rely on K8ssandra-created ServiceMonitors.
- The CQL example used `ALLOW FILTERING` on a query backed by a secondary index. Removed it.
- The multi-datacenter rebuild command was inside a SQL code fence. Split it into a bash code fence.
- The scaling text said Cassandra automatically rebalances. Clarified that Cassandra bootstraps the new nodes.
- The tuning snippet used the obsolete `cassandraConfig` field. Updated it to `config`.

## Review Notes
The guide is now technically aligned with current K8ssandra Operator documentation. Future improvements could include adding explicit Reaper UI credential retrieval and importing Grafana dashboard ConfigMaps, but those are operational completeness improvements rather than correctness blockers.

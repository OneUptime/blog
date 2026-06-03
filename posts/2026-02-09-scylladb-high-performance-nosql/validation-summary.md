# Validation Summary: How to Deploy ScyllaDB on Kubernetes for High-Performance NoSQL Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- ScyllaDB
- ScyllaDB Operator
- ScyllaDB Manager
- Helm
- Amazon EBS CSI Driver
- CQL
- Prometheus metrics

## Sources Consulted
- ScyllaDB Operator Helm installation documentation: https://operator.docs.scylladb.com/stable/installation/helm.html
- ScyllaDB Operator installation overview: https://operator.docs.scylladb.com/stable/installation/overview.html
- ScyllaCluster API reference: https://operator.docs.scylladb.com/stable/reference/api/groups/scylla.scylladb.com/scyllaclusters.html
- ScyllaDB Operator first cluster and placement documentation: https://operator.docs.scylladb.com/stable/resources/scylladbclusters/
- ScyllaDB Operator Manager documentation: https://operator.docs.scylladb.com/master/understand/manager.html
- ScyllaDB Manager backup documentation: https://manager.docs.scylladb.com/stable/backup/
- ScyllaDB Manager `sctool backup` reference: https://manager.docs.scylladb.com/stable/sctool/backup.html
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- AWS EKS StorageClass parameters documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- ScyllaDB consistency level documentation: https://docs.scylladb.com/manual/stable/cql/consistency.html
- ScyllaDB metrics reference: https://docs.scylladb.com/manual/stable/reference/metrics.html
- ScyllaDB shard-per-core architecture information: https://www.scylladb.com/product/technology/shard-per-core-architecture/

## Issues Found
- The post claimed Kubernetes ScyllaDB latencies are measured in microseconds rather than milliseconds. Changed this to a more accurate claim about predictable low latency under correct sizing and tuning.
- The read path description said reads query multiple replicas in parallel and return the first response. Updated it to reflect ScyllaDB consistency levels and speculative retry behavior.
- The operator installation command enabled `webhook.enabled=true`, which is not the current documented Helm value, and omitted the cert-manager prerequisite. Removed the unsupported value and added the current cert-manager install step.
- The StorageClass used the deprecated and removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the AWS EBS CSI provisioner `ebs.csi.aws.com` with current CSI parameters.
- The ScyllaCluster manifest used `podAffinity`, which would prefer colocating Scylla pods on the same node. Changed it to `podAntiAffinity` to prefer spreading pods across nodes.
- The ScyllaCluster manifest used deprecated `cpuset`, `sysctls`, and `hostNetworking` fields. Removed the deprecated fields and used the supported `network.dnsPolicy` field.
- The `automaticOrphanedNodeCleanup` comment incorrectly described automatic repairs. Updated the comment to describe orphaned node cleanup.
- The performance tuning section referred to JVM settings, but ScyllaDB is not JVM-based. Changed the wording to ScyllaDB startup settings.
- The backup section used an old Scylla Operator v1.11 Manager manifest and a pod name/namespace that no longer matches current Manager deployment. Updated it to install the current `scylla/scylla-manager` Helm chart in the documented `scylla-manager` namespace and define a declarative backup task on the ScyllaCluster spec.
- The scaling command used a merge patch with a partial `racks` array, which could replace the full racks list. Updated it to a JSON patch that changes only `/spec/datacenter/racks/0/members`.
- The closing paragraph guaranteed consistent sub-millisecond latency. Changed it to predictable low latency at scale.

## Review Notes
The ScyllaDB and ScyllaDB Manager versions in the examples are older than the current chart defaults but are syntactically valid version fields. In a future refresh, the post should align the example `version` and `agentVersion` with the current ScyllaDB Operator release and the target ScyllaDB support policy.

# Validation Summary: How to Use Pod Topology Spread Constraints with StatefulSets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes Pod topology spread constraints
- Kubernetes StorageClasses and volume topology
- Kubernetes downward API
- kubectl
- jq
- etcd
- Elasticsearch
- AWS EBS CSI Driver

## Sources Consulted
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StorageClasses: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes node labels: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes environment variables: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- etcd v3.5 clustering guide: https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd configuration flags: https://etcd.io/docs/v3.3/op-guide/configuration/
- Elasticsearch Docker configuration: https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
- Elasticsearch discovery settings: https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-discovery-settings.html

## Issues Found
- The basic spread example said Kubernetes "creates" exactly 2 pods per zone. Updated the wording to say it can place 2 pods per zone when eligible nodes and storage are available, because topology spread constraints influence scheduling rather than guaranteeing capacity.
- The multi-level topology comment said the hostname constraint spreads pods "within each zone." Updated it to say it prefers spreading across nodes, because multiple topology spread constraints are combined by the scheduler and the hostname constraint is not scoped inside each zone.
- The rack-aware example used `topology.kubernetes.io/rack`, but the `kubernetes.io` prefix is reserved for Kubernetes-defined labels and rack is not a standard well-known topology label. Changed it to `topology.example.com/rack`.
- The Elasticsearch example attempted to read `topology.kubernetes.io/zone` from `metadata.labels` via the downward API. The downward API can expose pod labels, not node labels, so this would not read the node zone. Replaced the environment variables with a note that an operator or admission webhook is needed if Elasticsearch allocation awareness requires `node.attr.zone`.
- The `minDomains` explanation said it requires at least three zones. Updated the wording because `minDomains` affects skew calculation when eligible domains are fewer than the configured minimum; it does not create or strictly require zones by itself.
- The etcd example omitted `--initial-cluster`, which is required for static bootstrap of a multi-member etcd cluster. Added a five-member initial cluster list matching the StatefulSet replica names.
- The volume topology example used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the current AWS EBS CSI provisioner `ebs.csi.aws.com` and used the CSI topology key `topology.ebs.csi.aws.com/zone`.

## Review Notes
- The StatefulSet snippets other than the first assume the matching headless Services and namespaces already exist; Kubernetes documentation states the governing Service should exist before the StatefulSet for stable network identity.
- `matchLabelKeys` is valid for topology spread constraints, but it is version-sensitive: it has been enabled by default since Kubernetes v1.27, and selector merge behavior changed in Kubernetes v1.34.
- YAML code blocks were parsed successfully after the edits. `kubectl` was not installed in the local environment, so CLI behavior was checked against official Kubernetes documentation rather than local `kubectl --help` output.

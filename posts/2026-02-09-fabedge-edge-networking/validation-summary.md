# Validation Summary: Deploy FabEdge for Edge-to-Edge Container Networking Across Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- FabEdge
- Kubernetes
- K3s
- Helm
- Flannel and Calico CNI
- Kubernetes NetworkPolicy
- Kubernetes PriorityClass
- Kubernetes topology spread constraints
- Linux traffic control

## Sources Consulted
- FabEdge README: https://github.com/FabEdge/fabedge
- FabEdge Getting Started guide: https://github.com/FabEdge/fabedge/blob/main/docs/get-started.md
- FabEdge User Guide: https://github.com/FabEdge/fabedge/blob/main/docs/user-guide.md
- FabEdge HA deployment guide: https://github.com/FabEdge/fabedge/blob/main/docs/deploy-ha.md
- FabEdge Helm chart repository and values: https://github.com/FabEdge/helm-chart
- FabEdge CRD manifests: https://github.com/FabEdge/helm-chart/tree/main/fabedge/crds
- FabEdge quickstart script help: https://fabedge.github.io/helm-chart/scripts/quickstart.sh
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s server options for cluster CIDR: https://docs.k3s.io/cli/server
- Helm chart repository usage: https://helm.sh/docs/helm/helm_repo_add/

## Issues Found
- The original install flow used nonexistent separate `fabedge/fabedge-operator` and `fabedge/fabedge-agent` charts and unsupported Helm values. Replaced it with the documented `fabedge/fabedge` chart through FabEdge's `quickstart.sh` for host and member clusters.
- The member-cluster registration token was shown as a Kubernetes Secret named `fabedge-connector-token`. FabEdge documents creating a `Cluster` resource on the host cluster and reading `.spec.token`, so the command sequence was corrected.
- The `Community` CRD example used object members with `name`, `role`, and connector endpoint fields. The actual CRD defines `spec.members` as an array of strings, so the examples now use values such as `edge-cluster-01.connector`.
- The service export example used an unsupported `fabedge.io/service-export` annotation and an incorrect DNS suffix. It now uses the documented `fabedge.io/global-service: "true"` label and `service.namespace.svc.global` naming.
- The NetworkPolicy example matched nonexistent FabEdge namespace labels. It now uses standard Kubernetes `ipBlock` entries for remote pod CIDRs and notes that enforcement depends on a NetworkPolicy-capable CNI.
- The HA connector example used unsupported fields inside a `Community`. It now shows documented Helm values for connector replicas and keepalived.
- The monitoring section assumed a Prometheus `ServiceMonitor` and metrics port that the chart does not expose. It now uses Kubernetes resource checks and StrongSwan tunnel state commands.
- The bandwidth optimization section used unsupported compression ConfigMap keys. It now shows supported FabEdge agent Helm arguments.
- The traffic prioritization and bandwidth shaping sections used nonexistent FabEdge `TrafficPolicy` and `BandwidthPolicy` CRDs. They now use Kubernetes `PriorityClass` and Linux `tc`, respectively, with notes that these are outside FabEdge's CRD model.
- The NAT traversal section used unsupported STUN server configuration. It now uses the documented `connectorAsMediator`, public address, and public port settings.
- The disaster-recovery `Deployment` was not a valid Kubernetes Deployment because the pod template lacked labels and a container. Added the required template labels and container, and changed the topology key to a standard Kubernetes topology label.
- The troubleshooting section used `kubectl get connectors`, but FabEdge does not define a `Connector` resource. It now checks connector pods and StrongSwan SAs.

## Review Notes
FabEdge documentation and releases appear relatively old, and some source paths have a v1.0.0 tag while the GitHub sidebar renders v0.8.1 as latest. The post now avoids unsupported invented APIs, but readers should still test against the exact FabEdge chart version they deploy.

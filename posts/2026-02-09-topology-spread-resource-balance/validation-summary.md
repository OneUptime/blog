# Validation Summary: How to Implement Pod Topology Spread for Balanced Resource Usage

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes StatefulSets
- Pod topology spread constraints
- Kubernetes scheduler
- Kubernetes Cluster Autoscaler / node autoscaling
- kube-state-metrics
- Prometheus / PromQL
- Grafana dashboards
- Kubernetes descheduler
- kubectl

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: kube-state-metrics overview - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics documentation: Node metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics documentation: Pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes descheduler documentation - https://github.com/kubernetes-sigs/descheduler

## Issues Found
- Several `apps/v1` Deployment examples omitted the required `.spec.selector` field. Added matching selectors to the `critical-service`, `resource-intensive-app`, `ml-training`, and `scalable-app` manifests.
- The `minDomains` example used `whenUnsatisfiable: ScheduleAnyway`, but Kubernetes only allows `minDomains` with `DoNotSchedule`. Changed the example to `DoNotSchedule` and corrected the explanation of how `minDomains` affects global minimum and pending pods.
- The multi-level topology spread explanation implied sequential scheduling. Updated it to describe the hard zone rule and soft node preference without implying an ordering that Kubernetes does not use.
- The StatefulSet section claimed each replica lands on a different zone, which is not guaranteed and is impossible when replicas exceed zone count. Updated the text to say replicas spread within the configured skew across available nodes and zones.
- The autoscaler section implied soft `ScheduleAnyway` constraints can drive autoscaler provisioning. Updated it to distinguish topology-aware autoscaling for hard constraints from scheduler scoring for soft constraints.
- Prometheus examples used non-standard `topology_zone` and `app` labels on `kube_pod_info`. Updated queries to join `kube_pod_info` with `kube_node_labels` and `kube_pod_labels`, and noted that kube-state-metrics must expose the relevant labels.
- The descheduler policy used the outdated `descheduler/v1alpha1` strategy format. Updated it to the current `descheduler/v1alpha2` profile/plugin format for `RemovePodsViolatingTopologySpreadConstraint`.

## Review Notes
- The Grafana dashboard snippet is still illustrative and assumes a Grafana setup that accepts inline JSON in a ConfigMap. Production deployments often use a sidecar or provisioning mechanism to load dashboards.
- The monitoring examples depend on kube-state-metrics label allowlists for node and pod labels.

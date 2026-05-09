# Validation Summary: How to Troubleshoot Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Typha
- Calico Felix / calico-node
- Kubernetes Deployments, DaemonSets, Services, anti-affinity, PodDisruptionBudgets, and node drains
- Prometheus metrics
- kubectl

## Sources Consulted
- Calico documentation: Install Typha, Calico the hard way: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Install calico/node, Calico the hard way: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: Configuring Typha: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Monitoring Typha with Prometheus: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Disruptions / PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: kubectl drain: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Create an External Load Balancer: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/

## Issues Found
- The post used the `calico-system` namespace throughout, but Calico the hard way installs Typha and calico/node into `kube-system`. Updated the examples and added a note to adjust the namespace for non-Hard-Way deployments.
- The Typha metrics example used port `9093` without qualification. Calico Typha's default metrics port is `9091`, and metrics are not enabled by default in the Typha configuration reference. Updated the command to `9091` and noted the metrics prerequisite.
- The rebalancing example set `TYPHA_CONNECTIONREBALANCINGMODE=auto`, but the Hard Way manifest and Typha configuration use Kubernetes-based rebalancing. Updated the value to `kubernetes`.
- The Service `externalTrafficPolicy: Local` explanation was not correct for the Hard Way Typha Service path. Replaced it with a check for Felix being pinned to `FELIX_TYPHAADDR` instead of using `FELIX_TYPHAK8SSERVICENAME`.
- The anti-affinity patch selected `app=calico-typha`, but the Hard Way Typha pods are labeled `k8s-app=calico-typha`. Updated the selector.
- The Felix timeout example used `calicoctl patch felixconfiguration` for `typhaReadTimeout`, but the documented Felix setting is exposed as a Felix environment/config-file option with `FELIX_TYPHAREADTIMEOUT`. Updated the check and remediation to use the `calico-node` DaemonSet environment.
- The rolling-update guidance changed only `terminationGracePeriodSeconds`; Calico's Typha configuration says `ShutdownTimeoutSecs` should match the Kubernetes termination grace period. Added `TYPHA_SHUTDOWNTIMEOUTSECS=60`.

## Review Notes
The commands assume manifests similar to Calico the hard way. Operator-based Calico installations use different management surfaces for some Typha settings, so future revisions could add a separate operator-specific variant if needed.

# Validation Summary: Validating Egress in Cilium Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium Egress Gateway
- Cilium CLI and cilium-dbg
- Hubble
- Kubernetes Deployments, Services, Pods, and CiliumEndpoint CRDs
- Helm

## Sources Consulted
- Cilium Egress Gateway documentation: https://docs.cilium.io/en/stable/network/egress-gateway/egress-gateway/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Monitoring and Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble troubleshooting and observe examples: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes pod affinity and anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Helm `get values` command reference: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The post used `cilium endpoint list`, but the Cilium CLI command reference does not provide an `endpoint` subcommand for the cluster-management CLI. Endpoint inspection inside a Cilium agent is documented under `cilium-dbg endpoint list`. I changed the endpoint-health command to use `kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg endpoint list`.
- The post used `cilium metrics list` from inside the Cilium DaemonSet. Metrics inspection for the agent is documented as `cilium-dbg metrics list`, so I updated the metrics commands and the troubleshooting note accordingly.
- The endpoint count check implied that Cilium endpoint count should match the number of running pods exactly. Cilium documents `CiliumEndpoint` objects as the Kubernetes-facing endpoint objects and notes that Cilium health endpoints can also appear, so an exact pod-count comparison is not reliable. I changed the command to count `ciliumendpoints.cilium.io` and describe the comparison as a rough sanity check.
- The custom workload section said the nginx workload specifically tested egress behavior, but the commands only validate pod-to-service and direct pod-to-pod connectivity within the cluster. I adjusted the wording to describe it as baseline pod and service connectivity validation before egress-specific testing.

## Review Notes
The guide is technically valid after the corrections. A future improvement would be to add a concrete egress-gateway validation example that sends traffic to a cluster-external service and verifies the observed source IP, matching Cilium's official egress gateway testing workflow.

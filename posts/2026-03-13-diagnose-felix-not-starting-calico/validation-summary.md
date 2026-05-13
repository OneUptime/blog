# Validation Summary: How to Diagnose Felix Not Starting in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Felix
- Kubernetes
- kubectl
- calicoctl
- Linux iptables

## Sources Consulted
- Calico component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico calico/node configuration and readiness checks: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico Felix configuration and health port settings: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The symptoms section said `calicoctl node status` shows Felix unhealthy. Official Calico documentation describes `calicoctl node status` as reporting the Calico node process and BGP peering states, not as the Felix readiness check. Changed this to say that the calico-node readiness check reports Felix as not ready.
- The readiness probe example suggested checking `http://localhost:9099/readiness` directly with `wget`. Felix's health port does provide readiness and liveness endpoints when enabled, but Calico's documented calico/node readiness check is `/bin/calico-node -felix-ready`. Changed the command to use the documented readiness check.

## Review Notes
The remaining commands and explanations are consistent with the cited Calico and Kubernetes references. The post intentionally stays version-neutral; Calico system requirements and Kubernetes support windows are version-specific and should be rechecked when updating the post for a particular Calico release.

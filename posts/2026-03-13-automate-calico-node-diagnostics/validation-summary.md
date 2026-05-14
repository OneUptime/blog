# Validation Summary: How to Automate Calico Node Diagnostics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- Bash
- Mermaid

## Sources Consulted
- Calico documentation: calicoctl node status, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl node command overview, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: Troubleshooting and diagnostics, https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico documentation: Felix configuration and health reporting, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Calico node readiness and liveness probe commands, https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Kubernetes documentation: kubectl exec reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl logs reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: JSONPath support, https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The diagnostic collection script ran `calicoctl node status` inside the `calico-node` container. Calico documentation states that `calicoctl node ...` commands must run directly on the host because they need host filesystem access. Replaced that in-pod command with `calico-node -bird-ready`, which matches Calico's documented BIRD readiness probe pattern and works through `kubectl exec`.
- The post description claimed collection of BGP peer state and node-level diag bundles, but the script collected Felix health, BGP/BIRD readiness, and recent logs. Updated the description to match the actual validated diagnostics.
- The introduction said the script ran checks in parallel, but the implementation loops through pods sequentially. Removed the parallel claim.
- The health summary used `grep -c "Calico is live" || echo 0`, which can produce `0` twice when no match is found and break the numeric comparison. Replaced the output parsing with a direct check of the `calico-node -felix-live` exit status.

## Review Notes
The scripts assume Calico is installed in the `calico-system` namespace with pods labeled `k8s-app=calico-node`, which is common for operator-based installations but not universal. Some manifest-based installations use `kube-system`, so future improvements could make the namespace configurable.

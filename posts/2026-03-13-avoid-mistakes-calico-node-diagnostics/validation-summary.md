# Validation Summary: Common Mistakes to Avoid with Calico Node Diagnostics

## Status
validated

## Post Type
Guide (operational best-practices / anti-patterns)

## Technologies Covered
- Calico (calico-node, Felix, calicoctl, BGP)
- Kubernetes (kubectl, DaemonSets, field selectors, `kubectl debug node`)
- iptables / nsenter
- Mermaid (mindmap diagram)

## Sources Consulted
- Calico operator install namespace and DaemonSet labels: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- `calicoctl node status` usage: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Felix liveness flag `-felix-live` (used by the calico/node liveness probe): https://docs.tigera.io/calico/latest/reference/felix/configuration and Calico repo `cmd/calico-node`
- `kubectl debug node/<name>` (GA since Kubernetes v1.20): https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- kubectl field selectors (`spec.nodeName`): https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Calico iptables chain naming (`cali-` prefix on data plane chains): https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity and Felix source
- Mermaid `mindmap` diagram type: https://mermaid.js.org/syntax/mindmap.html

## Issues Found
No technical issues found.

- The `calico-system` namespace and `k8s-app=calico-node` label match the Tigera-operator install layout.
- The kubectl field selector `spec.nodeName=...` is valid and supported.
- `kubectl exec ... -c calico-node -- calicoctl node status` is a documented way to inspect BGP state from inside the calico-node container.
- The felix liveness probe is invoked as `calico-node -felix-live` (single dash, matching the binary's flag style); this is the same command the container's livenessProbe uses.
- `kubectl debug node/<name> --image=... -- nsenter -t 1 -n -- ...` is the documented pattern for entering the host's network namespace, and Calico's data plane chains do use the `cali-` prefix, so `grep -c "^-A cali-"` is an accurate way to count programmed rules.
- `kubectl rollout restart daemonset/...` and `kubectl delete pod ...` (DaemonSet-managed recreation) behave as described.

## Review Notes
- `calicoctl` has historically shipped inside the `calico/node` image and the `calicoctl node status` invocation here relies on that. In some Calico builds/installations users may need to use the `calicoctl` plugin or a separate `calicoctl` pod instead; the in-container form shown is still the most common documented approach.
- The post uses the operator-managed `calico-system` namespace. Clusters that installed Calico via the legacy manifests use `kube-system` for the calico-node DaemonSet; readers on that layout should substitute the namespace.
- "Hundreds of cali- rules on a healthy node" is a useful ballpark but the exact count depends on the number of local pods and applied policies; treating zero as the actionable signal (as the post does) is the right framing.

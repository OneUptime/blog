# Validation Summary: How to Prevent ContainerCreating After Uninstalling Calico

## Status
validated

## Post Type
Guide / Operational runbook

## Technologies Covered
- Calico (CNI plugin)
- Kubernetes (kubectl, nodes, pods, DaemonSets)
- CNI (Container Network Interface)
- Bash scripting
- Flannel (mentioned as example replacement CNI)

## Sources Consulted
- kubectl drain documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- kubectl wait documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait
- kubectl run documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- Calico installation docs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/
- CNI specification and config directory conventions: https://github.com/containernetworking/cni
- Kubernetes node maintenance docs: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/

## Issues Found
No technical issues found.

Specific checks performed:
- `kubectl drain --ignore-daemonsets --delete-emptydir-data --timeout=120s` — all flags are current. `--delete-emptydir-data` correctly replaces the deprecated `--delete-local-data` (deprecated in v1.20, removed in v1.25).
- `kubectl wait node/$NODE --for=condition=Ready --timeout=120s` — valid syntax for node readiness condition.
- `kubectl wait pod/migration-test --for=condition=Ready --timeout=60s` — valid syntax for pod readiness.
- `kubectl run migration-test --image=busybox --restart=Never --overrides=...` — valid; `--restart=Never` creates a pod (kubectl run only creates pods in current Kubernetes versions, which is the intended behavior here).
- `--overrides` flag with JSON to specify `nodeName` — valid kubectl pattern for pod placement.
- `/etc/cni/net.d/10-calico.conflist` — correct standard path for Calico CNI config file (per CNI conventions and Calico installation).
- `kubectl label node <test-node> network-cni=new` — valid label syntax.
- `kubectl get nodes -o jsonpath='{.items[*].metadata.name}'` — valid jsonpath expression for retrieving node names.
- `kubectl get pods --all-namespaces` — valid flag.
- Mermaid flowchart syntax is valid.

## Review Notes
- The post's procedural advice is operationally sound. A few non-blocking observations for future revisions:
  - The rolling migration script does not check the exit status of `kubectl drain` or `kubectl wait` before proceeding to the next step. In practice, a `set -e` or explicit error handling would make the script safer for production use.
  - `kubectl wait pod/migration-test --for=condition=Ready --timeout=60s` followed by an immediate `kubectl delete pod migration-test` has a small race window because the test pod runs `sleep 10` and may transition out of Ready before deletion if the cluster is slow. This isn't incorrect, just worth noting.
  - For Calico specifically, removing only `/etc/cni/net.d/10-calico.conflist` leaves the Calico CNI binary (`/opt/cni/bin/calico`) in place. This is fine for migration purposes since the kubelet looks at the conflist for active config, but a complete cleanup would also remove the binary.
  - The post doesn't mention that some CNI plugins (e.g., Cilium when used with `kubeProxyReplacement`) may have additional cleanup requirements beyond CNI config files. The general approach described, however, is correct as a baseline.

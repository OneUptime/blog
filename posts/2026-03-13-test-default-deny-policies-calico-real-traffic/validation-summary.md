# Validation Summary: How to Test Default Deny Policies in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- `kubectl` CLI
- `calicoctl` CLI
- Calico `GlobalNetworkPolicy` and `NetworkPolicy` resources (`projectcalico.org/v3`)
- BusyBox and nginx container images
- Mermaid diagrams

## Sources Consulted
- Calico documentation on Global Network Policy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation on Network Policy: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector-syntax
- Calico tutorials on default deny: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/kubernetes-default-deny
- Kubernetes documentation on `kubectl run`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- Kubernetes namespace `kubernetes.io/metadata.name` automatic label (KEP-2161, GA in 1.22): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#automatic-labelling
- Docker Hub nginx image (default CMD `nginx -g 'daemon off;'`): https://hub.docker.com/_/nginx
- BusyBox `wget` applet documentation (supports `--timeout=SEC`)

## Issues Found
1. **`dest-pod` overrode nginx's default command**: The original command `kubectl run dest-pod -n test-dest --image=nginx --restart=Never -- sleep 3600` overrode the nginx image's default `CMD` (`nginx -g 'daemon off;'`) with `sleep 3600`. As a result, nginx would not be running inside the pod, and the baseline `wget` test (expected to return the nginx welcome page) would fail with connection refused rather than succeed. Removed the `-- sleep 3600` suffix so nginx runs as intended.
2. **NetworkPolicy selector did not match the destination pod's labels**: The `NetworkPolicy` in Step 4 used `selector: app == 'dest-pod'`, but `kubectl run` only applies a `run=<name>` label by default. The policy therefore would never select `dest-pod`, leaving traffic blocked even after applying the "allow" rule. Added `--labels="app=dest-pod"` to the `kubectl run` command so the pod carries the label the selector targets.

## Review Notes
- The `GlobalNetworkPolicy` in Step 3 uses `selector: all()` combined with `types: [Ingress, Egress]` and no rules. This is the documented Calico pattern for default-deny and is correct, but readers should note that this will affect *all* workloads in the cluster (including system components in `kube-system`). In a real test environment, this can disrupt DNS, the API server, and other essential traffic; the post would benefit from a follow-up note recommending a narrower `selector` (e.g., scoped to test namespaces) or a warning before applying cluster-wide.
- The `order: 1000` is appropriate for a default-deny: in Calico, lower-numbered policies are evaluated first, so explicit allow policies (with default or lower order) take precedence.
- `kubernetes.io/metadata.name` is automatically applied to namespaces since Kubernetes 1.22 (GA), which is well within the assumed cluster version range.
- BusyBox `wget` supports `--timeout=SEC` (long-form), so the commands work as written.
- The Mermaid diagram uses `\n` for line breaks in node labels. Modern Mermaid (v9+) accepts this; older renderers may need `<br/>`. Not a correctness issue for the rendered blog.

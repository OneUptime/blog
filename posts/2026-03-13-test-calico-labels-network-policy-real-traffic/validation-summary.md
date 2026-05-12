# Validation Summary: How to Test Calico Labels for Network Policy with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico Network Policy (projectcalico.org/v3)
- calicoctl
- kubectl
- BusyBox / wget
- Mermaid (for diagrams)

## Sources Consulted
- Calico Network Policy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- calicoctl workloadendpoints reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get/workloadendpoint
- kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- kubectl label reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#label
- BusyBox wget options (supports `--timeout=SEC` long form alongside `-T`)
- Kubernetes Pod spec reference: https://kubernetes.io/docs/concepts/workloads/pods/

## Issues Found
No technical issues found.

The post is technically accurate:
- The Calico `NetworkPolicy` YAML uses the correct `apiVersion: projectcalico.org/v3`, valid selector syntax (`tier == 'api'`), and correct nesting of `ingress[].source.selector` and `types`.
- `calicoctl get workloadendpoints --all-namespaces -o wide` is a valid command.
- `kubectl label pod ... tier-` correctly removes a label, and `kubectl label pod ... tier=web` re-applies it.
- `kubectl run no-label-pod -n test --image=busybox --restart=Never --labels="" -- sleep 3600` creates a pod with no extra labels (the empty `--labels` value overrides the default `run=<name>` label), so the pod intentionally does not match the `tier == 'web'` selector.
- BusyBox `wget -qO- --timeout=5 http://$DEST_IP` is valid; BusyBox wget supports both `--timeout=` and `-T` forms.
- The claim that Calico evaluates label selectors dynamically (so adding/removing labels takes effect without a policy update) is accurate.
- Mermaid diagram syntax is valid.

## Review Notes
- The post assumes the `test` namespace already exists. Readers may need to run `kubectl create namespace test` before applying the Pod manifests.
- The destination Pod (`test-dest`) does not declare an explicit `ContainerPort` block requirement for the policy to function — Calico policies operate at the L3/L4 level on the pod IP — so the `ports` declaration on the nginx container is for documentation/discoverability only, which is fine.
- Calico v3.26 is referenced as a minimum; readers on newer Calico versions (v3.27+/v3.28+) will see the same behavior for these features.
- The `kubectl run --labels=""` behavior can vary subtly across kubectl versions; for maximum portability, the same effect could be achieved by applying a Pod manifest with no labels. The current approach works on current kubectl versions.
- Considered but not changed: pinning `busybox` and `nginx` images to specific tags. The post uses floating `:latest` (implicit), which is consistent with the post's tutorial style and not a technical error.

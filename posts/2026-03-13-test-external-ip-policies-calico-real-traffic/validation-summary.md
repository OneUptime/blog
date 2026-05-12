# Validation Summary: How to Test Calico External IP Policies with Real Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico (v3.26+)
- Kubernetes NetworkPolicy (Calico CRD `projectcalico.org/v3`)
- kubectl
- calicoctl
- BusyBox wget
- nginx

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Calico policy ordering: https://docs.tigera.io/calico/latest/network-policy/policy-rules/policy-priority
- kubectl run docs: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- BusyBox wget applet help (supports `--timeout=SEC` long option via the standard `wget_longopts` table)

## Issues Found
No technical issues found.

The blog post is technically correct:
- The `projectcalico.org/v3` apiVersion and `NetworkPolicy` kind are valid for Calico's namespaced NetworkPolicy CRD.
- The policy fields used (`order`, `selector`, `ingress`, `types`, `action`, `source.selector`) are all valid Calico NetworkPolicy fields.
- Selector syntax `all()` and `run == 'test-source'` are correct Calico label expressions.
- `kubectl run` does add a `run=<pod-name>` label to pods it creates, so the selector match for `test-source` will work.
- Order semantics are correctly applied: the `order: 50` allow rule is evaluated before the `order: 100` deny rule (lower numeric order = higher priority).
- The `wget --timeout=5` long option is supported by BusyBox's wget applet.
- The exit code check via `$?` after `kubectl exec` correctly captures the inner wget exit code.
- Cleanup using `kubectl delete namespace` properly removes all in-namespace policies and pods.

## Review Notes
- The title says "External IP Policies" but the demonstrated test uses pod-to-pod traffic via Pod IP rather than traffic from an external (out-of-cluster) source IP. This is a scope/framing observation rather than a technical correctness issue and was not edited per the review guidelines (which prohibit restructuring or content additions).
- The post would be slightly more robust if it used `-T 5` (short option) for BusyBox wget compatibility on minimal images, but `--timeout=5` works on the standard `busybox` image and is not incorrect.
- Calico's policy evaluation also depends on the policy's `tier` (defaults to `default`). For multi-tier setups the order semantics described would need to consider tier order as well, but the post correctly stays within the default tier.

# Validation Summary: How to Update the Calico GlobalNetworkPolicy Resource Safely

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico policy selectors and policy order
- calicoctl
- Kubernetes
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico tier and policy evaluation reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The backup verification command used `calicoctl get globalnetworkpolicy --no-headers`, but the official `calicoctl get` options do not include `--no-headers`. Changed it to count `GlobalNetworkPolicy` objects from YAML output.
- The staging policy text said to use a higher order number, while Calico applies lower `order` values first. Changed the wording to lower order number / higher priority.
- The staging policy selected `environment == 'staging'` with the top-level `selector` while the example labels a namespace. In Calico, the top-level selector selects endpoints; namespace labels should be matched with `namespaceSelector`. Changed the policy to `selector: all()` plus `namespaceSelector: "environment == 'staging'"`.
- The troubleshooting command for checking pod labels filtered out running pods with `grep -v "Running"`, which would hide most relevant pods. Changed it to show all pod labels.
- The policy-order sorting pipeline used a field index that did not match the `grep | paste` output. Changed it to print order and name from YAML and sort numerically by order.

## Review Notes
- The remaining examples are syntactically consistent with the current Calico `projectcalico.org/v3` GlobalNetworkPolicy schema and current Kubernetes `kubectl run` usage.
- The `wget https://kubernetes.default.svc` check may fail with an HTTP or TLS error even when network connectivity exists, depending on the image and cluster certificates. It is still useful as a quick connectivity probe, but a production runbook could make the expected failure mode explicit.

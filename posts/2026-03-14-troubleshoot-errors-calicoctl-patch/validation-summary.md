# Validation Summary: How to Troubleshoot Errors in calicoctl patch

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Kubernetes RBAC
- Calico GlobalNetworkPolicy
- Calico FelixConfiguration
- Python JSON processing

## Sources Consulted
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl installation and API group guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes RBAC authorization reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post described `calicoctl patch` as using JSON merge patch. Official calicoctl documentation lists strategic merge patch as the default and documents JSON Patch and JSON Merge Patch types as not yet implemented. Updated the introduction, prerequisites, troubleshooting note, and conclusion to refer to JSON input with the default strategic merge patch behavior.
- The post used a non-documented `--patch-file` option and a YAML patch file. Official calicoctl documentation shows `--patch`/`-p` and says only JSON format is accepted. Replaced those examples with JSON files passed through `--patch="$(cat /tmp/patch.json)"`.
- The complex patch preview used PyYAML without listing it as a prerequisite. Reworked the preview to fetch the resource as JSON and use only Python's standard `json` module.
- The array troubleshooting note claimed JSON merge patch array replacement semantics. Since the documented default is strategic merge patch, changed the wording to avoid attributing the behavior to JSON merge patch and advise patching the complete array when needed.

## Review Notes
The remaining Calico resource examples use documented resource kinds and fields: `GlobalNetworkPolicy.spec.order`, `selector`, ingress rules, TCP protocol, destination ports, and `FelixConfiguration.spec.logSeverityScreen`. The RBAC examples use the documented `projectcalico.org` API group and Kubernetes RBAC `apiGroups`, `resources`, and `verbs` fields. Exact runtime error text may vary by calicoctl and Kubernetes API server version.

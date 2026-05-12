# Validation Summary: Runbook: External API Access Failures from Calico Pods

## Status
validated

## Post Type
Runbook / On-call operations guide

## Technologies Covered
- Calico (CNI plugin / network policy enforcer)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Calico GlobalNetworkPolicy (calicoctl)
- kubectl (exec, get, patch, apply, delete)
- JSON Patch (RFC 6902) via `kubectl patch --type=json`
- DNS / HTTPS egress traffic flows

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API spec (networking.k8s.io/v1) — `ipBlock`, `except`, `egress`, `policyTypes`
- kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- JSON Patch RFC 6902 (array append using `-` path segment)
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl CLI reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
No technical issues found.

The technical content is accurate:
- `apiVersion: networking.k8s.io/v1` is the correct stable API version for NetworkPolicy.
- The egress rule structure correctly separates DNS (UDP/TCP 53, no `to` so it allows any destination) from HTTPS (`ipBlock` with RFC1918 exclusions on TCP 443).
- `ipBlock.except` accepts a list of CIDR strings; the inline JSON-style array `["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]` is valid YAML.
- The JSON Patch operation `{"op":"add","path":"/spec/egress/-","value":{...}}` correctly appends a new element to the egress array per RFC 6902.
- `calicoctl get globalnetworkpolicy -o yaml` is a valid command, and `action: Deny` is one of the valid Calico actions (Allow/Deny/Pass/Log).
- The diagnostic kubectl commands and curl/nslookup flags (`--connect-timeout`, `-v`) are correct.

## Review Notes
- `nslookup` is not present in every container image (e.g., distroless or minimal images may lack it). Operators may need to use `getent hosts`, `dig`, or a debug ephemeral container instead. This is a minor caveat and not a correctness issue.
- The emergency egress policy uses `podSelector: {}`, which applies to all pods in the namespace. This is appropriate for an emergency unblock but worth being explicit about in a production runbook so operators understand the blast radius.
- The post mixes standard Kubernetes NetworkPolicy with Calico GlobalNetworkPolicy diagnosis. Both are accurate, but readers should note that Calico's tiered policy model can cause a GlobalNetworkPolicy `Deny` to override a NetworkPolicy `Allow` depending on tier ordering — worth a future expansion if this runbook evolves.

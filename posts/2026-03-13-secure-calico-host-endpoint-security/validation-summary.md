# Validation Summary: Secure Calico Host Endpoint Security

## Status
validated

## Post Type
Guide / Hardening best-practices

## Technologies Covered
- Calico (v3.20+)
- Calico GlobalNetworkPolicy / HostEndpoint custom resources
- Felix (Calico's per-node agent) and FelixConfiguration
- Kubernetes RBAC (ClusterRole)
- kubectl / calicoctl
- Mermaid diagrams (documentation tooling)

## Sources Consulted
- Calico documentation — GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation — HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation — Felix configuration reference (logSeverityScreen, logFilePath): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation — Protect hosts: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Calico documentation — Selector / label expression syntax (`has(...)`, equality): https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy#selectors
- Calico documentation — Policy rule actions including `Log`, `Allow`, `Deny`: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy#rules
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes control plane / kubelet / NodePort port references: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- RFC 792 (ICMP types — type 8 = echo request)

## Issues Found
No technical issues found.

- `apiVersion: projectcalico.org/v3` and `kind: GlobalNetworkPolicy` are correct for Calico v3.20+.
- Selector expressions (`has(node)`, `node-role == 'control-plane'`) match Calico's documented selector grammar.
- Rule fields used (`action`, `protocol`, `destination.ports`, `source.nets`, `source.selector`, `notNets`, `order`, `icmp.type`, `icmp.code`) are all valid per the GlobalNetworkPolicy reference.
- ICMP type 8 / code 0 correctly identifies echo request (ping) per RFC 792.
- `action: Log` is a documented Calico policy action; the post correctly notes that processing continues to subsequent rules after a Log match (implicit in the example pairing Log → Deny).
- FelixConfiguration fields `logSeverityScreen` and `logFilePath` are valid spec fields per the Felix configuration reference.
- RBAC manifest uses the correct apiGroup `projectcalico.org` and the correct lower-case plural resource names `hostendpoints` and `globalnetworkpolicies`.
- Port numbers referenced (6443 kube-apiserver, 2379/2380 etcd peer/client, 10250 kubelet, 30000-32767 default NodePort range) are accurate.
- `kubectl label node ...` and `kubectl patch felixconfiguration ...` command syntax is correct.

## Review Notes
- For the labels applied via `kubectl label node` to flow through to HostEndpoint selectors, the cluster needs either manually-created HostEndpoints with matching labels or Calico's automatic host endpoints feature (configured via KubeControllersConfiguration) which syncs node labels onto the auto-generated HostEndpoint. This is implicit in the post's "host endpoints configured" prerequisite but readers using manual HostEndpoints should remember to set labels on the HEP resources themselves.
- The Hardening Practice 1 example sets `egress: action: Allow` without further qualification, which is a wide-open egress. This is intentional in the post (the section is about ingress hardening) but in production readers should harden egress similarly.
- The FelixConfiguration patch in Hardening Practice 4 only adjusts Felix's general logging (severity and file path); the per-flow packet logging is achieved through the `action: Log` rule below it. The two together are necessary — the section pairs them correctly, though the relationship could be made more explicit in a future revision.
- Calico v3.20 is the stated minimum; all features used (icmp type/code matching, Log action, FelixConfiguration fields) have been available since well before v3.20, so the version floor is conservative and safe.

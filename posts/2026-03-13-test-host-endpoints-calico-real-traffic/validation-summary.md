# Validation Summary: How to Test Host Protection with Calico Host Endpoints Using Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico HostEndpoint resource (`projectcalico.org/v3`)
- GlobalNetworkPolicy
- calicoctl
- Felix
- iptables

## Sources Consulted
- Calico HostEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host protection guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- calico-node binary flags (felix-live/felix-ready): https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- **`grep CALICO` for iptables output**: Calico creates iptables chains with the lowercase `cali-` prefix (e.g., `cali-INPUT`, `cali-FORWARD`, `cali-from-host-endpoint`, `cali-to-host-endpoint`), not `CALICO`. The `grep CALICO` command would return no results on a Calico-enabled host. Changed to `grep cali` so the command actually surfaces the relevant chains and rules.

## Review Notes
- The HostEndpoint spec fields (`interfaceName`, `node`, `expectedIPs`) and GlobalNetworkPolicy fields (`order`, `selector`, `applyOnForward`, `preDNAT`, `ingress`/`egress`, `types`) are all valid for the `projectcalico.org/v3` API.
- The selector `node == 'node01'` correctly matches the `node: node01` label on the HostEndpoint.
- `calico-node -felix-live` is a valid command-line liveness check exposed by the calico-node binary (single-dash Go-style flag).
- The conclusion contains the phrasing "Host Protection with Calico Host Endpoints with Calico" which is awkwardly worded but not a technical error, so it was left intact per the instructions to only fix technical issues.
- Users following this guide should be aware of Calico's failsafe ports (default 22, 68, 179, 2379, 2380, 5473, 6443, 6666, 6667) which protect against accidental lockout; this is implicitly handled but not mentioned in the post.

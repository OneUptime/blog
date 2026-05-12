# Validation Summary: How to Roll Out Calico Egress Gateway Policies Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- `projectcalico.org/v3` API (GlobalNetworkPolicy)
- calicoctl CLI
- kubectl CLI
- Felix (Calico's data plane daemon) and its Prometheus metrics
- Mermaid (for the architecture diagram)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Felix Prometheus metrics / monitoring documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics (Felix exposes Prometheus metrics on port 9091 by default)
- Calico Egress Gateway documentation (Calico Enterprise/Cloud): https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem

## Issues Found
No technical issues found.

- The `apiVersion: projectcalico.org/v3` and `kind: GlobalNetworkPolicy` are correct.
- The `selector: all()`, `app == 'authorized'`, and `app == 'permitted-destination'` selector syntax matches Calico's selector grammar.
- The `order`, `ingress`/`egress` rules with `action: Allow`, and `types: [Ingress, Egress]` fields are valid.
- The DNS allow rule (UDP/53) is correctly expressed.
- `calicoctl apply -f` and `calicoctl get globalnetworkpolicies -o wide` are valid commands.
- Felix's Prometheus endpoint default port `9091` is correct.
- The Mermaid `flowchart TD` syntax (with `\n` line breaks in node labels) is valid.

## Review Notes
- The title uses "Egress Gateway Policies" but the post describes egress filtering via a standard `GlobalNetworkPolicy`, not Calico's dedicated Egress Gateway feature (which uses `EgressGatewayPolicy`/egress gateway pods to route pod egress through a specific gateway IP, and is primarily a Calico Enterprise/Cloud feature). The terminology is loose but consistent throughout the post, and the technical content shown is accurate for what is presented. Future iterations could either rename to "Egress Network Policies" or expand to cover the actual Egress Gateway resource if that is the intent.
- The `felix_denied` grep pattern is a reasonable filter; the precise metric names Felix exposes for denied packets depend on installation and dataplane (iptables vs eBPF), and a substring match like `felix_denied` is a pragmatic way to surface relevant metrics.
- The Felix log path `/var/log/calico/felix.log` is typical for some installations but, depending on the deployment method (operator vs manifest, container runtime, OS), Felix logs may instead be available via `kubectl logs -n calico-system <calico-node-pod>` or `journalctl`. Readers should adapt the path to their setup.
- Minor non-technical wording: the introduction sentence reads "Calico Egress Gateway Policies in Calico provides..." — a small subject/verb mismatch and slight redundancy. Not changed per the instruction to only correct technical errors.

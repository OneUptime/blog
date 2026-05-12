# Validation Summary: How to Roll Out ICMP and Ping Rules in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico network policies (`projectcalico.org/v3` API)
- Calico ICMP / ICMPv6 rule matching (`protocol`, `icmp.type`, `icmp.code`)
- Kubernetes `kubectl`
- Calico `calicoctl`
- ICMP echo request/reply (ping)
- Mermaid (for architecture diagram)

## Sources Consulted
- Calico documentation: NetworkPolicy resource (including `icmp`/`notICMP` fields, supported `protocol` values) - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- IANA ICMP Type Numbers (Echo Request = type 8) - https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml
- IANA ICMPv6 Parameters (Echo Request = type 128) - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post's title and description are about ICMP and ping rules, but the example `NetworkPolicy` did not contain any ICMP rules — it only had a generic `Allow` ingress and a UDP/53 egress. Added explicit ingress and egress `Allow` rules with `protocol: ICMP` and `icmp.type: 8` (IPv4 Echo Request / ping), plus an IPv4-equivalent IPv6 ingress with `protocol: ICMPv6` and `icmp.type: 128` (IPv6 Echo Request), so the manifest actually implements what the title promises. The Calico NetworkPolicy reference documents `ICMP` and `ICMPv6` as protocol values and `icmp.type`/`icmp.code` as the matching fields.
- The implementation step ran `kubectl exec ... curl -s --max-time 5 http://target:8080`, which tests TCP/HTTP rather than ICMP/ping. Replaced with `ping -c 3 -W 5 target` so the connectivity test exercises the ICMP rules introduced in the manifest.
- The `calicoctl apply -f roll-policy.yaml` filename did not match the manifest. Updated to `roll-out-icmp-and-ping-rules.yaml` to match the policy `metadata.name`.
- The policy `metadata.name` was `roll-roll-out-icmp-and-ping-rules` (duplicated `roll-`). Renamed to `roll-out-icmp-and-ping-rules` and updated the apply command's filename accordingly.
- Text repetition / grammar: the introduction had "how to roll Roll Out ICMP and Ping Rules" and the conclusion had "Roll Roll Out ICMP and Ping Rules". Rewrote both sentences using natural noun/gerund phrasing while keeping the author's structure intact.

## Review Notes
- ICMP type 8 (Echo Request) is sufficient for the source's outbound ping; the destination's kernel will normally reply with type 0 (Echo Reply) on the established conntrack flow, so a separate allow for type 0 isn't required when Calico is using its default stateful connection tracking. If a reader disables conntrack or uses `doNotTrack`, they would need to add explicit type 0 (IPv4) / type 129 (IPv6) rules.
- The post does not call out that pure pod-to-pod ping over the overlay also depends on the dataplane (IPIP/VXLAN/eBPF) allowing ICMP between nodes; that is generally handled by Calico's `failsafeInboundHostPorts`/host endpoints rather than this `NetworkPolicy`, but it is worth flagging for cluster operators rolling this out on a hardened host.
- The Mermaid diagram is correct but generic (Source Pod → Policy Evaluation → Allow/Deny) and could be enhanced to show the ICMP-specific decision path in a future revision.
- Calico v3.26+ as a prerequisite is conservative; the `icmp`/`notICMP` fields have been part of the Calico v3 NetworkPolicy schema for many releases, so users on older v3.x versions can also use this pattern.

# Validation Summary: How to Select the Right Encapsulation for Calico Across Subnets

## Status
validated

## Post Type
Guide / Comparison tutorial

## Technologies Covered
- Calico (Kubernetes CNI)
- VXLAN encapsulation
- IP-in-IP encapsulation
- Kubernetes (kubectl, calicoctl)
- iperf3 (network benchmarking)
- Mermaid (diagrams)

## Sources Consulted
- Calico documentation on Overlay networking and IP pool encapsulation modes (https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip)
- Calico IPPool resource reference (`vxlanMode`, `ipipMode` fields with values `Never`, `Always`, `CrossSubnet`)
- RFC 7348 (VXLAN) - confirms UDP encapsulation, 8-byte VXLAN header, IANA-assigned destination port 4789
- RFC 2003 (IP Encapsulation within IP) - confirms IP protocol number 4 and 20-byte additional IP header overhead
- Calico for Windows documentation - confirms VXLAN supported on Windows, IP-in-IP is Linux-only
- kubectl run reference for `--overrides` JSON merge patch syntax

## Issues Found
No technical issues found.

The key technical claims were verified:
- VXLAN total overhead of 50 bytes is correct: outer IP (20) + outer UDP (8) + VXLAN header (8) + inner Ethernet frame (14) = 50 bytes. The outer Ethernet header is not counted because Ethernet framing is added regardless of encapsulation.
- IP-in-IP overhead of 20 bytes (one additional IP header) is correct.
- VXLAN uses UDP port 4789 (IANA-assigned).
- IP-in-IP uses IP protocol number 4.
- VXLAN is supported on Windows Calico nodes; IP-in-IP is not.
- Both modes support `CrossSubnet` to limit encapsulation to inter-subnet traffic only.
- `calicoctl patch ippool ... --type merge --patch '{"spec":{"vxlanMode":"Always","ipipMode":"Never"}}'` is a valid way to switch encapsulation; mutually setting one to `Always` and the other to `Never` avoids the constraint that both cannot be simultaneously enabled.
- The Mermaid diagram correctly accounts for the 50-byte VXLAN overhead by listing the four contributing components.

## Review Notes
- The `kubectl run ... -- iperf3 ... > results.txt` pattern will redirect kubectl's local stdout. Without `--attach` (or piping `kubectl logs` after the pod completes), the redirected file may contain only pod creation messages rather than the iperf3 results. This is a minor tutorial nuance rather than a technical inaccuracy about Calico/VXLAN.
- `kubectl run` for creating ad-hoc pods is still supported, but the `generator` flag has been removed in newer versions; the form used here (creating a simple Pod) is the current supported behavior.
- The post correctly notes that `protocol 4` (IPENCAP) may be blocked by some cloud providers' security groups (notably Azure historically), which is the practical reason many users prefer VXLAN in cloud environments.

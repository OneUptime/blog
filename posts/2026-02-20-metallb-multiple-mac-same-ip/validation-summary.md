# Validation Summary: How to Fix MetalLB Multiple MAC Addresses for the Same LB IP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- MetalLB Layer 2 mode
- MetalLB IPAddressPool CRDs
- ARP and MAC address troubleshooting
- kubectl
- tcpdump
- arping

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/
- MetalLB configuration guide: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage and IP sharing documentation: https://metallb.io/usage/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- iputils arping manual page: https://www.man7.org/linux/man-pages/man8/arping.8%40%40iputils.html
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html
- Local tcpdump help output for installed tcpdump 4.99.4

## Issues Found
- The post suggested checking Kubernetes Endpoints for MetalLB speaker leader election. Current MetalLB Layer 2 election is stateless and does not maintain an Endpoint leader record for each service, so this was replaced with `kubectl describe svc` service events and speaker log checks.
- The `arping` instructions mentioned the `-D` duplicate-address-detection flag, but the command did not use `-D`. The comment was corrected to describe the actual normal and broadcast `arping` commands shown.
- The duplicate-service explanation implied that two Services assigned the same IP by overlapping pools would normally make multiple speakers respond. MetalLB's documented default behavior rejects duplicate IP use unless IP sharing rules are satisfied, so the wording was corrected to treat duplicate assignment as something to investigate.
- The tcpdump verification pipeline used `awk '{print $NF}'`, which prints tcpdump's trailing length field rather than the MAC address on common tcpdump ARP output. The command now extracts the field after `is-at`.
- The sample tcpdump Ethernet headers showed ARP replies going to the broadcast MAC address. Normal ARP replies are commonly unicast to the requester, so the sample destination MAC was corrected.

## Review Notes
The post remains technically valid after the fixes. MetalLB log wording can vary by version and log level, so service events from `kubectl describe svc` are the more reliable first check for current releases.

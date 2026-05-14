# Validation Summary: How to Avoid Common Mistakes with L2 Interconnect Fabric with Calico

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IP-in-IP
- MTU configuration
- Linux networking diagnostics
- Security groups and firewall rules

## Sources Consulted
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes documentation: Field selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- IANA protocol numbers registry, https://www.iana.org/assignments/protocol-numbers
- RFC 7348: Virtual eXtensible Local Area Network (VXLAN), https://www.rfc-editor.org/rfc/rfc7348
- Local `ping -h` output for `-M` and `-s` option syntax

## Issues Found
- The post described both VXLAN and IP-in-IP as L2 overlay networking. VXLAN is an L2 overlay over UDP, but IP-in-IP is IP encapsulation, so I changed the broad terminology to "overlay" or "encapsulation protocol" where the text applies to both.
- The security group diagnosis only showed VXLAN commands. I added IP-in-IP checks using `tunl0` and `tcpdump` with `ip proto 4`, matching IP-in-IP's assigned protocol number.
- The MTU symptom used `ping -s 1400` as a generic failing example, which is not reliably true for VXLAN on 1500-byte underlays. I changed it to refer to `ping -s` near the expected pod MTU and clarified that failure means the usable path MTU is lower than expected.
- The MTU fix omitted Calico's documented caveat that MTU changes apply to new workloads. I added a sentence telling readers to recreate existing pods after changing MTU.
- The post said configuring both `vxlanMode` and `ipipMode` on the same IPPool creates unpredictable behavior. Current Calico IPPool documentation says the fields cannot be set at the same time, so I corrected the explanation.

## Review Notes
The `calico-system` namespace in the calico-node restart command is correct for operator-managed Calico installations. Manifest-based installations often use `kube-system`, so readers may need to adjust the namespace for their deployment.

# Validation Summary: How to Diagnose UFW Blocking Kubernetes When Using Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- UFW
- iptables/netfilter
- Kubernetes networking
- Calico CNI
- Calico BGP
- Calico IP-in-IP and VXLAN encapsulation
- Linux IP forwarding sysctl

## Sources Consulted
- Ubuntu ufw man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Local `ufw --help` output
- Local `iptables -h` output
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico data path documentation: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Kubernetes cluster networking documentation: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The post described UFW's default as a `FORWARD` policy of `DROP`. UFW documents this as a default routed policy, and `ufw status verbose` reports routed policy separately. I changed the wording to "default routed policy is deny" and noted that this commonly results in DROP policy or DROP rules for forwarded traffic.
- The symptom `iptables -L FORWARD -n` shows `DROP all` as the default policy was inaccurate. iptables displays default chain policy as `Chain FORWARD (policy DROP)`, while `DROP all` would be a rule line. I corrected the symptom to mention the actual chain policy output or UFW DROP rules before Calico accepts.
- The root cause claiming UFW rules added after Calico override Calico's ACCEPT rules was too broad. iptables uses first-match rule ordering, so the issue is whether UFW rules or policies are evaluated before Calico accepts traffic. I corrected this wording.
- The IPIP diagnostic comment said to "try sending encapsulated traffic" but only showed interface inspection commands. I changed it to accurately describe checking the Calico tunnel interface.
- The diagram suggested adding UFW rules for only protocol 4 and port 179. I generalized this to allowing the required Calico protocols and ports because VXLAN also uses UDP 4789 and IP-in-IP handling may require lower-level UFW rule configuration.
- Step 6 referred to a kernel "FORWARD policy" while the command checks the Linux `net.ipv4.ip_forward` sysctl. I renamed it to "Check kernel IP forwarding."

## Review Notes
Calico's current documentation recommends disabling host firewalls such as firewalld or other iptables managers unless carefully configured, because they may interfere with Calico-managed rules. The post remains valid as a diagnosis guide, but a future companion fix post should be careful to distinguish UFW routed rules, raw UFW rules files, and Calico HostEndpoint/GlobalNetworkPolicy options.

# Validation Summary: How to Configure Network Segmentation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Linux VLAN interfaces with iproute2
- Netplan VLAN configuration
- iptables firewall rules
- nftables firewall and NAT rules
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy and FQDN policies
- AWS VPC subnets and security groups
- Terraform AWS provider configuration
- kubectl-based verification commands

## Sources Consulted
- Linux ip-link manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iptables extensions manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables man page: https://www.netfilter.org/projects/nftables/manpage.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Layer 7 / DNS and FQDN policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- AWS VPC security group rules documentation: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Terraform AWS provider aws_security_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The iptables example allowed Internet HTTP/HTTPS traffic in the INPUT chain, which applies to traffic destined for the firewall host itself, not forwarded traffic to DMZ hosts. Changed those rules to FORWARD from `eth0` to `eth0.10`.
- The nftables example had the same DMZ issue by accepting HTTP/HTTPS in the input chain on `eth0.10`. Moved the rule to the forward chain for traffic from `eth0` to `eth0.10`.
- The CiliumNetworkPolicy example attempted to match frontend and database pods across namespaces without explicit namespace labels. Added `k8s:io.kubernetes.pod.namespace` selectors for the frontend and database namespaces.
- The Cilium FQDN egress example allowed `api.stripe.com` but did not allow DNS traffic with a Cilium DNS rule, which is needed for Cilium to learn DNS-to-IP mappings for FQDN policy enforcement. Added a kube-dns egress rule with a DNS `matchName`.
- The AWS subnet comments implied that `map_public_ip_on_launch` alone makes the DMZ subnet public and that security group egress alone provides outbound HTTPS routing. Clarified that a public subnet needs an internet gateway route table and that private subnet egress requires NAT or equivalent outbound routing.

## Review Notes
The Kubernetes NetworkPolicy YAML is syntactically valid and uses current `networking.k8s.io/v1` fields. DNS examples allow UDP/53; some production clusters also need TCP/53 for large DNS responses or zone transfers. Terraform AWS provider documentation currently recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources over inline rules for long-lived configurations, but the inline rule syntax shown remains valid for tutorial purposes.

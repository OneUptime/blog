# Validation Summary: How to Implement Network Segmentation Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Network segmentation
- VLANs and IEEE 802.1Q
- Cisco IOS switch configuration
- Linux iproute2 VLAN interfaces
- Netplan
- iptables
- nftables
- pfSense/OPNsense-style firewall policy
- PCI-DSS network segmentation
- AWS VPC, subnets, security groups, and network ACLs
- Terraform AWS provider
- Kubernetes NetworkPolicy
- Prometheus alerting rules

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- AWS VPC security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- AWS CLI `authorize-security-group-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS custom network ACLs and ephemeral ports: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- Terraform AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Netplan YAML reference for VLANs: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Cisco VLAN trunk configuration guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst1000/software/releases/15_2_7_e/configuration_guides/vlan/b_1527e_vlan_c1000_cg/configuring_vlan_trunks.html
- iptables manual and extension help: https://man7.org/linux/man-pages/man8/iptables.8.html
- nftables scripting and logging documentation: https://wiki.nftables.org/wiki-nftables/index.php/Scripting
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PCI Security Standards Council document library: https://www.pcisecuritystandards.org/document_library/

## Issues Found
- The introduction described segmentation as a core PCI-DSS requirement. Changed it to describe segmentation as a common way to reduce PCI-DSS scope, because PCI-DSS does not universally require every environment to segment networks.
- The iptables example placed the `LOG` rule before allow rules, which would log all forwarded traffic instead of only unmatched traffic. Moved logging to the end of the chain before the default `DROP` policy applies.
- The pfSense/OPNsense example called the snippet an export format. Changed it to a pf-style representation because it is illustrative rule syntax, not an actual pfSense export.
- The PCI-DSS section said PCI-DSS requires segmentation. Clarified that segmentation is optional for scope reduction, but must isolate the CDE from out-of-scope systems when used.
- The AWS CLI section said the web subnet has an internet gateway, but the commands do not create or attach one. Changed the comment to say the internet gateway and route table are added separately.
- The AWS CLI section said HTTP/HTTPS were allowed but only opened port 443. Added the missing port 80 ingress command.
- The Terraform NACL example allowed inbound ephemeral ports to the database subnet. Removed that rule because database response traffic should be covered by outbound ephemeral ports from the database subnet, not broad inbound ephemeral access to database instances.
- The Terraform NACL example used unquoted all-protocol values. Quoted `"-1"` to match the AWS provider's string protocol argument.
- The Kubernetes DNS egress policy allowed UDP/53 only. Added TCP/53 as well, since DNS can use TCP.
- The Prometheus alerts used a custom metric name and labels without stating the telemetry assumption. Added a comment noting that the rules assume flow telemetry exports `network_transmit_bytes_total` with `src_zone` and `dst_zone` labels.

## Review Notes
The remaining examples are intentionally illustrative and use placeholders such as `vpc-xxx`, `sg-web-xxx`, and `PAYMENT_PROCESSOR_IP`; they require environment-specific IDs, routing, persistence, and change-control steps before production use.

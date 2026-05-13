# Validation Summary: Document Calico Networking on AWS for Operators

## Status
validated

## Post Type
Operational documentation guide

## Technologies Covered
- Calico networking
- Kubernetes networking
- AWS VPC networking
- AWS EC2 source/destination checks
- AWS security groups and route tables
- calicoctl
- Mermaid diagrams

## Sources Consulted
- Calico documentation: Amazon Web Services - https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico documentation: Overlay networking - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: System requirements and network requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- AWS CLI documentation: ec2 modify-instance-attribute - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/modify-instance-attribute.html

## Issues Found
- The architecture diagram implied that the AWS VPC route table routes pod CIDRs directly to nodes while the rest of the post described VXLAN encapsulation. For a VXLAN CrossSubnet setup, Calico handles pod routing on the nodes and AWS route tables should be documented for subnet and egress routes. Changed the diagram label to "Subnet and egress routes."
- The IP addressing plan described CrossSubnet as "VXLAN within AZ, encap across AZ." Calico CrossSubnet encapsulation is based on subnet boundaries, not availability zones, and traffic within the same subnet is unencapsulated. Changed the wording to "VXLANCrossSubnet (encapsulated across subnet boundaries, unencapsulated within a subnet)."
- The IP addressing plan omitted outgoing NAT even though the troubleshooting table covered pod internet access. Calico documentation requires outgoing NAT on the IP pool for workload-to-WAN traffic in this AWS pattern. Added "NAT Outgoing: Enabled for workload-to-internet traffic."
- The security group inventory described IP-in-IP as a "backup." Calico does not automatically use IP-in-IP as a backup for VXLAN; it is needed only when IP-in-IP is enabled. Changed the purpose to "IP-in-IP, if enabled."
- The troubleshooting table attributed pod internet failures only to NAT gateway or VPC route table problems. Calico outgoing NAT can also be required. Updated the likely cause and quick fix to include Calico IP pool natOutgoing.

## Review Notes
The AWS CLI command `aws ec2 modify-instance-attribute --instance-id i-NEW --no-source-dest-check` and the `calicoctl ipam show --show-blocks` command are valid. The `/24` Calico block size shown in the sample is valid but differs from Calico's default IPv4 block size of `/26`; the post presents it as an example plan rather than a default.

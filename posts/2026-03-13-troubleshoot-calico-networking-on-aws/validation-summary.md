# Validation Summary: Troubleshoot Calico Networking on AWS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source networking and IPAM
- Kubernetes pods and Calico IP pools
- AWS EC2 source/destination checks
- AWS VPC security groups and route tables
- VXLAN and IP-in-IP encapsulation
- AWS CLI, kubectl, calicoctl, and tcpdump

## Sources Consulted
- Calico Open Source overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source IP pool migration documentation: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source FAQ for public cloud and AWS IP-in-IP behavior: https://docs.tigera.io/calico/latest/reference/faq
- Calico Open Source calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- AWS CLI modify-instance-attribute reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI describe-route-tables reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CLI create-route reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS EC2 source/destination check guidance: https://docs.aws.amazon.com/sap/latest/sap-netweaver/sap-nw-pacemaker-rhel-ec2-configuration.html

## Issues Found
- The introduction implied source/destination checks generally drop encapsulated traffic with pod source IPs. Updated the wording to specify unencapsulated pod traffic, which better matches AWS source/destination check behavior and Calico's AWS guidance.
- The VXLAN security group symptom said tcpdump would show VXLAN packets reaching the destination node while the security group dropped them. If a security group blocks inbound VXLAN, packets should not reach the instance interface capture. Updated the symptom to say no VXLAN packets reach the destination node.
- The encapsulation decision diagram combined VXLAN and IP-in-IP too loosely. Updated the label to distinguish UDP 4789 for VXLAN from IP protocol 4 for IP-in-IP.
- The IP-in-IP section stated AWS security groups do not have a protocol 4 rule in the console. Updated this to say there is no named IP-in-IP rule and that a custom protocol or CLI protocol number can be used.
- The security group sections only covered ingress. Added caveats that restricted egress rules also need to allow UDP 4789 for VXLAN and IP protocol 4 for IP-in-IP.
- The IPAM exhaustion example patched an existing IPPool CIDR to expand capacity. Calico documents adding a new IP pool and migrating/disabling old pools for pool changes, so the example now creates an additional IPPool within the Kubernetes cluster CIDR.

## Review Notes
The route table section is technically accurate for native routing at a high level, but a future improvement would be to show a complete `aws ec2 create-route` example and note that route targets may be instance IDs or network interface IDs depending on the node interface layout.

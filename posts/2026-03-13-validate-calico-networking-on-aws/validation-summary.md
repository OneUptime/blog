# Validation Summary: Validate Calico Networking on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- AWS EC2 and VPC networking
- AWS CLI
- calicoctl
- VXLAN and IP-in-IP encapsulation

## Sources Consulted
- Calico documentation: Amazon Web Services public cloud configuration, https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: IP pool resource and block sizes, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: kubectl wait, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- AWS CLI documentation: describe-instances, https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI documentation: describe-security-groups, https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html

## Issues Found
- The post stated that `calicoctl ipam show --show-blocks` should show one `/24` block per node. Calico's default IPv4 IPAM block size is `/26`, and a node can have one or more blocks depending on allocation pressure and IPPool configuration. Updated the expected output comment accordingly.
- The cross-AZ diagram and conclusion implied that cross-AZ traffic always uses VXLAN. Calico supports IP-in-IP and VXLAN, and CrossSubnet mode encapsulates only traffic that crosses subnet boundaries. Updated the diagram and conclusion to describe encapsulation conditionally.
- The test commands read pod IPs immediately after `kubectl run`, which can race pod creation and readiness. Added `kubectl wait pod/... --for=condition=Ready --timeout=60s` before reading pod IPs and running connectivity tests.
- The security group validation checked only `FromPort==4789`, which could match a non-UDP rule and did not cover IP-in-IP deployments. Updated the VXLAN check to require UDP port 4789 and added an IP-in-IP protocol 4 check.
- The conclusion said source/destination checks should always be disabled. Calico's AWS guidance requires this for native routing and cross-subnet IPIP scenarios, but the requirement depends on the selected routing and encapsulation mode. Updated the wording to say "when required by the selected routing mode."

## Review Notes
The example node names, security group ID, and AWS instance tag filter are placeholders and must be adapted to the target cluster. The post remains a validation checklist rather than a complete installation or remediation guide.

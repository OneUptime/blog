# Validation Summary: Troubleshoot Calico on Self-Managed AWS Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- AWS EC2
- AWS VPC security groups
- AWS CLI
- BGP, IP-in-IP, and VXLAN networking
- kubectl and calicoctl

## Sources Consulted
- Calico Open Source documentation: Self-managed Kubernetes in AWS: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/aws
- Calico Open Source documentation: System requirements and network ports/protocols: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source documentation: Overlay networking with IPIP and VXLAN: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source documentation: IP autodetection: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico Open Source documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- AWS CLI Command Reference: modify-instance-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI Command Reference: authorize-security-group-ingress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon VPC User Guide: Source/destination checks: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl reference: kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The original FelixConfiguration example set `interfacePrefix: eth` to select the AWS node interface. Calico documents `interfacePrefix` as the prefix for workload endpoint interfaces, not host node address selection. I replaced it with `IP_AUTODETECTION_METHOD=interface=eth0`, which is the documented manifest-install method for selecting a node interface.
- The original FelixConfiguration example used `ipipEnabled: true` as the main way to enable cross-AZ IPIP routing. Calico documents IPIP routing behavior on IP pools via `ipipMode`; Felix can infer IPIP interface setup from existing IP pools. I replaced the example with an IPPool patch that sets `ipipMode` to `CrossSubnet`, sets `vxlanMode` to `Never` because Calico does not allow both encapsulation modes on the same IP pool, and enables outgoing NAT.
- The cross-AZ tcpdump comment said traffic "should" go through IPIP unconditionally. I changed the wording to make it conditional on using IPIP mode, since VXLAN and no-overlay/BGP deployments will not show protocol 4 traffic.

## Review Notes
- The AWS CLI examples for disabling source/destination checks and adding security group ingress rules use current documented flags.
- Calico's required network rules match the documented protocol and port requirements: TCP 179 for BGP, IP-in-IP protocol 4, and UDP 4789 for VXLAN.
- `kubectl debug node` is a valid way to run node troubleshooting commands, but the chosen image must include the tools being executed or install them during the debug session.

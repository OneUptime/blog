# Validation Summary: Verify Pod Networking with Calico on Self-Managed AWS Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- AWS EC2
- AWS VPC route tables
- AWS security groups

## Sources Consulted
- Calico documentation: Self-managed Kubernetes in Amazon Web Services (AWS) - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/aws
- Calico documentation: Amazon Web Services public cloud reference - https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico documentation: Kubernetes system requirements and network requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Overlay networking - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- AWS CLI documentation: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI documentation: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- Amazon VPC documentation: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The TCP connectivity test used `nc -zv $POD_B_IP 80`, but `pod-b` was started with `sleep 3600`, so nothing was listening on port 80. I changed `pod-b` to run BusyBox `httpd` on port 80 so the TCP test can succeed when networking is working.
- The route-table lookup only checked explicit subnet route table associations. AWS subnets can also be implicitly associated with the VPC main route table, so I added a fallback lookup for the main route table when no explicit subnet association is returned.
- The best-practices section said to use "VPC CNI in overlay mode," which conflated AWS VPC CNI with Calico overlay networking. I changed this to "Calico overlay mode."

## Review Notes
The AWS CLI and kubectl binaries were not installed in the local environment, so command validation was performed against official AWS CLI and Kubernetes documentation rather than local `--help` output. The route-table verification step remains relevant only for deployments that intentionally use native routing with VPC route-table entries; Calico's AWS documentation commonly recommends encapsulation, especially across subnets or VPCs.

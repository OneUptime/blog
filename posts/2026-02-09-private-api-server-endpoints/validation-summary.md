# Validation Summary: How to Set Up Private Kubernetes API Server Endpoints on EKS, GKE, and AKS

## Status
validated

## Post Type
Technical tutorial / cloud configuration guide

## Technologies Covered
- Kubernetes API server endpoint access
- Amazon EKS and eksctl
- AWS CLI, AWS Client VPN, and Terraform AWS provider
- Google Kubernetes Engine (GKE)
- gcloud CLI, Cloud NAT, Cloud VPN, and Terraform Google provider
- Azure Kubernetes Service (AKS)
- Azure CLI, Azure Private Link, Azure Bastion, and Terraform AzureRM provider

## Sources Consulted
- Amazon EKS cluster API server endpoint documentation: https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS eksctl cluster access documentation: https://docs.aws.amazon.com/eks/latest/eksctl/vpc-cluster-access.html
- Terraform AWS provider `aws_eks_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider `aws_ec2_client_vpn_endpoint` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- Google Cloud GKE network isolation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation
- Google Cloud SDK `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Terraform Google provider `google_container_cluster` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- Google Cloud SDK `gcloud compute vpn-tunnels create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Microsoft Learn AKS private cluster documentation: https://learn.microsoft.com/azure/aks/private-clusters
- Microsoft Learn AKS network access security documentation: https://learn.microsoft.com/azure/architecture/aws-professional/eks-to-aks/private-clusters
- Terraform AzureRM provider `azurerm_kubernetes_cluster` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster

## Issues Found
- Corrected the generic "private with authorized networks" description to avoid implying that every provider supports CIDR allowlists on private API endpoints.
- Removed the outdated `aws-iam-authenticator` install instruction from the EKS bastion workflow because the shown `aws eks update-kubeconfig` flow uses AWS CLI token authentication.
- Corrected the GKE Cloud NAT section. Cloud NAT provides outbound internet access and response traffic for private resources; it does not provide inbound access from outside to a private GKE control plane.
- Fixed the GKE Cloud VPN tunnel command by adding the required target VPN gateway flag for the shown peer-address tunnel shape.
- Changed the AKS CLI example from `--private-dns-zone none` to `--private-dns-zone system` so the simple private cluster example includes AKS-managed private DNS resolution.
- Changed the AKS Terraform example from a custom private DNS zone ID with a system-assigned identity to `private_dns_zone_id = "System"`, matching the simplified managed DNS pattern.
- Corrected the AKS authorized IP ranges section to state that authorized IP ranges apply to public AKS API server endpoints, not private endpoints, and updated the command target from `private-cluster` to `public-cluster`.
- Removed the claim that GKE Cloud Shell automatically has access to private clusters, replacing it with a VM or VPN-connected host workflow.
- Clarified the conclusion so EKS is described as using a private API server endpoint with managed private DNS, avoiding confusion with traditional AWS PrivateLink VPC endpoints.

## Review Notes
The examples are still intentionally partial infrastructure snippets. Real deployments also need provider authentication, IAM/RBAC access, subnets, route tables, firewall/security group rules, DNS links, VPN route/authorization resources, and production hardening around audit logging and access control.

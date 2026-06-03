# Validation Summary: How to Set Up VPC Peering Between Kubernetes Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services, EndpointSlices, and CoreDNS
- Amazon EKS, Amazon VPC peering, AWS CLI, and AWS Terraform resources
- Google Kubernetes Engine, Google Cloud VPC Network Peering, gcloud, and Google Terraform resources
- Azure Kubernetes Service, Azure Virtual Network peering, Azure CLI, and Azure Terraform resources
- Cross-cloud private connectivity with VPN and dedicated interconnect services

## Sources Consulted
- AWS VPC Peering Guide: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- AWS CLI `create-vpc-peering-connection`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- Terraform AWS provider `aws_vpc_peering_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- Terraform AWS provider security group guidance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Google Cloud VPC Network Peering: https://docs.cloud.google.com/vpc/docs/vpc-peering
- Google Cloud SDK `gcloud compute networks peerings create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- GKE VPC-native clusters: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Azure Virtual Network peering documentation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Azure CLI `az network vnet peering`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering
- Terraform AzureRM provider `azurerm_virtual_network_peering`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering

## Issues Found
- The post described VPC peering as a cross-cloud peering mechanism. Updated the wording to distinguish same-provider VPC/VNet peering from cross-cloud VPN or dedicated interconnect connectivity.
- The AWS Terraform peering example used `auto_accept = true` without saying it only applies to same-account, same-Region peering. Updated the scope statement accordingly.
- The AWS security group rules used port range `0-65535` with protocol `-1`. Changed `to_port` to `0`, matching the all-protocol convention used by AWS security group rules.
- The EKS connectivity test used a Kubernetes `ClusterIP` from another cluster and configured nginx on port `8080`. Changed the example to test a routable pod IP on nginx port `80`.
- The GKE firewall Terraform referenced `google_compute_network.*.ip_cidr_range`, which is not a valid VPC network attribute for modern Google Cloud VPCs. Replaced it with node and pod CIDR variables.
- The GKE section did not call out that pod-to-pod routing depends on VPC-native clusters or otherwise routable pod ranges. Added that caveat.
- The AKS section did not call out that pod-to-pod routing depends on Azure CNI or another routable pod networking configuration. Added that caveat.
- The AWS-to-GCP and AWS-to-Azure Terraform snippets were incomplete and referenced undefined resources. Replaced them with accurate resource-level guidance for VPN and dedicated interconnect designs.
- The Aviatrix installation and CLI commands were not verifiable from official documentation in the form shown. Replaced them with a vendor-documentation caveat.
- The ExternalName example mapped a Service to an IP address, which Kubernetes treats as a DNS name rather than an IP endpoint. Replaced it with a selectorless Service and EndpointSlice example.
- The CoreDNS rewrite example pointed to the old ExternalName-style DNS name. Updated it to point to the selectorless Service.
- The GCP CIDR overlap troubleshooting command listed networks instead of subnet primary and secondary ranges. Replaced it with `gcloud compute networks subnets list`.
- The conclusion overstated VPC peering as essential for multi-cloud deployments. Updated it to include private cross-cloud connectivity as the correct alternative.

## Review Notes
The guide is now technically accurate as a high-level implementation guide. It still uses placeholder Terraform variables and resource names, so readers must map the snippets to their actual VPC, subnet, route table, firewall, and Kubernetes network CIDR values.

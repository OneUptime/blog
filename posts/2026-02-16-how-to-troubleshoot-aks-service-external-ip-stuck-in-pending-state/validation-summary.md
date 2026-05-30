# Validation Summary: How to Troubleshoot AKS Service External IP Stuck in Pending State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Services of type LoadBalancer
- Azure Load Balancer
- Azure Public IP resources
- Azure Network Security Groups
- Azure CLI
- Kubernetes kubectl

## Sources Consulted
- Microsoft Learn: Use a static public IP address and DNS label with the Azure Kubernetes Service load balancer - https://learn.microsoft.com/en-us/azure/aks/static-ip
- Microsoft Learn: Use an internal load balancer with Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/internal-lb
- Microsoft Learn: Configure a public standard load balancer in Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Microsoft Learn: Use a public standard load balancer in Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/load-balancer-standard
- Microsoft Learn: Use multiple load balancers in Azure Kubernetes Service (preview) - https://learn.microsoft.com/en-us/azure/aks/use-multiple-standard-load-balancer
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Azure Load Balancer error codes - https://learn.microsoft.com/en-us/troubleshoot/azure/load-balancer/load-balancer-common-deployment-errors
- Microsoft Learn: Azure CLI network command reference - https://learn.microsoft.com/en-us/cli/azure/network
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said an empty service Events section means the cloud controller manager has not attempted load balancer creation. I changed this to a less absolute explanation because events can also be delayed or expired.
- The subnet exhaustion section implied a custom VNet external load balancer always needs a free subnet IP. I narrowed this to internal load balancers, where the frontend private IP is allocated from the subnet.
- The RBAC section treated managed identity and service principal clusters the same while showing only the managed identity query. I clarified that the command is for managed identity based clusters and that custom VNets, subnets, route tables, and public IPs in other resource groups need appropriate permissions on those resources.
- The SKU section described Basic SKU compatibility as if it were still current. I updated it to note that AKS no longer supports Basic Load Balancer as of September 30, 2025.
- The static public IP example used `spec.loadBalancerIP`, which is deprecated upstream and no longer the recommended AKS pattern. I changed the example to use `service.beta.kubernetes.io/azure-pip-name` with `service.beta.kubernetes.io/azure-load-balancer-resource-group`.
- The NSG section presented blocked health probes as a normal cause of `<pending>`. I clarified that this usually causes traffic or health failures after IP assignment rather than pending allocation.
- The cloud controller manager section showed `kubectl` commands for inspecting control-plane pods on AKS. I replaced them with guidance to use service events and Azure activity logs because the AKS control plane is managed.
- The load balancer rule limit section described the limit as 300 rules per Standard Load Balancer and suggested an annotation that did not create a separate load balancer. I corrected this to the AKS node NIC inbound rule limit and the current multiple Standard Load Balancers preview placement annotation.
- The quota command comment said it checked regional public IP usage, but the command only counts public IPs in the node resource group. I corrected the comment.

## Review Notes
The post is now technically valid for current AKS guidance. The multiple Standard Load Balancers feature is still preview, so production users should review AKS preview feature support limitations before adopting it.

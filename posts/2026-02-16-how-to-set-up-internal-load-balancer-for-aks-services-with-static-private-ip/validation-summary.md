# Validation Summary: How to Set Up Internal Load Balancer for AKS Services with Static Private IP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Services and Deployments
- Azure Internal Load Balancer
- Azure CLI
- Azure Virtual Network and subnets
- Azure Private DNS

## Sources Consulted
- Microsoft Learn: Create an Internal Load Balancer in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/internal-lb
- Microsoft Learn: Configure a Public Standard Load Balancer in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Cloud Provider Azure: Azure LoadBalancer annotations: https://cloud-provider-azure.sigs.k8s.io/topics/loadbalancer/
- Microsoft Learn: az network vnet subnet CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: az network private-dns CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/private-dns
- Microsoft Learn: az network private-dns record-set a CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/a
- Microsoft Learn: Private IP addresses in Azure: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/private-ip-addresses
- Kubernetes Documentation: Service: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Documentation: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The static IP examples used `spec.loadBalancerIP`. This field still works in existing Services, but Kubernetes deprecated it in v1.24 and AKS now recommends the provider-specific `service.beta.kubernetes.io/azure-load-balancer-ipv4` annotation for new Services. Updated all static IP examples and the explanatory text.
- The subnet availability command used `az network vnet subnet show` with a query that counted assigned IP configurations, not available IPs. Replaced it with `az network vnet subnet list-available-ips --ids "$AKS_SUBNET_ID"`.
- The custom HTTP health probe example set a request path but did not set `appProtocol: http`. AKS ignores the request path for TCP probes when `appProtocol` is empty. Added `appProtocol: http` and updated the explanation.
- The temporary curl pod command omitted `--command`, so `kubectl run` could pass the command as arguments instead of overriding the container command. Added `--restart=Never` and `--command` to match the documented `kubectl run` syntax.

## Review Notes
The core AKS internal load balancer annotation remains valid. Local `az` and `kubectl` binaries were not installed in the review environment, so CLI syntax was verified against official documentation rather than local help output.

# Validation Summary: How to Set Up Istio Ingress with Azure Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- IstioOperator
- Istio Gateway API resources
- Azure Kubernetes Service (AKS)
- Azure Load Balancer
- Azure CLI
- Kubernetes Services and HorizontalPodAutoscaler
- Azure DNS
- Network Security Groups

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installing gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio secure ingress gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- AKS static public IP for LoadBalancer Services: https://learn.microsoft.com/en-us/azure/aks/static-ip
- AKS internal load balancer documentation: https://learn.microsoft.com/en-us/azure/aks/internal-lb
- AKS public Standard Load Balancer configuration and annotations: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Azure service limits for Load Balancer: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Azure CLI reference for public IP and DNS record commands: https://learn.microsoft.com/en-us/cli/azure/network/public-ip and https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a

## Issues Found
- The static public IP example used `service.loadBalancerIP`. Kubernetes deprecated `.spec.loadBalancerIP` in v1.24, and AKS now recommends provider annotations. Changed the IstioOperator example to use `service.beta.kubernetes.io/azure-pip-name` and clarified the resource group annotation.
- The static internal IP example used `loadBalancerIP`. Changed it to the AKS-recommended `service.beta.kubernetes.io/azure-load-balancer-ipv4` annotation.
- The health probe section implied AKS would automatically use Istio's `15021` `/healthz/ready` endpoint. AKS default health probe behavior varies by protocol, app protocol, and traffic policy, so the post now shows explicit Azure Load Balancer probe annotations for ports 80 and 443.
- The scaling section stated that Azure Standard Load Balancer supports up to 1000 backend pool instances. Current Azure limits list a Standard Load Balancer backend pool size of 5000, so this was corrected.

## Review Notes
The Istio `IstioOperator` examples are valid for istioctl-based installs, but Istio's current production guidance recommends managing gateways separately from the control plane where possible. The post remains technically valid as an IstioOperator-focused guide.

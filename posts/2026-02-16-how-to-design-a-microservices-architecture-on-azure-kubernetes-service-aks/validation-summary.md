# Validation Summary: How to Design a Microservices Architecture on Azure Kubernetes Service (AKS)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Deployments, Services, Namespaces, NetworkPolicies, Ingress, and HorizontalPodAutoscaler
- AKS node pools, system node pools, user node pools, and Spot node pools
- Istio-based service mesh add-on for AKS
- Azure Service Bus and Azure Event Hubs
- Azure Key Vault Provider for Secrets Store CSI Driver
- NGINX Ingress Controller
- Azure Application Gateway Ingress Controller
- C# and Azure.Messaging.ServiceBus

## Sources Consulted
- Microsoft Learn: Create and manage node pools in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft Learn: Manage system node pools in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Microsoft Learn: Add an Azure Spot node pool to an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Secure pod traffic with network policies in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Kubernetes Documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Documentation: Services and service discovery - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Documentation: Namespaces and DNS - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Microsoft Learn: Deploy Istio-based service mesh add-on for Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/istio-deploy-addon
- Microsoft Learn: Use the Azure Key Vault Provider for Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Microsoft Learn: Access Azure Key Vault with the CSI Driver Identity Provider - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Kubernetes API Reference: HorizontalPodAutoscaler autoscaling/v2 - https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Ingress-NGINX Controller Documentation: Annotations - https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Microsoft Learn: Azure Service Bus messages, payloads, and serialization - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messages-payloads
- Microsoft Learn: Azure.Messaging.ServiceBus namespace and ServiceBusMessage API - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus

## Issues Found
- The NetworkPolicy example allowed all pods in a namespace labeled `name=ingress`, while the prose said only the ingress controller should reach the service. I changed the rule to use the built-in namespace label `kubernetes.io/metadata.name: ingress` and added a `podSelector` for `app.kubernetes.io/name: ingress-nginx`, so the namespace and pod selectors are combined in one peer rule.
- The gRPC ClusterIP Service included `service.beta.kubernetes.io/azure-load-balancer-health-probe-protocol: "TCP"` with a comment saying it enabled HTTP/2. That annotation is for Azure Load Balancer health probes and does not enable HTTP/2 for a ClusterIP Service, so I removed the annotation and comment.
- The Istio sidecar injection example used a fixed, old `asm-1-17` revision. I added `az aks mesh get-revisions`, set a current example revision variable, and used that variable for both `az aks mesh enable --revision` and the namespace label.
- The Azure Key Vault CSI `SecretProviderClass` omitted the managed identity parameters needed by the Azure provider example. I added `usePodIdentity`, `useVMManagedIdentity`, and `userAssignedIdentityID`.
- The HPA comment said the example used custom metrics, but the manifest only uses CPU and memory resource metrics. I corrected the comment.
- The NGINX Ingress example used the non-existent `nginx.ingress.kubernetes.io/rate-limit` annotation. I changed it to the documented `nginx.ingress.kubernetes.io/limit-rps` annotation.

## Review Notes
The post is technically relevant and suitable as a practical AKS microservices guide. Some examples remain intentionally illustrative and would still require environment-specific values such as resource group, location, tenant ID, managed identity client ID, Key Vault name, image names, TLS secret, and available Istio revision.

# Validation Summary: How to Deploy a Headless Commerce Backend on Azure Kubernetes Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service
- Kubernetes Deployments, Services, Ingress, and HorizontalPodAutoscaler
- ingress-nginx
- Helm
- Azure CLI
- Azure Cache for Redis and Azure Managed Redis
- Azure Key Vault
- Secrets Store CSI Driver with Azure provider
- Azure Service Bus
- Azure Monitor Container Insights

## Sources Consulted
- Microsoft Learn: Azure CLI `az aks create` and cluster autoscaler examples: https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az redis create`: https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Azure Cache for Redis retirement guidance: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Microsoft Learn: AKS Key Vault Secrets Store CSI Driver: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Microsoft Learn: AKS Key Vault CSI Driver identity access: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Kubernetes API reference: HorizontalPodAutoscaler `autoscaling/v2`: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes documentation: Ingress concepts and `networking.k8s.io/v1`: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- Secrets Store CSI Driver documentation: sync as Kubernetes Secret: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret

## Issues Found
- The `commerce` namespace was used by all manifests but never created. Added `kubectl create namespace commerce` after fetching AKS credentials.
- The ingress used `nginx.ingress.kubernetes.io/rate-limit`, which is not the documented ingress-nginx rate limit annotation. Replaced it with `nginx.ingress.kubernetes.io/limit-rps`.
- The ingress used `nginx.ingress.kubernetes.io/rewrite-target: /`, which would rewrite all matched API paths to `/` unless capture groups were configured. Removed the rewrite annotation so path-based routing preserves the request path.
- The Azure Cache for Redis command used `--enable-non-ssl-port false`, but the Azure CLI documents this as a switch that enables the non-TLS port when specified. Removed it and added `--minimum-tls-version 1.2`.
- Azure Cache for Redis now has a published retirement timeline. Added a note to evaluate Azure Managed Redis for new production builds.
- The cart and checkout deployments were referenced by the ingress but did not define corresponding Kubernetes Services. Added `ClusterIP` Services for both.
- The SecretProviderClass claimed to map Key Vault secrets to Kubernetes secrets but did not define `secretObjects`. Added `secretObjects` mappings for the Kubernetes secrets consumed by the sample deployments and expanded the Key Vault object list.
- Clarified that Secrets Store CSI Driver Kubernetes Secret sync occurs after a pod mounts the CSI volume.

## Review Notes
The examples remain illustrative and assume supporting resources such as the resource group, container registry images, Key Vault contents, Service Bus namespace, TLS secret, order service, and monitoring stack already exist or are created elsewhere. For a production commerce platform, the post could later add workload identity, private networking, PodDisruptionBudgets, multi-zone node pools, and complete manifests for the order and inventory services.

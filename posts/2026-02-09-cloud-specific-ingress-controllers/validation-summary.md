# Validation Summary: How to Configure Cloud-Specific Ingress Controllers on EKS, GKE, and AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- AWS EKS
- AWS Load Balancer Controller
- AWS Application Load Balancer and Network Load Balancer
- Google Kubernetes Engine Ingress
- Google-managed SSL certificates
- GKE BackendConfig
- Azure Kubernetes Service
- Azure Application Gateway Ingress Controller
- Helm
- AWS CLI, eksctl, gcloud CLI, Azure CLI

## Sources Consulted
- AWS EKS documentation: Install AWS Load Balancer Controller with Helm - https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- AWS EKS documentation: Route application and HTTP traffic with Application Load Balancers - https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- AWS Elastic Load Balancing documentation: Security policies for Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Google Cloud documentation: GKE Ingress for Application Load Balancers - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Google Cloud documentation: Configure Ingress for external Application Load Balancers - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
- Google Cloud documentation: Configuring Ingress for internal Application Load Balancers - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balance-ingress
- Google Cloud documentation: Secure traffic for GKE Ingress / Google-managed certificates - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-traffic-management
- Google Cloud documentation: Ingress configuration and BackendConfig - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Microsoft Learn: Install Application Gateway Ingress Controller with an existing Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-install-existing
- Microsoft Learn: Application Gateway Ingress Controller annotations - https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- Kubernetes documentation: Ingress concepts and path types - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes API reference: networking.k8s.io/v1 Ingress - https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/

## Issues Found
- The AWS Load Balancer Controller description said it provisions ALBs and NLBs for Kubernetes Ingress resources. Updated it to clarify that ALBs are provisioned for Ingress resources and NLBs are provisioned for Service resources.
- The AWS install example used the moving `main` branch IAM policy URL and mismatched the downloaded filename with `file://iam-policy.json`. Updated the command to the current EKS-documented v2.14.1 policy URL and `file://iam_policy.json`.
- The AWS `eksctl create iamserviceaccount` example omitted current documented flags for region and existing service account handling. Added `--region us-east-1` and `--override-existing-serviceaccounts`.
- The AWS Helm install example did not pin the chart version shown in current EKS docs. Added `--version 1.14.0` and changed `helm repo update` to `helm repo update eks`.
- The AGIC install example used the older Blob Storage Helm repository. Updated it to the current Microsoft OCI chart reference with `--version 1.8.1`.
- The AGIC Helm install example omitted explicit RBAC configuration from the current Microsoft example. Added `--set rbac.enabled=true`.
- The AGIC path-based routing example used wildcard paths (`/api/*` and `/*`) with `pathType: Prefix`. Kubernetes Prefix path matching does not use wildcard suffixes, so these were changed to `/api` and `/`.
- The TLS section labeled `appgw.ingress.kubernetes.io/appgw-ssl-certificate` as "with Key Vault", but the annotation references an SSL certificate already configured on Application Gateway. Updated the label to "with an Application Gateway SSL certificate".
- The GKE BackendConfig example defined only the BackendConfig resource, which would not affect a backend unless attached to a Service. Added a minimal Service with the required `cloud.google.com/backend-config` annotation.

## Review Notes
- The GKE examples correctly use `kubernetes.io/ingress.class` rather than `spec.ingressClassName`; Google Cloud documentation states that GKE Ingress classes must be specified with the annotation.
- The GKE `/*` paths use `pathType: ImplementationSpecific`, which is consistent with common GKE Ingress examples for Google Cloud load balancers.
- The AWS TLS policy shown is still a valid ALB policy, but newer TLS 1.3 policies are available and may be preferable for modern clients.

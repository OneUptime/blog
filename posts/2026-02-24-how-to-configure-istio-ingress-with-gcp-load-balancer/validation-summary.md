# Validation Summary: How to Configure Istio Ingress with GCP Load Balancer

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Istio
- Google Kubernetes Engine
- Google Cloud Load Balancing
- GKE Ingress
- Kubernetes Services
- Google-managed certificates
- BackendConfig
- Network Endpoint Groups
- Cloud Armor
- Cloud CDN

## Sources Consulted
- Google Cloud GKE LoadBalancer Service concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Google Cloud GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- Google Cloud GKE Ingress configuration and BackendConfig: https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Google Cloud GKE managed certificates: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- Google Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud SDK `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Istio install with istioctl and IstioOperator usage: https://istio.io/latest/docs/setup/install/istioctl/
- Istio secure ingress gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post stated that the default external IP for a GKE `LoadBalancer` Service is regional and static. GKE assigns an ephemeral IP unless a static address is configured, so this was corrected.
- The static IP example used `networking.gke.io/load-balancer-type: "External"`, which is not the documented annotation for selecting an external LoadBalancer Service. The example now uses the documented `cloud.google.com/l4-rbs: "enabled"` best-practice annotation for backend service-based external passthrough Network Load Balancers.
- The BackendConfig and NEG section did not state that these annotations are consumed by the GKE Ingress controller and only apply when a Service port is referenced by an Ingress. Added that requirement.
- The Google-managed certificate example reused the regional Service `LoadBalancer` static IP name in an Ingress annotation that expects a global static IP address name. The example now uses a distinct global static IP name and explains the difference.
- The health check wording implied the default Network Load Balancer checks the Istio readiness endpoint directly. GKE LoadBalancer Service health checks are node-level, so the wording now distinguishes that from the BackendConfig health check on port 15021.
- The firewall guidance listed incomplete IPv4 health check ranges for external passthrough Network Load Balancers and implied port 15021 was always the health check port. The guidance now distinguishes Application Load Balancer/internal passthrough ranges from external passthrough Network Load Balancer ranges and clarifies the target port.
- The troubleshooting section said Google-managed certificates can take up to 60 minutes. Current Google documentation says provisioning can take several hours, so the wording was updated.

## Review Notes
The post is now technically valid as a high-level GKE/Istio guide. A future update could add a complete paired GKE Ingress manifest for the BackendConfig/NEG section, but the existing examples are accurate with the added caveat that a referenced Ingress is required.

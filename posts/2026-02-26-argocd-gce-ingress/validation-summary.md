# Validation Summary: How to Expose ArgoCD with GCE Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Google Kubernetes Engine (GKE)
- Kubernetes Ingress, Service, ConfigMap, and Secret resources
- GKE BackendConfig, FrontendConfig, and ManagedCertificate CRDs
- Google Cloud external Application Load Balancers
- Google-managed SSL certificates
- Google Cloud Armor
- Identity-Aware Proxy (IAP)
- Google Cloud CLI (`gcloud`)
- Argo CD CLI

## Sources Consulted
- GKE Ingress concepts and health check behavior — https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE Ingress health check troubleshooting — https://cloud.google.com/kubernetes-engine/docs/troubleshooting/ingress-health-checks
- GKE Ingress configuration, BackendConfig, FrontendConfig, Cloud Armor, and IAP — https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Secure traffic for GKE Ingress with Google-managed certificates — https://cloud.google.com/kubernetes-engine/docs/how-to/secure-traffic-management
- Google Cloud SDK: `gcloud compute security-policies rules create` — https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK: `gcloud compute security-policies rules update` — https://cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/update
- Argo CD ingress documentation and `--grpc-web` guidance — https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/

## Issues Found
- The post gave a fixed 3 to 5 minute provisioning estimate for GCE Ingress. Changed this to "several minutes" because Google-managed load balancer and certificate provisioning times vary.
- The Ingress section referenced a global static IP annotation before telling readers to reserve the static IP. Added a note to reserve the IP before applying the Ingress.
- The Cloud Armor example allowed RFC 1918 private address ranges for an external load balancer. Updated the example to use trusted public CIDR ranges, because Cloud Armor source IP filtering for internet clients evaluates client source IPs seen by the external HTTP(S) load balancer.
- The managed certificate verification note said provisioning takes up to 15 minutes. Updated it to 60 minutes, matching current GKE documentation.
- The troubleshooting section said GCE health checks hit pods directly in all cases. Updated it to distinguish NEG-backed services, where health checks target pod IPs, from instance group backends, where health checks target the service NodePort.

## Review Notes
- The Kubernetes manifests use current API versions for Ingress (`networking.k8s.io/v1`), BackendConfig (`cloud.google.com/v1`), ManagedCertificate (`networking.gke.io/v1`), and FrontendConfig (`networking.gke.io/v1beta1`).
- The GKE managed certificate annotation and `kubernetes.io/ingress.class: "gce"` usage match current GKE documentation.
- The BackendConfig health check fields, Cloud Armor `securityPolicy` field, IAP fields, and HTTPS redirect `responseCodeName` are valid for GKE Ingress.
- The Argo CD CLI `--grpc-web` note is consistent with Argo CD ingress documentation for environments that do not route native gRPC over HTTP/2 to the server.

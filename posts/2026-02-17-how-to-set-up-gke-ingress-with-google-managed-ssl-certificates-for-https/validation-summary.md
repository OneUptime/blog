# Validation Summary: How to Set Up GKE Ingress with Google-Managed SSL Certificates for HTTPS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Ingress
- Kubernetes Service and NodePort
- Google-managed SSL certificates
- Google Cloud external Application Load Balancing
- GKE ManagedCertificate, FrontendConfig, and BackendConfig CRDs
- gcloud CLI

## Sources Consulted
- Google Cloud documentation: Secure traffic for GKE Ingress - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-traffic-management
- Google Cloud documentation: GKE Ingress for Application Load Balancers - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Google Cloud documentation: Ingress configuration - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Google Cloud Certificate Manager documentation: Domain authorization types for Google-managed certificates - https://docs.cloud.google.com/certificate-manager/docs/domain-authorization
- Kubernetes documentation: Ingress API networking.k8s.io/v1 - https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes documentation: Service type NodePort - https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The initial Service comment said GKE Ingress requires NodePort or ClusterIP. I changed it to state that NodePort is used unless container-native load balancing with NEGs is being used, matching GKE's documented backend behavior.
- The DNS and certificate provisioning explanation described HTTP validation and said the certificate starts provisioning immediately. I changed this to describe load balancer/domain validation more generally, and noted that the ManagedCertificate cannot become active until attached to an Ingress.
- The provisioning timing said 10-30 minutes and troubleshooting used a 30-minute threshold. I updated this to the documented "up to 60 minutes" expectation and noted that load balancer/certificate programming can sometimes take several hours.
- The Ingress annotation comment incorrectly labeled `kubernetes.io/ingress.class: "gce"` as an HTTP-to-HTTPS redirect. I changed it to identify the external GKE Ingress controller.
- The health check section said load balancer health checks always run against pods. I clarified that health checks target Pod IPs with NEGs and node NodePorts with instance group backends.
- The BackendConfig example used `port: 80` with a NodePort Service. I changed the example to use an explicit NodePort `30080` for instance group backends and added a note that NEG backends should use the serving container port instead.

## Review Notes
The examples use `kubernetes.io/ingress.class`, which is deprecated in upstream Kubernetes but still required by GKE Ingress; this is correct for GKE. `FrontendConfig` still uses `networking.gke.io/v1beta1` in current Google Cloud examples even though HTTP-to-HTTPS redirects are GA.

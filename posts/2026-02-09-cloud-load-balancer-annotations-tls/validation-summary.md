# Validation Summary: How to Configure Cloud Provider Load Balancer Annotations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and Ingress
- AWS EKS and AWS Load Balancer Controller
- AWS Network Load Balancer, ACM certificates, and PROXY protocol v2
- Google Kubernetes Engine, GKE Ingress, BackendConfig, ManagedCertificate, and LoadBalancer Services
- Google Cloud Application Load Balancers, passthrough Network Load Balancers, and proxy Network Load Balancers
- Azure Kubernetes Service and Azure Load Balancer
- NGINX PROXY protocol handling
- kubectl, openssl, and curl

## Sources Consulted
- Kubernetes Service protocol reference: https://kubernetes.io/docs/reference/networking/service-protocols/
- AWS Load Balancer Controller Service annotations v3.2: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- Amazon EKS Auto Mode Network Load Balancer annotation reference: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS Elastic Load Balancing target group attributes and PROXY protocol v2: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- GKE Ingress concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE Ingress configuration with BackendConfig and FrontendConfig: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- GKE Google-managed SSL certificates: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- GKE LoadBalancer Service parameters: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- GKE LoadBalancer Service concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Google Cloud external proxy Network Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/tcp
- Microsoft AKS Standard Load Balancer annotations: https://learn.microsoft.com/azure/aks/configure-load-balancer-standard
- Microsoft AKS static IP guidance: https://learn.microsoft.com/azure/aks/static-ip

## Issues Found
- The AWS section implied Service annotations could configure ALBs. Updated the wording to clarify that AWS Load Balancer Controller provisions NLBs for Service objects and ALBs for Ingress objects.
- The AWS NLB TLS examples used `aws-load-balancer-backend-protocol: "http"`, but current AWS Load Balancer Controller NLB Service annotations support `tcp` or `ssl` for backend protocol. Changed the examples to `tcp`.
- The AWS SSL policy example used an older TLS 1.2-only policy while the text described TLS 1.2+. Updated it to `ELBSecurityPolicy-TLS13-1-2-2021-06` and adjusted the explanation.
- The second AWS example was labeled as an ALB example while using Service/NLB annotations, and it used legacy connection-draining annotations. Reframed it as an NLB example and replaced those annotations with `aws-load-balancer-target-group-attributes: "deregistration_delay.timeout_seconds=60"`.
- The GCP TLS example incorrectly attached a certificate annotation to a `LoadBalancer` Service. Replaced it with a supported GKE Ingress plus `ManagedCertificate` example and kept BackendConfig attached to the Service.
- The GCP internal load balancer example implied an internal L4 Service load balancer can attach a TLS certificate. Updated the text to explain that internal L4 Services are passthrough load balancers and TLS must terminate in the workload, internal Ingress, or Gateway.
- The GCP proxy protocol section incorrectly used BackendConfig for PROXY protocol on a GKE Service load balancer. Replaced it with `externalTrafficPolicy: Local` for source IP preservation and noted that PROXY protocol requires a Google Cloud proxy Network Load Balancer with standalone NEGs if that behavior is required.
- The Azure TLS section implied AKS Azure Load Balancer performs TLS termination. Clarified that Azure Load Balancer is layer 4 passthrough and TLS termination should be handled by an ingress controller, Application Gateway, or the workload.
- The Azure public static IP example used the deprecated upstream `spec.loadBalancerIP` field. Replaced it with the supported `service.beta.kubernetes.io/azure-load-balancer-ipv4` annotation.
- The Azure health probe protocol annotation was not the supported AKS form. Replaced it with the port-specific `service.beta.kubernetes.io/port_443_health-probe_protocol` annotation.
- The Azure proxy protocol section claimed AKS supports PROXY protocol through Service annotations. Replaced that claim with `externalTrafficPolicy: Local` guidance for source IP preservation.
- The test command assumed every provider returns a load balancer hostname. Updated the jsonpath to read either hostname or IP.

## Review Notes
- The corrected GKE ManagedCertificate example is for external GKE Ingress. Certificate Manager-backed Gateway is another valid GKE TLS path, but the post now stays within the existing Ingress/Service annotation style.
- EKS Auto Mode differs from the open source AWS Load Balancer Controller for some annotations, especially PROXY protocol configuration. The AWS examples now align with AWS Load Balancer Controller Service annotations.
- YAML snippets were parsed successfully after edits.

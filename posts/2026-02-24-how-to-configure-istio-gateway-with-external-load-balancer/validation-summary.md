# Validation Summary: How to Configure Istio Gateway with External Load Balancer

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio ingress gateways and IstioOperator
- Kubernetes Services of type LoadBalancer
- AWS Network Load Balancer and AWS Load Balancer Controller annotations
- Google Kubernetes Engine LoadBalancer Services
- Azure Kubernetes Service load balancer annotations
- gcloud CLI

## Sources Consulted
- Istio Ingress Access Control: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- AWS Load Balancer Controller service annotations: https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/main/docs/guide/service/annotations.md
- Amazon EKS Network Load Balancer annotations: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS Network Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- GKE LoadBalancer Service concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Azure AKS Standard Load Balancer annotations: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- gcloud compute addresses create reference: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create

## Issues Found
- AWS NLB client IP preservation was stated too broadly. Updated the text to clarify that NLB can preserve client IP, and that TCP/TLS IP targets have client IP preservation disabled by default unless `preserve_client_ip.enabled=true` is configured or proxy protocol is used.
- AWS health check examples used a health check path without explicitly setting HTTP health checks in the first NLB snippet. Added `service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "http"` so `/healthz/ready` on port `15021` is meaningful.
- The AWS Load Balancer Controller IP-target example did not configure client IP preservation despite the surrounding section discussing it. Added `service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: preserve_client_ip.enabled=true`.
- The proxy protocol example used a raw EnvoyFilter. Replaced it with Istio's documented `meshConfig.defaultConfig.gatewayTopology.proxyProtocol` configuration.
- The GKE external load balancer example used `networking.gke.io/load-balancer-type: "External"`, which is not the documented GKE annotation. Replaced it with `cloud.google.com/l4-rbs: "enabled"` for the recommended external passthrough Network Load Balancer path.
- The generic static IP section used `spec.loadBalancerIP` without noting its Kubernetes v1.24 deprecation. Added a caveat recommending provider-specific static IP annotations where available.
- The AWS idle timeout example used `aws-load-balancer-connection-idle-timeout`, which is not the current NLB listener attribute form in AWS Load Balancer Controller documentation. Replaced it with `aws-load-balancer-listener-attributes.TCP-80` and `TCP-443` examples using `tcp.idle_timeout.seconds=3600`.

## Review Notes
The post remains version-sensitive because cloud-provider Service annotations vary by Kubernetes distribution, controller, and cluster mode. The current examples are aligned with the official documentation reviewed above, but production users should still confirm the annotations supported by their installed cloud controller or load balancer controller version.

# Validation Summary: How to Configure Istio Ingress Gateway for High Availability

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Istio ingress gateways
- IstioOperator installation configuration
- Kubernetes Deployments, Services, affinity, HPA, and PodDisruptionBudget
- AWS Network Load Balancer on EKS
- Google Kubernetes Engine LoadBalancer Services
- kubectl
- curl

## Sources Consulted
- Istio IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Customizing the installation configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- AWS EKS Network Load Balancer service annotations: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- GKE LoadBalancer Service concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Kubernetes Pod disruptions and PodDisruptionBudget behavior: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The AWS NLB example used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"` and the deprecated `aws-load-balancer-cross-zone-load-balancing-enabled` annotation. Updated it to the current AWS Load Balancer Controller style with `aws-load-balancer-type: "external"`, `aws-load-balancer-nlb-target-type: "instance"`, and `aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- The AWS NLB Service configured an HTTP health check path without explicitly setting the health check protocol to HTTP. Added `service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "HTTP"` so `/healthz/ready` is actually used as an HTTP health check path.
- The AWS health check explanation described port 15021 as Envoy's built-in health endpoint. Updated it to Istio's gateway readiness endpoint, which is more accurate for the Istio status port.
- The GCP LoadBalancer example used `cloud.google.com/neg: '{"ingress": true}'` and `cloud.google.com/backend-config`, which are GKE Ingress/container-native load balancing annotations rather than the right annotations for a plain `type: LoadBalancer` Service. Replaced them with `cloud.google.com/l4-rbs: "enabled"` for GKE's backend service-based external passthrough Network Load Balancer.
- The external HTTPS health check example used `/healthz/ready` on the public domain, but that readiness endpoint is served on the status port unless the application explicitly routes it. Changed the example to use an application health endpoint routed through the gateway.
- The multiple gateway deployments example put a GKE internal load balancer annotation under `k8s.service.annotations`, which is not an IstioOperator field, and combined it with `type: ClusterIP`, which would not create an internal load balancer. Moved the annotation to `k8s.serviceAnnotations` and changed the Service type to `LoadBalancer`.
- The pod failure test used `kubectl delete pod -l app=istio-ingressgateway`, which deletes all matching gateway pods and can cause the outage the test is meant to avoid. Changed it to delete one selected pod.

## Review Notes
- The post is technically sound after the fixes. The IstioOperator examples use current fields such as `k8s.replicaCount`, `k8s.affinity`, `k8s.resources`, `k8s.strategy`, `k8s.service`, `k8s.serviceAnnotations`, and overlays.
- Provider-specific load balancer behavior still depends on the installed cloud controller or AWS Load Balancer Controller/EKS Auto Mode version. Production examples should be tested in the target cluster because annotations and defaults differ by provider and controller version.

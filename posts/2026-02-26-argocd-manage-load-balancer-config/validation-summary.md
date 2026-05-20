# Validation Summary: How to Manage Load Balancer Configurations with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Services and Ingress
- AWS Load Balancer Controller
- Google Kubernetes Engine load balancing
- MetalLB
- Kustomize
- Prometheus and PrometheusRule

## Sources Consulted
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD custom resource health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- AWS Load Balancer Controller Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/ingress/annotations/
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- GKE Ingress configuration and BackendConfig reference: https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The AWS NLB Service example used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"` and the deprecated cross-zone load balancing annotation. Changed the NLB type to `external`, added `aws-load-balancer-nlb-target-type`, and replaced the deprecated cross-zone annotation with `aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"` to match current AWS Load Balancer Controller documentation.
- The AWS ALB Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: alb`, which is the current Kubernetes Ingress field.
- The GKE Service example mixed `type: LoadBalancer` with GKE Ingress-only `cloud.google.com/neg` and `cloud.google.com/backend-config` annotations plus a `BackendConfig` CRD. Simplified it to a valid internal GKE LoadBalancer Service using `networking.gke.io/load-balancer-type: "Internal"`.
- The GCP overlay used `cloud.google.com/load-balancer-type: "External"`, which is not the current way to request an external backend-service-based passthrough Network Load Balancer. Replaced it with `cloud.google.com/l4-rbs: "enabled"`.
- The MetalLB Argo CD Application pinned `targetRevision: 0.14.0`. Updated it to `0.15.3`, matching the current official MetalLB installation examples consulted during validation.

## Review Notes
The AWS Service annotations assume the open source AWS Load Balancer Controller, not EKS Auto Mode, which has a different supported annotation set. The Prometheus metric names are deployment-dependent for cloud-provider metrics, especially CloudWatch exporter metric naming.

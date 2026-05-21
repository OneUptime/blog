# Validation Summary: How to Set Up Health Check Endpoints at Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways
- Istio VirtualService, EnvoyFilter, Telemetry, and AuthorizationPolicy resources
- Kubernetes Services, Deployments, and probes
- AWS Network Load Balancer for Kubernetes Services
- Google Kubernetes Engine LoadBalancer Services
- Python HTTP health check service

## Sources Consulted
- Istio Application Requirements, including port 15021 for health checks: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Gateway service port analyzer reference: https://istio.io/latest/docs/reference/config/analysis/ist0162/
- Istio VirtualService reference, including retry attempts behavior: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Telemetry reference, including access log filter expressions and `telemetry.istio.io/v1`: https://istio.io/latest/docs/reference/config/telemetry/
- Istio ingress authorization policy task, including `ipBlocks` vs `remoteIpBlocks`: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio AuthorizationPolicy reference, including DENY/ALLOW evaluation and `notRemoteIpBlocks`: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- AWS Load Balancer Controller Service annotations for NLB health checks and target type: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS NLB service annotation documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- GKE LoadBalancer Service health check behavior: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Kubernetes Service documentation for `targetPort` behavior: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The AWS NLB example used a literal health check port `15021` without ensuring the NLB targets pod IPs. In instance target mode, the NLB routes to node ports, so a pod target port health check is not generally valid. Changed the example to use the current AWS Load Balancer Controller pattern with `aws-load-balancer-type: "external"` and `aws-load-balancer-nlb-target-type: "ip"`.
- The GCP example used `BackendConfig` on an Istio `LoadBalancer` Service as if GKE could probe the gateway pod's `/healthz/ready` endpoint. GKE LoadBalancer Service health checks are answered by node networking agents, not Pods. Replaced the example with a GKE-specific caveat and an `externalTrafficPolicy: Local` Service example.
- Several Istio snippets used older beta or alpha API versions where current official docs show stable APIs. Updated VirtualService resources to `networking.istio.io/v1`, Telemetry to `telemetry.istio.io/v1`, and AuthorizationPolicy to `security.istio.io/v1`. EnvoyFilter remains `networking.istio.io/v1alpha3`, which is still the documented API version.
- The AuthorizationPolicy example used `action: ALLOW` on the ingress gateway for only `/healthz`, which would deny other gateway traffic unless separate ALLOW policies were also present. Changed it to a scoped `DENY` policy using `notRemoteIpBlocks` so it denies unauthorized health check probes without implicitly blocking unrelated paths.

## Review Notes
The corrected snippets are syntactically valid YAML. The direct-response EnvoyFilter is technically valid, but EnvoyFilter remains a lower-level Istio escape hatch and should be version-tested during Istio upgrades.

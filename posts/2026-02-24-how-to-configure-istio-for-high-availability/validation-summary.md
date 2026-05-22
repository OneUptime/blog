# Validation Summary: How to Configure Istio for High Availability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- IstioOperator
- Envoy sidecars
- Kubernetes Services and LoadBalancers
- AWS Load Balancer Controller annotations
- PodDisruptionBudgets
- Prometheus alerting
- cert-manager and external CA integration

## Sources Consulted
- Istio IstioOperator options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig and ProxyConfig options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio pilot-agent environment variables and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio pilot-discovery exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio custom CA integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio gateway installation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio deployment models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes pod affinity and anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/

## Issues Found
- The introduction implied that all service routing stops when istiod goes down. Updated it to clarify that existing sidecars continue using cached configuration, while new configuration and certificate rotation stop.
- The ingress gateway example used hard zone anti-affinity with `requiredDuringSchedulingIgnoredDuringExecution`. Kubernetes commonly restricts hard pod anti-affinity topology keys through the `LimitPodHardAntiAffinityTopology` admission controller, and hard zone anti-affinity can block rollouts. Changed it to preferred anti-affinity and updated the explanation.
- The LoadBalancer Service example exposed ports 80 and 443 without mapping them to the default Istio gateway target ports. Added `targetPort: 8080` and `targetPort: 8443`.
- The AWS cross-zone load balancing annotation used a deprecated annotation for current AWS Load Balancer Controller versions. Replaced it with `service.beta.kubernetes.io/aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- The external CA explanation overstated resilience by saying certificate issuance could continue if istiod had issues. Updated it to clarify that istiod still acts as the registration authority and must remain highly available.
- The PodDisruptionBudget explanation said Kubernetes will never drain below the configured threshold. Updated it to clarify that PDBs apply to voluntary evictions through the Eviction API and do not cover involuntary failures or direct deletion.
- The sidecar resilience section described `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` as automatic restart configuration. Updated it to clarify that Kubernetes handles restarts and the Istio setting controls proxy exit during draining.
- The Prometheus alert used a non-current `pilot_xds_push_errors` metric for sidecar disconnection. Replaced it with current istiod XDS error metrics, `pilot_total_xds_rejects` and `pilot_total_xds_internal_errors`, and renamed the alert.
- The istiod availability alert used `absent(up{job="istiod"} == 1)`. Updated it to `sum(up{job="istiod"}) < 1`, which more directly detects when no istiod target is up.

## Review Notes
The post remains a high-level production guide rather than a complete installation manifest. The examples assume the classic Istio sidecar deployment model and AWS-specific Service annotations for the gateway LoadBalancer. Gateway API-based Istio deployments may manage gateway Deployments and Services differently.

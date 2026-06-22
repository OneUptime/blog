# Validation Summary: How to Handle Canary Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, Services, labels, selectors, probes, and kubectl scaling
- Argo Rollouts canary strategy and AnalysisTemplates
- Istio VirtualService and DestinationRule subset traffic routing
- Prometheus HTTP API and PromQL metrics queries
- Python dataclasses, subprocess, requests, and formatted output

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Argo Rollouts Istio traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts specification documentation: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts Prometheus analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Python formatted string literal documentation: https://docs.python.org/3/reference/lexical_analysis.html#f-strings

## Issues Found
- The Argo Rollouts Istio example used subset-level routing in the VirtualService and DestinationRule but did not configure `trafficRouting.istio.destinationRule` in the Rollout. Added `destinationRule.name`, `canarySubsetName`, and `stableSubsetName` so Argo Rollouts can manage subset weights and labels.
- The Argo Rollouts manifest referenced `myapp` as an Istio destination host but did not define the Kubernetes Service required for the VirtualService and DestinationRule target. Added a `Service` named `myapp` selecting the Rollout pods.
- Two inline Argo Rollouts analysis steps referenced an AnalysisTemplate with a required `service-name` argument but did not pass the argument. Added the missing `args` entries.
- The Istio resources used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API version used by current Istio documentation.
- The dashboard `print_live_status` method used invalid Python format specifiers such as `{value:.2%:<15}`, which raise `ValueError` at runtime. Reordered the format specifiers to valid forms such as `{value:<15.2%}`.

## Review Notes
The native Kubernetes canary example is technically valid as an approximate replica-based traffic split, but Kubernetes Services do not provide exact percentage-based HTTP traffic routing by themselves. The post already notes that precise weights require Istio VirtualService or a similar traffic-routing layer.

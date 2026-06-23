# Validation Summary: What is Canary Deployment and How to Implement It in Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Services
- kubectl
- Istio VirtualService
- Istio DestinationRule
- Prometheus / PromQL
- Flagger
- Canary deployment and progressive delivery patterns

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes liveness/readiness/startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Flagger deployment strategies documentation: https://docs.flagger.app/usage/deployment-strategies
- Flagger website link check: https://flagger.app/

## Issues Found
- The native Kubernetes section described Service load balancing as round-robin. Kubernetes Services route to matching ready endpoints, but the exact balancing behavior depends on implementation and traffic characteristics. Updated the wording to "Kubernetes Service load balancing."
- The native Kubernetes section said the traffic split always equals the replica ratio. Replica ratios only produce approximate traffic distribution over time and only across ready pods. Updated the relevant explanations to say the split roughly follows the ready replica ratio.
- The comparison table said rolling-update rollback "must redeploy old version." Kubernetes Deployments can roll back by scaling a previous ReplicaSet back up via rollout undo. Updated the table wording to "Gradual (old ReplicaSet scales back up)."
- The Istio section said you can route "exactly 5%" to canary. Istio weights define routing proportions, but observed traffic can vary statistically. Updated the wording to "assign a 5% route weight."

## Review Notes
The Kubernetes, Istio, PromQL, kubectl, and Flagger snippets use current API groups and valid field names. The PromQL examples assume the application exports the shown metric and label names, which is a reasonable illustrative convention rather than a Kubernetes/Istio default.

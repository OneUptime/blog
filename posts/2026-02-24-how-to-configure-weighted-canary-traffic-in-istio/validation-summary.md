# Validation Summary: How to Configure Weighted Canary Traffic in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Kubernetes Deployments and Services
- kubectl
- Prometheus / PromQL

## Sources Consulted
- Istio Traffic Shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Ingress Gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The post stated that Istio route weights must add up to 100. Istio treats destination weights as relative proportions, so a destination receives `weight / sum(weights)` requests. I changed the wording to say that using values that add up to 100 makes percentages easy to read.
- The test traffic command used `http://web-app.production/api/version` without saying it must be run from inside the cluster or mesh. I clarified that the command should be run from a pod inside the mesh and changed the URL to the fully qualified Kubernetes service DNS name.
- The scaling example said "match the stable replica count" at 50% traffic but showed 2 canary replicas while the stable deployment had 3 replicas. I changed the comment to "scale for half the total load" to match the command.

## Review Notes
The Istio API snippets use current `networking.istio.io/v1` resources and the VirtualService, DestinationRule, Gateway, and Prometheus metric names align with current Istio documentation. The `kubectl patch`, `kubectl scale`, `kubectl set image`, and `kubectl delete` command patterns are valid, but `kubectl` was not installed in the local review environment, so command verification was based on official Kubernetes documentation rather than local CLI help.

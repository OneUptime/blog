# Validation Summary: How to Set Up Weighted Load Balancing in DestinationRule

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Kubernetes Deployment
- Kubernetes Service
- kubectl
- Canary deployment traffic splitting

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post stated that VirtualService route weights must add up to 100. Istio documents weights as relative proportions using `weight / sum of all weights`, so they do not strictly need to total 100. Updated the wording to explain that adding to 100 is a readable convention for percentages.
- The post said that, without Istio, Kubernetes would distribute traffic equally across all 7 pods. Kubernetes Services route traffic to one of the ready endpoints, but exact equal distribution is not guaranteed by the Service API. Updated the wording to avoid implying exact equality.
- The `kubectl run` verification command passed `sh -c` without `--command`, which means kubectl treats the arguments as arguments to the image's default command. Added `--command` and `--restart=Never` so the temporary pod runs the shell command as intended and is consistent with kubectl's documented transient pod examples.

## Review Notes
The Istio API version `networking.istio.io/v1`, DestinationRule subset syntax, subset-level `trafficPolicy`, load balancer values, outlier detection fields, VirtualService header matching, and weighted routing examples are current and consistent with official Istio documentation.

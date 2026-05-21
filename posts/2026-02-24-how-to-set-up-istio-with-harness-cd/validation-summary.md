# Validation Summary: How to Set Up Istio with Harness CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harness CD
- Harness Kubernetes deployments
- Harness Kubernetes Traffic Routing step
- Harness Continuous Verification
- Istio VirtualService and DestinationRule
- Istio ambient mode and waypoint proxies
- Kubernetes RBAC
- Prometheus / PromQL
- kubectl and istioctl

## Sources Consulted
- Harness Kubernetes Traffic Routing Step: https://developer.harness.io/docs/continuous-delivery/deploy-srv-diff-platforms/kubernetes/cd-k8s-ref/traffic-shifting-step/
- Harness Canary Deployment step: https://developer.harness.io/docs/continuous-delivery/deploy-srv-diff-platforms/kubernetes/cd-k8s-ref/canary-deployment-step/
- Harness Kubernetes cluster connector settings: https://developer.harness.io/docs/platform/connectors/cloud-providers/ref-cloud-providers/kubernetes-cluster-connector-settings-reference
- Harness Add a Kubernetes cluster connector: https://developer.harness.io/docs/platform/connectors/cloud-providers/add-a-kubernetes-cluster-connector
- Harness Verify Overview: https://developer.harness.io/docs/continuous-delivery/verify/verify-deployments-with-the-verify-step
- Harness Configure the Verify Step: https://developer.harness.io/docs/continuous-delivery/verify/configure-cv/verify-deployments/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio ambient waypoint proxy documentation: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient Layer 7 features: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post said Harness can automatically create and manage both Istio VirtualServices and DestinationRules. Current Harness traffic routing docs describe Istio traffic routing through generated or patched VirtualServices; DestinationRules should be supplied in manifests when needed for subsets or policies. Updated the wording accordingly.
- The prerequisites said ambient mode without qualification. Istio L7 traffic management in ambient mode requires waypoint proxies, and VirtualService usage with ambient is still caveated in Istio documentation. Added the waypoint requirement.
- The cluster setup section used older Harness Cloud Provider / Setup terminology. Current Harness NG uses Kubernetes Cluster connectors and delegate selection. Updated the UI path and configuration labels.
- The traffic management section referred to Service definitions and Workflows. Current Harness NG traffic routing is configured in Canary, Blue Green, or Kubernetes Traffic Routing steps. Updated those references.
- The pipeline YAML used an invalid shape for `K8sTrafficRouting` (`provider.type: Istio`, `virtualService`, `routeType`). Replaced it with the current documented `spec.type: config`, `trafficRouting.provider: istio`, and route/destination structure.
- Re-checked all YAML snippets after edits with a YAML parser; all fenced YAML blocks parse successfully.

## Review Notes
- The Istio API snippets use `networking.istio.io/v1`, which is current for supported Istio versions.
- The Prometheus metric names used in the sample queries match Istio standard metrics. Real-world label availability can vary with telemetry configuration, so teams should confirm labels in their Prometheus instance.
- The RBAC sample is syntactically valid, but production deployments should scope permissions as tightly as their namespace and deployment model allow.

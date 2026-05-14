# Validation Summary: How to Organize Base and Overlays in a Flux CD Repository

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization resources
- Kustomize bases, overlays, patches, and components
- Kubernetes Deployments, Services, ConfigMaps, PodDisruptionBudgets, topology spread constraints, and HorizontalPodAutoscalers
- Prometheus Operator ServiceMonitor
- Bash validation scripting

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux documentation: Kustomization, https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux documentation: Kustomize API reference v1, https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes documentation: Pod Topology Spread Constraints, https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: HorizontalPodAutoscaler Walkthrough, https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes documentation: Specifying a Disruption Budget for your Application, https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Prometheus Operator API reference: ServiceMonitor, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The ServiceMonitor example selected `app: my-app`, but the base Service did not define matching metadata labels. Added `metadata.labels.app: my-app` to the Service so the ServiceMonitor selector can match the Service endpoints.
- The HPA component example used `placeholder` for both `metadata.name` and `spec.scaleTargetRef.name`, with no Kustomize replacement or patch to rewrite those values. Changed both values to `my-app` so the example HPA targets the Deployment shown in the post.
- The validation script assigned `OUTPUT=$(kustomize build ...)` under `set -e`, which would cause the script to exit immediately on build failure before the explicit error handling ran. Changed it to `if ! OUTPUT=$(kustomize build "$OVERLAY_DIR" 2>&1); then`.

## Review Notes
- `kustomize` and `kubectl` were not installed in the local environment, so CLI behavior was checked against official documentation rather than local command output.
- Flux documents Kustomize components as an alpha Kustomize feature and experimental in Flux. The post's component examples are valid as examples, but production users should account for that caveat.

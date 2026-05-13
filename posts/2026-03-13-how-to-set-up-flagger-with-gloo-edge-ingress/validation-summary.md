# Validation Summary: How to Set Up Flagger with Gloo Edge Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Gloo Edge / Gloo Gateway
- Kubernetes
- Helm
- Prometheus
- Canary deployments

## Sources Consulted
- Flagger Gloo canary deployments documentation: https://docs.flagger.app/main/tutorials/gloo-progressive-delivery
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Kubernetes installation documentation: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Gloo Edge / Gloo Gateway getting started documentation: https://docs.solo.io/gloo-edge/main/getting_started/
- Gloo Edge VirtualService API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gateway/api/v1/virtual_service.proto.sk/
- Gloo Edge Kubernetes services and Upstream documentation: https://docs.solo.io/gloo-edge/v1.16.x/guides/traffic_management/destination_types/kubernetes_services/
- Gloo Edge canary release documentation: https://docs.solo.io/gloo-edge/latest/guides/traffic_management/destination_types/canary/
- Gloo Edge / Gloo Gateway release support matrix: https://docs.solo.io/gloo-edge/latest/reference/support/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Helm install command documentation: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The original Gloo `VirtualService` routed directly to a static `Upstream`, which would bypass the Flagger-managed `RouteTable` used for Gloo traffic shifting. Changed the `VirtualService` to delegate to the Flagger-managed `RouteTable` in the application namespace.
- The original Canary manifest omitted `spec.service`, which Flagger's Gloo example uses to generate the application services and Gloo Upstreams. Added the service port and target port.
- The original guide created a static Gloo `Upstream` and referenced it with `upstreamRef` as if it were required. Flagger documents `upstreamRef` as optional for copying nonstandard Upstream configuration, while the basic Gloo setup generates the needed Upstreams. Removed the unnecessary Upstream section and `upstreamRef`.
- The original guide applied namespaced resources in the `test` namespace without first creating that namespace. Added a namespace creation command before applying the Gloo `VirtualService`.
- The original deployment section showed a Deployment manifest but did not include the command to apply it. Added the missing `kubectl apply -f deployment.yaml` command.
- The original verification text said Flagger creates both `podinfo-primary` and `podinfo-canary` Deployments. Flagger's Gloo documentation shows the original target Deployment remains the canary workload, while Flagger creates `podinfo-primary`, services, a RouteTable, and Gloo Upstreams. Corrected the resource description.
- The original prerequisites said Kubernetes 1.22 or later and Helm 3, but current Gloo release support is version-specific and current releases do not support every Kubernetes or Helm 3 version. Changed the prerequisites to require versions supported by the selected Gloo Edge and Flagger releases.

## Review Notes
The Prometheus URL in the Flagger values file is valid only if a Prometheus service named `prometheus` exists in the `monitoring` namespace. The post lists Prometheus as a prerequisite, so this is acceptable, but users with a different Prometheus service name must adjust `metricsServer`.

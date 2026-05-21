# Validation Summary: How to Handle Waypoint Proxy Scaling in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Kubernetes Gateway API
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler
- Kubernetes PodDisruptionBudget
- Prometheus metrics

## Sources Consulted
- Istio ambient waypoint proxy documentation: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio `istioctl waypoint` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Kubernetes Gateway API automated deployment and scaling documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post said waypoint proxies can be scoped to a service account and used `istioctl waypoint apply --service-account`. Current `istioctl waypoint apply` does not expose that flag; waypoint use is configured by labeling namespaces, services, or pods/workloads with `istio.io/use-waypoint`. Updated the text and commands to use service-specific waypoint labeling.
- The post implied that creating a waypoint automatically makes a namespace use it. Current Istio documentation says deployed waypoints are not used until resources are explicitly enrolled. Added the namespace label command.
- The post used the non-current label `istio.io/gateway-name` to find generated waypoint pods and select PDB/topology-spread targets. Updated these selectors to `gateway.networking.k8s.io/gateway-name`.
- The post used an unsupported `istio.io/gateway-replicas` annotation for scaling generated waypoint deployments. Replaced it with the supported Gateway API `spec.infrastructure.parametersRef` ConfigMap customization.
- The resource limits example used `proxy.istio.io/config` for Kubernetes container resources, but that annotation configures Istio proxy settings and not pod resource requests/limits. Replaced it with Gateway infrastructure parameters that patch the generated deployment.
- The topology spread and graceful shutdown snippets were partial Deployment manifests that would not be valid standalone Kubernetes resources. Reworked them to use the same supported Gateway infrastructure parameters mechanism.
- The Prometheus examples filtered Istio standard metrics with `app="waypoint"`, which is not a standard Istio metric label. Updated them to use standard workload labels for waypoint request metrics.

## Review Notes
The sizing recommendations are general guidance and should still be validated with load testing for each workload and policy set. The Prometheus examples assume the waypoint workload is named `waypoint`; deployments with custom waypoint names should substitute the corresponding workload name.

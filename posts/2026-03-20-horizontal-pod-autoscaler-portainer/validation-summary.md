# Validation Summary: How to Configure Horizontal Pod Autoscaler via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- Metrics Server
- `kubectl`
- External metrics adapters / Kubernetes metrics APIs

## Sources Consulted
- Kubernetes documentation: Horizontal Pod Autoscaling https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes documentation: HorizontalPodAutoscaler Walkthrough https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes documentation: Deprecated API Migration Guide https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Metrics Server repository README https://github.com/kubernetes-sigs/metrics-server
- Portainer documentation: Add a new application using code https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer documentation: Create an application from a Manifest https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer documentation: `kubectl` shell https://docs.portainer.io/sts/user/kubernetes/kubectl

## Issues Found
- The Portainer navigation path in Step 1 was outdated. I changed `Kubernetes > Advanced Deployment` to the current `Applications > Create from code` plus `Manifest` flow to match current Portainer documentation.
- The post implicitly assumed the `production` namespace already existed. I added that prerequisite and aligned the deployment instructions so the namespace selection is explicit.
- The Deployment manifest comment said resource requests were required for CPU-based HPA. I changed this to utilization-based HPA targets, because utilization targets depend on the relevant resource requests for the metric being scaled on.
- The custom metrics section described the example generically as a custom metrics provider while the manifest uses an `External` metric source. I clarified that the example uses an external metric exposed by a metrics adapter.
- The monitoring section referenced a specific Portainer HPA navigation path that I could not verify in current Portainer documentation. I replaced it with the documented Portainer `kubectl` shell workflow, which reliably exposes HPA status through `kubectl get hpa` and `kubectl describe hpa`.

## Review Notes
- The post now uses the current stable `autoscaling/v2` HPA API, which is correct for modern Kubernetes releases. Older `autoscaling/v2beta1` and `autoscaling/v2beta2` forms are deprecated or removed in newer versions.
- The example external metric name `rabbitmq_queue_messages` is adapter-specific. Readers still need a metrics adapter that exposes that metric through Kubernetes' aggregated metrics APIs.
- The Metrics Server install command and release URL were current as of 2026-04-30.

# Validation Summary: How to Upgrade Istio Sidecars Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Kubernetes Deployments
- PodDisruptionBudgets
- istioctl
- kubectl

## Sources Consulted
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio global MeshConfig and ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar startup guidance: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio debugging Envoy and istiod with proxy-config: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Kubernetes rolling Deployment update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post stated that a single-replica Deployment cannot avoid a brief planned rollout gap. Kubernetes can create a surge pod first when `maxSurge` is greater than zero and `maxUnavailable` is zero, so I changed the wording to explain that multiple replicas are the most reliable approach and that a single replica only works for planned rollouts if surge capacity is allowed.
- The PodDisruptionBudget section said PDBs guarantee pods are running regardless of voluntary disruptions like rolling restarts. Kubernetes documents that PDBs do not limit Deployment or StatefulSet rolling upgrades, so I changed the claim to describe voluntary evictions and noted that Deployment rollout behavior is controlled by the Deployment strategy.
- The `holdApplicationUntilProxyStarts` section said the setting ensures the pod does not serve traffic until the proxy is initialized. Istio documents that it delays application startup until the proxy is ready; Kubernetes readiness still determines Service endpoint membership. I updated the wording accordingly.
- The proxy readiness example used a `ProxyConfig` resource with `ISTIO_AGENT_FLAGS: "--readinessProbe=true"`, which is not the documented way to configure Kubernetes sidecar readiness probe timing. I replaced it with documented `readiness.status.sidecar.istio.io/*` pod-template annotations.
- The proxy image annotation example was shown directly on a standalone Pod. Because workloads managed by Deployments need annotations on the pod template for newly created pods, I changed the example to a Deployment pod-template annotation.
- The examples hard-coded Istio `1.21`, which is stale for a 2026 post and not otherwise justified. I changed those examples to use `<target-version>` placeholders.

## Review Notes
The remaining guidance is broadly correct for planned sidecar rollouts, but true zero downtime still depends on application readiness probes, sufficient capacity, load balancer behavior, and client retry/reconnect logic for long-lived connections.

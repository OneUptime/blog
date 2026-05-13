# Validation Summary: How to Configure Flagger with Custom Resource Targets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary resources
- Kubernetes Deployments and DaemonSets
- Knative Services
- Kubernetes CustomResourceDefinition scale subresource
- Kubernetes RBAC
- HorizontalPodAutoscaler

## Sources Consulted
- Flagger documentation, "How it works": https://docs.flagger.app/usage/how-it-works
- Flagger documentation, "Deployment Strategies": https://docs.flagger.app/main/usage/deployment-strategies
- Flagger documentation, "Knative Canary Deployments": https://docs.flagger.app/main/tutorials/knative-progressive-delivery
- Flagger source, canary controller factory: https://github.com/fluxcd/flagger/blob/main/pkg/canary/factory.go
- Flagger source, DaemonSet controller: https://github.com/fluxcd/flagger/blob/main/pkg/canary/daemonset_controller.go
- Flagger source, Canary API types: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- Kubernetes documentation, CustomResourceDefinition scale subresource: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#scale-subresource
- Kubernetes documentation, Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post claimed Flagger can target arbitrary custom resources if they expose a pod template and `/scale` subresource. Flagger's documented target support is Deployments and DaemonSets, with Knative Services supported when using the Knative provider. Updated the post to remove the unsupported arbitrary-CRD guidance.
- The custom CRD canary example would not work as described because Flagger's controller factory falls back unknown target kinds to the Deployment controller rather than using a generic scale-subresource controller. Replaced that section with a Knative Service example that matches Flagger's official provider requirements.
- The DaemonSet explanation said weight-based traffic shifting does not apply because DaemonSets run on every node. Updated this to describe `iterations` as Flagger's blue/green-style analysis setting and clarified how Flagger scales DaemonSet targets down with a node selector.
- The RBAC example granted access to a fictional custom API group. Replaced it with DaemonSet RBAC relevant to the supported non-Deployment target covered by the post.
- The CRD scale-subresource example was incomplete as a standalone CRD because it omitted `spec.scope`, `spec.names`, and the status fields referenced by the scale subresource. Completed the example and clarified that this Kubernetes feature is not enough to make a CRD a Flagger rollout target.
- The autoscaler example implied HPA support for arbitrary custom Flagger targets. Updated it to a Deployment target, matching Flagger's documented HPA behavior.
- The Mermaid flow assumed all rollouts increase traffic weight and scale canary replicas. Generalized the flow so it applies to both weighted and iteration-based strategies.

## Review Notes
The corrected post is technically valid, but its directory slug still references custom resource targets. A future cleanup could align the slug with the corrected title if URL compatibility permits.

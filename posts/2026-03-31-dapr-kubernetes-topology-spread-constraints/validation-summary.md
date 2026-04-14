# Validation Summary: How to Use Dapr with Kubernetes Topology Spread Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar annotations, actor placement, control plane components)
- Kubernetes (Topology Spread Constraints, Deployments, pod scheduling)
- kubectl CLI

## Sources Consulted
- Kubernetes official documentation: Pod Topology Spread Constraints (https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- Kubernetes API reference: PodSpec topologySpreadConstraints field
- Kubernetes well-known labels: topology.kubernetes.io/zone, kubernetes.io/hostname (https://kubernetes.io/docs/reference/labels-annotations-taints/)
- Dapr documentation: Kubernetes annotations for sidecar configuration (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr documentation: Actor placement service (https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/)
- Dapr documentation: Dapr dashboard (https://docs.dapr.io/reference/cli/dapr-dashboard/)
- kubectl reference: patch, get, port-forward commands

## Issues Found
No technical issues found.

## Review Notes
- The YAML for Topology Spread Constraints is syntactically correct and uses current (non-deprecated) topology keys (`topology.kubernetes.io/zone` rather than the deprecated `failure-domain.beta.kubernetes.io/zone`).
- All Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are correct and current.
- The `kubectl patch` command for adding topology spread constraints to the Dapr operator uses correct JSON Patch syntax. The label selector `app: dapr-operator` matches the default Dapr Helm chart labels.
- Kubernetes 1.27+ introduced `matchLabelKeys` as a beta field for topology spread constraints, which can simplify label selectors for rolling updates. The post uses the standard `labelSelector` approach, which is correct and works across all supported Kubernetes versions.
- The Dapr dashboard port-forward command assumes the dashboard component is installed (it is a separate optional component). This is a reasonable assumption for the target audience.

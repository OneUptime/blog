# Validation Summary: How to Configure HPA Behavior Policies for Scale-Up and Scale-Down Rates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes `autoscaling/v2` API
- HPA behavior policies
- `kubectl`
- YAML

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes v1.18 release notes for `spec.behavior`: https://kubernetes-docsy-staging.netlify.app/docs/setup/release/notes/

## Issues Found
- The disabling scale-down example used a policy with `value: 0`. Kubernetes `HPAScalingPolicy.value` must be greater than zero, and `selectPolicy: Disabled` is sufficient to disable scaling in that direction. Removed the invalid policy from the example.
- The basic behavior explanation described scale-down as choosing between 10% and 2 pods without noting the different policy windows. Updated the text to specify 10% every 60 seconds or 2 pods every 180 seconds.
- The scale-up explanation said the HPA could double replicas within 30 seconds, but the percent policy uses a 60-second period. Updated the text to say doubling applies over a 60-second window, while the pod-count policy can add 10 pods within 30 seconds.

## Review Notes
The post uses the stable `autoscaling/v2` HPA API and current behavior fields. `kubectl` was not installed in the local workspace, so CLI examples were checked against Kubernetes documentation rather than executed locally.

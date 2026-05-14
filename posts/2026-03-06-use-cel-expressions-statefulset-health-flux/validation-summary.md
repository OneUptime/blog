# Validation Summary: How to Use CEL Expressions for StatefulSet Health in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes StatefulSet
- Kubernetes health checks and readiness probes
- GitOps rollout dependencies

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
- The post title, tags, and description described CEL expressions, but the article's examples use Flux built-in `.spec.healthChecks` and `.spec.wait`, not `.spec.healthCheckExprs`. Updated the framing to describe Flux health checks accurately.
- The introduction implied Flux checks StatefulSet health only by requiring all replicas to be updated. This is too simplistic for StatefulSets, especially with partitioned rollouts. Reworded it to describe status-based readiness and rollout evaluation without overstating the exact predicate.
- The StatefulSet ordering description said pods are created and updated in ascending order. Kubernetes creates StatefulSet pods in ordinal order, but rolling updates proceed from the largest ordinal to the smallest. Corrected the wording.
- The timeout guidance said a 5-replica StatefulSet takes at least 5 times longer than a single pod startup. That is too absolute because newer Kubernetes versions support configurable `maxUnavailable` for StatefulSet rolling updates. Changed it to "can take roughly" and noted the default one-at-a-time behavior.

## Review Notes
The Flux examples use the current `kustomize.toolkit.fluxcd.io/v1` API shape for `Kustomization`, `healthChecks`, `wait`, `dependsOn`, and `timeout`. The post still focuses on built-in StatefulSet health checks rather than custom CEL expressions; adding actual `healthCheckExprs` examples would require a broader content rewrite and was outside the requested correction scope.

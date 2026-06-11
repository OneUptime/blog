# Validation Summary: How to Build Rolling Deployment Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rolling update strategy
- kubectl rollout commands
- Kubernetes readiness, liveness, and startup probes
- Kubernetes pod readiness gates
- AWS Load Balancer Controller
- PodDisruptionBudget
- Prometheus scrape annotations

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Update a Deployment Without Downtime task: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Pod lifecycle and readiness gates documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Pod conditions documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- Kubernetes probe configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes PodDisruptionBudget task: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- AWS Load Balancer Controller pod readiness gate documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/pod_readiness_gate/

## Issues Found
- The `progressDeadlineSeconds` explanation was too narrow. Kubernetes treats a Deployment as progressing when it creates a new ReplicaSet, scales ReplicaSets up or down, or new pods become ready or available. Updated the wording to match the official Deployment status semantics.
- The AWS readiness gate example used a Deployment annotation from the legacy ALB Ingress Controller style. Current AWS Load Balancer Controller readiness gate injection is enabled with the `elbv2.k8s.aws/pod-readiness-gate-inject=enabled` namespace label and requires matching Service/TargetGroupBinding conditions with IP targets. Updated the section heading, explanation, and example command.
- The change-cause command sequence annotated the Deployment after applying the manifest, which can miss the revision that should record the annotation. Updated the example to set the annotation before applying the rollout change and added `--overwrite`.
- The "Common Deployment Events" table mixed Kubernetes Events with Deployment condition reasons. Updated the heading and wording to describe both events and conditions accurately.
- The production example exposed a `metrics` container port on `9090` but configured `prometheus.io/port` as `8080`. Updated the annotation to `9090`.

## Review Notes
- `kubectl` is not installed in this local environment, so CLI flags were verified against the official generated kubectl reference rather than local `--help` output.
- The Deployment, probe, rollout, readiness gate, and PodDisruptionBudget APIs used in the post are current and not deprecated in the official documentation reviewed.

# Validation Summary: How to Use minReadySeconds to Prevent Premature Rollout Progression

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes readiness, liveness, and startup probes
- kubectl
- kube-state-metrics
- Prometheus / PromQL
- Argo Rollouts

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update task documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Argo Rollouts specification: https://argoproj.github.io/argo-rollouts/features/specification/
- kube-state-metrics Pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post implied that minReadySeconds prevents pods from receiving traffic until the timer expires. Kubernetes readiness controls Service traffic; minReadySeconds controls when Deployment/Rollout controllers count a ready pod as available. I updated the description and explanatory text to make this distinction clear.
- The post stated that the rollout does not progress to the next pod during the minReadySeconds window. This is only strictly true under strategy settings that require availability before more progress, such as maxUnavailable: 0. I qualified the wording to account for maxSurge and maxUnavailable behavior.
- The `kubectl describe pod` event example showed a normal `Ready` event that is not a reliable Kubernetes event to expect. I replaced it with `kubectl get pod --watch` and Pod condition inspection.
- The background worker example claimed minReadySeconds ensures jobs have been processed. minReadySeconds only requires the pod to remain ready without containers crashing, so I changed the wording to describe fail-fast initialization coverage.
- The PromQL example used `kube_pod_status_condition`, which is not a kube-state-metrics Pod metric, and it did not accurately isolate ready-but-not-available pods. I replaced it with a Deployment-level updated-minus-available replica query and clarified what that gap represents.
- The rollout duration calculation treated `maxSurge: 1` plus `maxUnavailable: 1` as a guaranteed two-pod concurrency level. Actual pacing depends on availability and controller behavior, so I changed the estimate to a range.
- The liveness probe guidance said `initialDelaySeconds` should be longer than `minReadySeconds`. Liveness delay should cover startup behavior, and Kubernetes recommends startup probes for slow-starting containers, so I corrected that guidance.

## Review Notes
kubectl is not installed in this local environment, so command syntax was verified against the official Kubernetes kubectl reference rather than local `--help` output.

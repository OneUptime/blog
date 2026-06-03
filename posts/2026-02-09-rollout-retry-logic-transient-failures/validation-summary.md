# Validation Summary: How to Implement Rollout Retry Logic for Transient Deployment Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Pods, image pulls, restart policies, and probes
- containerd registry mirrors
- @kubernetes/client-node
- Argo Rollouts
- Prometheus alerting rules and PromQL
- JavaScript

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes JavaScript client documentation: https://github.com/kubernetes-client/javascript
- Kubernetes JavaScript client patch helpers: https://github.com/kubernetes-client/javascript/blob/main/src/patch.ts and https://github.com/kubernetes-client/javascript/blob/main/src/middleware.ts
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.9/querying/functions/

## Issues Found
- The Kubernetes built-in retry section described retries too broadly as pod creation retries. Updated it to distinguish Deployment progress retry/reporting, kubelet image-pull backoff, and container restart-policy backoff.
- The `progressDeadlineSeconds` comment implied Kubernetes only keeps trying for that duration. Updated it to say the Deployment reports failed progress after 10 minutes.
- The image pull snippet was labeled as configuring pull backoff, but the manifest only controls pull behavior. Updated the wording and clarified that Deployments require `restartPolicy: Always`.
- The JavaScript controller used the older positional `listNamespacedPod` and `patchNamespacedDeployment` call style and expected `pods.body.items`. Updated the examples to the current object-argument client style, `pods.items`, and `k8s.setHeaderOptions` with `k8s.PatchStrategy.MergePatch`.
- The controller checked `InsufficientMemory` and `InsufficientCPU` as container waiting reasons, but those are scheduling symptoms rather than container waiting reasons. Updated the example to detect `PodScheduled=False` with `Unschedulable` and insufficient CPU or memory in the scheduling message.
- The pod label selector assumed every Deployment used an `app` label. Updated it to build the selector from all `matchLabels`.
- The Argo Rollouts section called `failureLimit` a retry strategy. Updated the text to describe analysis tolerance, and changed the Prometheus `successCondition` to `result[0] >= 0.95`, matching Argo Rollouts' Prometheus result shape.
- The monitoring snippet redefined `retryDeployment` and called an undefined `attemptRetry`. Renamed the wrapper to `monitoredRetryDeployment` and made it call the earlier `retryDeployment`.

## Review Notes
- The controller remains illustrative rather than production complete. A production controller should use informers or reconcile loops, handle owner references and ReplicaSets, avoid duplicate scheduled retries, and persist retry state carefully.
- The containerd registry mirror example can vary by containerd version and distribution-managed node configuration.

# Validation Summary: How to Configure DaemonSet Update Strategies with RollingUpdate and OnDelete

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Kubernetes DaemonSet
- Kubernetes RollingUpdate and OnDelete update strategies
- kubectl rollout, wait, delete, patch, label, and top commands
- Kubernetes node selectors and node affinity
- Kubernetes readiness and liveness probes
- Kubernetes validating admission webhooks in Go
- Prometheus and kube-state-metrics DaemonSet metrics

## Sources Consulted
- Kubernetes documentation: Perform a Rolling Update on a DaemonSet - https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes API reference: DaemonSet v1 apps - https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes documentation: Perform a Rollback on a DaemonSet - https://kubernetes.io/docs/tasks/manage-daemon/rollback-daemon-set/
- Kubernetes kubectl reference: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl reference: kubectl delete - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kubectl reference: kubectl rollout history - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes kubectl reference: kubectl rollout status - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl reference: kubectl rollout pause - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_pause/
- Kubernetes kubectl reference: kubectl rollout resume - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_resume/
- Kubernetes documentation: Assign Pods to Nodes using Node Affinity - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes documentation: Dynamic Admission Control - https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- kube-state-metrics DaemonSet metrics documentation - https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/daemonset-metrics.md

## Issues Found
- The OnDelete examples deleted a DaemonSet pod and immediately waited for a Ready pod on the node. This could match the terminating old pod or race with recreation. Added `kubectl wait --for=delete` before waiting for the replacement pod.
- The progressive OnDelete script had the same deletion race. Added a delete wait with a timeout before waiting for the replacement pod.
- The canary example labeled nodes after the stable DaemonSet already existed. Because `requiredDuringSchedulingIgnoredDuringExecution` does not evict already-running pods, stable pods could remain on canary nodes. Added commands to delete stable pods on those nodes after labeling so they are not recreated there.
- The rollback script read `.metadata.annotations.deprecated.daemonset.template.generation`, which is not the supported way to inspect DaemonSet rollout revisions. Removed that lookup and kept `kubectl rollout history`, matching Kubernetes' ControllerRevision-based rollout history.
- The post showed `kubectl rollout pause` and `kubectl rollout resume` for DaemonSets, but current kubectl documentation states pause/resume are only supported for Deployments. Replaced those commands with a note and an `OnDelete` patch example for future manual control.
- The Go admission webhook snippet imported `net/http` without using it, which would fail compilation. Replaced it with `strings`.
- The Go snippet checked for `:latest` with a fixed substring, which could panic for short image names. Replaced it with `strings.HasSuffix`.
- The Go snippet returned AdmissionResponses without copying the request UID, despite Kubernetes webhook response requirements. Added UID handling.
- The Go snippet could dereference a nil `RollingUpdate` strategy configuration. Added a nil check before reading `MaxUnavailable`.

## Review Notes
- The DaemonSet update strategy descriptions, `maxUnavailable` examples, rollback commands, readiness/liveness probe fields, and kube-state-metrics metric names are consistent with current official documentation.
- The Prometheus alert examples assume kube-state-metrics is installed and exporting DaemonSet metrics.

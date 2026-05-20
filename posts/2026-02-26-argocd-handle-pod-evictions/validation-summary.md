# Validation Summary: How to Handle Pod Evictions with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes pod eviction and disruption handling
- Kubernetes Deployments
- PodDisruptionBudgets
- PriorityClasses and preemption
- Argo CD notifications and custom health checks
- Cluster Autoscaler
- kubectl

## Sources Consulted
- Kubernetes: Pod Disruptions and PodDisruptionBudgets, https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes: Node-pressure Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes: API-initiated Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes: kubectl drain reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Pod Priority and Preemption, https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes: Pod Quality of Service Classes, https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes: Assign Memory Resources to Containers and Pods, https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Argo CD: Automated Sync Policy, https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD: Application Specification Reference, https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD: Resource Health, https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD: Notifications Overview, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD: Notification Triggers, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD: Notification Templates, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Kubernetes Autoscaler FAQ, https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The post stated that ArgoCD self-healing detects a Deployment with 3 desired replicas and only 2 running pods as drift and triggers a sync. Argo CD self-heal applies to live managed resources drifting from Git, while Kubernetes controllers recreate pods after eviction. Updated the explanation to separate Argo CD spec reconciliation from Deployment controller replica recovery.
- The post said self-healing disabled means ArgoCD shows Degraded and does not take action. Updated this to say it may show Degraded while replicas are unavailable, and clarified that Argo CD still does not recreate pods itself.
- The self-heal YAML comment said it corrects drift caused by evictions. Updated the comment to refer to live spec drift on managed resources.
- The post described OOM kills as pod evictions. Kubernetes documents node-pressure eviction and container OOM kill as distinct behaviors, so the section was retitled and revised to describe OOM kills accurately.
- The post said ArgoCD sees OOM-killed pods as CrashLoopBackOff. Updated this to the more accurate case where repeated OOM kills can lead to CrashLoopBackOff and Argo CD may mark the app Degraded when workload replicas are unavailable.
- The custom health check text claimed it could distinguish OOM issues, but the Lua script only inspects Deployment status and cannot inspect child Pod container states. Updated the surrounding text and removed the misleading comment.
- The PriorityClass section used language suggesting a high-priority workload should not be preempted. Updated the wording to say it is less likely to be preempted by lower-priority workloads, and changed the example description accordingly.
- The example set `globalDefault: true` on the standard production PriorityClass. Since only one global default PriorityClass can exist cluster-wide and making production priority the default is a risky general-purpose example, changed it to `globalDefault: false`.

## Review Notes
The remaining snippets use current Kubernetes APIs such as `policy/v1` PodDisruptionBudget and `scheduling.k8s.io/v1` PriorityClass. The Cluster Autoscaler `safe-to-evict` annotation is valid, but it should remain a narrow exception because it can block scale-down. The event query is syntactically valid, although event retention and field availability can vary by cluster version and event backend.

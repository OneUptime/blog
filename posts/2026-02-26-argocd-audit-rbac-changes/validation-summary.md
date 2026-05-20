# Validation Summary: How to Audit RBAC Changes in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD RBAC
- Argo CD Applications and automated sync
- Argo CD Notifications
- Kubernetes ConfigMaps
- Kubernetes audit logging
- kubectl
- AWS EKS control plane audit logs
- Git
- Shell scripting

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Slack Notification Service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/slack/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD RBAC loader source: https://github.com/argoproj/argo-cd/blob/master/util/rbac/rbac.go
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Amazon EKS control plane logs: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html

## Issues Found
- The self-healing explanation said manual changes via `kubectl get` would be reverted. `kubectl get` is read-only, so this was changed to `kubectl edit` or `kubectl apply`.
- The EKS CloudWatch log group example used `/aws/eks/cluster/audit`. Amazon EKS documents the control plane log group format as `/aws/eks/<cluster-name>/cluster`, so the example now uses `/aws/eks/my-cluster/cluster`.
- The Kubernetes Event Monitoring section implied generic ConfigMap updates produce Kubernetes Events and could be monitored with `kubectl get events --field-selector reason=Updated`. Kubernetes Events are not a reliable audit source for ConfigMap data changes, so the section was corrected to use a direct ConfigMap watch and a generic watcher/controller approach.
- The Argo CD Notifications example defined a trigger and template but did not subscribe the `argocd-rbac` Application to Slack notifications. The Application example now includes a Slack subscription annotation.
- The notification trigger condition only checked the application name. It now checks for a successful operation and uses `oncePer` on the synced revision to avoid repeated notifications for the same sync revision.
- The Argo CD server log example used an unverified `RBAC policy reloaded` message. Argo CD's RBAC loader logs ConfigMap add/update messages, so the example now shows `RBAC ConfigMap 'argocd-rbac-cm' updated`.

## Review Notes
- The post is technically relevant and contains multiple implementation snippets, so it was reviewed as a code/configuration guide.
- YAML snippets were parsed locally after the edits.
- `kubectl` was not installed in the local environment, so CLI behavior was checked against official Kubernetes reference documentation instead of local `--help` output.

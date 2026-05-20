# Validation Summary: How to View Application Events in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Notifications
- Kubernetes events
- kubectl
- Kubernetes workloads and resources: Pods, Deployments, PVCs, Services, Ingresses

## Sources Consulted
- Argo CD command reference for `argocd app resources`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD command reference for `argocd app get-resource`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Argo CD command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_get/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notifications triggers catalog: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/notifications/catalog/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-apiserver reference for event TTL configuration: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Argo CD source/API references confirming Application event reasons such as `OperationStarted`, `OperationCompleted`, and `ResourceUpdated`: https://pkg.go.dev/github.com/argoproj/argo-cd/v2/util/argo

## Issues Found
- The Argo CD CLI example used `argocd app resources my-app --kind Pod --name web-abc123-x7k9l`. Official Argo CD documentation shows that `argocd app resources` lists application resources and does not provide `--kind` or `--name` filters for fetching a specific resource. I changed the command to `argocd app get-resource my-app --kind Pod --resource-name web-abc123-x7k9l`, which matches the official command reference for retrieving a specific live resource manifest.

## Review Notes
- Kubernetes event retention is configurable through the API server event TTL; the post correctly describes the default retention as 1 hour.
- The `kubectl get events` commands use supported `kubectl get` options and supported Event field selectors such as `involvedObject.name` and `type`.
- The Argo CD notification subscription annotations match the documented `notifications.argoproj.io/subscribe.<trigger>.<service>` format, and `on-health-degraded` / `on-sync-failed` are documented catalog triggers.

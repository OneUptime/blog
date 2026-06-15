# Validation Summary: How to Implement Self-Healing Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and automated sync
- Argo CD self-healing
- Argo CD sync options and diff customization
- Argo CD CLI
- Argo CD Notifications
- Argo CD Prometheus metrics
- Kubernetes Deployments
- Kubernetes Horizontal Pod Autoscaler behavior
- Prometheus alert rules

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl scale`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The drift detection explanation said Argo CD compares resources using a three-way diff. I changed this to distinguish drift detection, which compares desired Git manifests with live cluster resources, from client-side apply sync behavior, where the patch can use desired state, live state, and the `last-applied-configuration` annotation.
- The sync options example omitted `RespectIgnoreDifferences=true`, even though later examples rely on ignored fields not being applied during sync. I added the sync option where ignored fields should also be preserved during sync operations.
- The Deployment example used to demonstrate replica drift was not a valid `apps/v1` Deployment because it omitted required `selector` and `template` fields. I added matching labels, selector, pod template, and a sample container image.
- The HPA ignore-differences example ignored `/spec/replicas` but did not include `RespectIgnoreDifferences=true`, which can allow syncs triggered by other changes to re-apply the ignored field. I added the sync option.
- The Prometheus alert presented `argocd_app_sync_total` as a self-healing-specific metric. Argo CD documents it as a sync history counter, so I changed the alert wording to "frequent successful syncs" and noted that these may include self-healing.
- The notifications trigger accessed optional `status.operationState` fields without optional chaining. I updated the expression to use `?.`, matching Argo CD Notifications guidance for optional operation state fields.
- The sync window allow example did not include an application, namespace, or cluster selector. I added `applications: ['*']` so the window has an explicit target.

## Review Notes
The post is technically sound after the corrections. Future improvements could mention that automated self-healing retries after the controller self-heal timeout and that `argocd_app_sync_total` does not distinguish self-heal syncs from other successful sync operations by itself.

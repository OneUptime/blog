# Validation Summary: How to Restrict Users from Deleting Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Argo CD Applications
- Argo CD Notifications
- Kubernetes ConfigMaps
- Kubernetes RBAC and finalizers

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD App Deletion: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/triggers/
- Argo CD Notifications Slack Service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_delete/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/

## Issues Found
- The post described `resources-finalizer.argocd.argoproj.io` as delete protection. Argo CD documents this finalizer as the mechanism that enables cascading deletion of an Application's managed resources. I rewrote the section to explain that it is not a delete lock and that direct `kubectl` deletion should be controlled with Kubernetes RBAC or admission policy.
- The Application example placed `argocd.argoproj.io/sync-options: "Delete=false"` on the Application as a warning annotation. Argo CD documents `Delete=false` as a resource-level sync option for resources that should be retained during app deletion. I removed the incorrect Application annotation and clarified that it belongs on resource manifests that need retention.
- Several RBAC examples used `applications, action` to imply permission for all resource actions. Argo CD documents resource actions using the `action/<group>/<kind>/<action-name>` form, with `action/*` as the pattern for all actions. I changed the examples to `action/*`.
- The sample delete-restricted roles granted `override`, but Argo CD documents `override` as allowing arbitrary local manifests during sync and warns that it can change or delete deployed resources. I removed `override` from the non-admin delete-restricted example roles.

## Review Notes
- The `delete` RBAC examples, explicit `deny` behavior, `argocd app delete` cascade behavior, notification trigger structure, Slack service configuration, and token expiration flag matched official Argo CD documentation.
- The local environment did not have the `argocd` CLI installed, so CLI behavior was verified against official command documentation rather than local `--help` output.

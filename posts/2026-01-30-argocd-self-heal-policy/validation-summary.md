# Validation Summary: How to Create ArgoCD Self-Heal Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD automated sync and self-heal
- Argo CD ApplicationSets
- Argo CD AppProjects and sync windows
- Argo CD Notifications
- Kubernetes Deployments, Services, and Horizontal Pod Autoscaler
- YAML and CLI configuration

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/
- Argo CD ApplicationSet Template Patch documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Expr language definition for notification trigger expressions: https://expr-lang.org/docs/language-definition

## Issues Found
- The post said that without self-heal, drift can occur without anyone knowing. Argo CD still detects drift and marks applications OutOfSync; self-heal controls automatic correction. Updated the wording to distinguish detection from remediation.
- The post described the default reconciliation interval as exactly 3 minutes. Current Argo CD documentation describes it as `timeout.reconciliation: 120s` plus up to `timeout.reconciliation.jitter: 60s`, for a maximum of 3 minutes. Updated the claim.
- The ApplicationSet `templatePatch` example used Go template conditionals without enabling Go templating. Added `goTemplate: true` and `goTemplateOptions: ["missingkey=error"]`, and updated template variables to Go template syntax.
- The project-level section implied that self-heal policies can be enforced directly by AppProject. AppProjects do not define application self-heal policy; they can define sync windows and deployment constraints. Updated the section to describe project-level sync controls.
- The best-practice sync window example placed `syncWindows` on an `Application`, which is not a valid Application field. Replaced it with an `AppProject` example.
- The notification trigger accessed `operationState.message` without optional chaining. Updated it to use optional chaining and nil coalescing so the expression does not fail when `operationState` is absent.

## Review Notes
The remaining examples are generally accurate for current Argo CD behavior. The notification example still depends on the operation message containing `self-heal`, which may vary by Argo CD version and operational context; a future improvement could use a more robust organization-specific notification strategy if exact self-heal event classification is required.

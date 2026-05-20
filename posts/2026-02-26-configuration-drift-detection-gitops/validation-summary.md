# Validation Summary: How Configuration Drift Detection Works in GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes admission webhooks and controllers
- Horizontal Pod Autoscaler
- External Secrets Operator and Sealed Secrets
- Prometheus metrics
- Argo CD Notifications

## Sources Consulted
- Argo CD FAQ: reconciliation polling interval and jitter: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD Automated Sync Policy: self-heal configuration and timing semantics: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Diff Customization: `ignoreDifferences`, JSON pointers, JQ expressions, and `managedFieldsManagers`: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/diffing/
- Argo CD Diff Strategies: server-side diff behavior and configuration: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD Application Specification Reference: `syncPolicy.automated.selfHeal` and `ignoreDifferences`: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD command references for `argocd app diff` and `argocd app get --show-operation`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Metrics documentation: `argocd_app_info` and `argocd_app_sync_total`: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD controller metrics source for current `argocd_app_sync_total` labels: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Argo CD Notifications triggers and templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/

## Issues Found
- The reconciliation interval was described as simply "default 3 minutes." Current Argo CD documentation describes the default as `120s` plus up to `60s` of jitter, so I updated the wording.
- The server-side diff section incorrectly said server-side diff uses Kubernetes field ownership. Field ownership is handled through `managedFieldsManagers` ignore rules and structured merge behavior, while server-side diff uses a server-side apply dry run and compares the predicted live state. I corrected the explanation and added the documented controller-manager ignore example.
- The self-healing timing said corrections happen within the reconciliation interval. Argo CD's automated sync interval is controlled by `timeout.reconciliation`, while self-heal repeat attempts use the controller self-heal timeout, 5 seconds by default. I updated that wording.
- The PromQL examples used nonexistent `reason` and `trigger` labels on `argocd_app_sync_total`. I replaced them with valid queries using the documented `phase` label and `argocd_app_info{sync_status="OutOfSync"}`.
- The health guidance referenced decreasing drift events and self-heal frequency as if both were directly available from the shown metrics. I changed that language to OutOfSync duration and unexpected sync frequency.

## Review Notes
The remaining examples are valid as illustrative snippets. The notification trigger name `trigger.on-sync-status-unknown` is semantically awkward for an OutOfSync alert, but Argo CD treats trigger key names as user-defined identifiers, so it is not technically invalid.

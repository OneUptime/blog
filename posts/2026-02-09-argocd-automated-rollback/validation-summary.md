# Validation Summary: How to configure ArgoCD automated rollback on deployment failure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD sync hooks and automated sync
- Argo CD CLI
- Argo CD Notifications
- Argo Rollouts
- Kubernetes Jobs, RBAC, and kubectl
- Prometheus and PrometheusRule
- Git-based rollback workflows

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_hooks/
- Argo CD app rollback CLI reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD app patch CLI reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_patch/
- Argo CD Application Specification: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/subscriptions/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo Rollouts Canary strategy: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts Analysis and Prometheus provider: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Argo Rollouts Istio traffic routing: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction implied Argo CD can natively perform automated rollback on failed health checks. Updated the wording to clarify that rollback requires additional automation around Argo CD rollback and hooks.
- The sync retry section said the Application configuration detected failures and triggered rollbacks. Updated it to state that it configures retries before rollback automation runs.
- The SyncFail rollback hook attempted to parse `argocd app history` for `.status=="Synced"` and pass a Git revision to `argocd app rollback`. Argo CD rollback uses a history ID, and omitting the ID rolls back to the previous deployed version. Replaced the snippet with `argocd app rollback demo-app --prune`.
- The rollback hook did not account for Argo CD's rule that rollback cannot be performed while automated sync is enabled. Added an `argocd app patch` command to disable automated sync before rollback.
- The Argo CD server address in the in-cluster job used `argocd-server:443`, which would not resolve from the demo namespace in a typical install. Changed it to `argocd-server.argocd.svc:443` and added `ARGOCD_OPTS=--insecure` for common self-signed in-cluster Argo CD server certificates.
- Named hooks used only `HookSucceeded`, which can leave failed jobs behind and block later hook creation. Added `BeforeHookCreation` and rollback labels to hook jobs.
- The Git rollback job defined username/password environment variables but did not use them, and used `curl` in an image that may not include it. Changed the example to use a Git token in the clone URL and install curl before notification.
- The Argo Rollouts Istio example omitted `canaryService`, `stableService`, and the referenced route. Added those fields to match the traffic-routing requirements.
- The Argo Rollouts Prometheus `successCondition` expressions used `result` as a scalar. Prometheus provider results are vectors, so changed them to `result[0]`.
- The Notifications trigger accessed `app.status.operationState` without optional chaining. Changed it to `app.status?.operationState.phase` to avoid expression failures when `operationState` is absent.
- The multi-stage section described retry policies as rollback behavior. Updated the wording to describe them as failure handling before rollback automation.
- The monitoring section filtered Argo CD history JSON for a nonexistent `.status` field and referenced a `RollbackTriggered` event reason not created by the examples. Replaced those commands with Argo CD metrics inspection and Kubernetes Job event inspection.

## Review Notes
The post is technically relevant and salvageable. The examples remain illustrative and still require real credentials, Argo CD RBAC for the API token, matching service names, and a valid Istio VirtualService/Prometheus setup in an actual cluster.

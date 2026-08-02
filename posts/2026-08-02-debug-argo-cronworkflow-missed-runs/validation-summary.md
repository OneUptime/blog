# Validation Summary: Argo CronWorkflow Missed a Run: Debugging Time Zones, Starting Deadlines, and Concurrency

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Argo Workflows CronWorkflow API and controller
- Kubernetes custom resources, RBAC, events, and Pods
- Argo CLI and kubectl
- Cron expressions and IANA time zones
- Daylight-saving-time scheduling
- Argo expression templates

## Sources Consulted

- [Argo Workflows: Cron Workflows](https://argo-workflows.readthedocs.io/en/latest/cron-workflows/)
- [Argo Workflows: Cron Backfill](https://argo-workflows.readthedocs.io/en/latest/cron-backfill/)
- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Environment Variables](https://argo-workflows.readthedocs.io/en/latest/environment-variables/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: `argo cron get` CLI reference](https://argo-workflows.readthedocs.io/en/latest/cli/argo_cron_get/)
- [Argo Workflows: `argo cron resume` CLI reference](https://argo-workflows.readthedocs.io/en/latest/cli/argo_cron_resume/)
- [Argo Workflows v4.0 Upgrading Guide](https://argo-workflows.readthedocs.io/en/release-4.0/upgrading/)
- [Argo Workflows: High Availability](https://argo-workflows.readthedocs.io/en/latest/high-availability/)
- [Argo Workflows: Security and Controller Permissions](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Argo Workflows v4.0.8 CronWorkflow controller source](https://github.com/argoproj/argo-workflows/blob/v4.0.8/workflow/cron/operator.go)
- [Argo Workflows v4.0.8 Cron CLI output source](https://github.com/argoproj/argo-workflows/blob/v4.0.8/cmd/argo/commands/cron/util.go)
- [Argo Workflows v4.0.8 controller RBAC manifest](https://github.com/argoproj/argo-workflows/blob/v4.0.8/manifests/namespace-install/workflow-controller-rbac/workflow-controller-role.yaml)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- The post treated the CLI's next scheduled time as generally authoritative. Added the CLI's documented caveat that `NextScheduledTime` assumes the workflow controller uses UTC, so it should not be used alone for a non-UTC CronWorkflow.
- The singular `schedule` field was described only as historical. Clarified that it was deprecated in v3.6, removed in v4.0, and that `schedules` should be used on v3.6 and later.
- `concurrencyPolicy: Replace` was described as removing old Workflow objects. Corrected this to termination: the controller patches active Workflows with the `Terminate` shutdown strategy before submitting the new Workflow; it does not delete those Workflow objects as part of replacement.
- The controller RBAC checklist omitted patch and other Workflow permissions needed by current controller behavior. Updated it to match the current v4 controller RBAC verbs for CronWorkflows and Workflows.

## Review Notes

The review targeted current Argo Workflows v4.0 behavior and checked the relevant v4.0.8 implementation where the documentation was less precise. The complete CronWorkflow example parses as valid YAML and uses fields supported by the current API. The `schedules`, `when`, and `stopStrategy` features require Argo Workflows v3.6 or later; the singular `schedule` field is required for older releases and is unavailable in v4.0. CLI commands and links were verified against the official Argo and Kubernetes references. Commands that query resources require access to a live cluster and therefore were not executed against a cluster during this review.

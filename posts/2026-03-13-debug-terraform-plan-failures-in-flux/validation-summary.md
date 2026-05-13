# Validation Summary: How to Debug Terraform Plan Failures in Flux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Tofu Controller
- Terraform / OpenTofu workflow concepts
- Kubernetes custom resources, events, pods, and kubectl
- HelmRelease configuration
- AWS CLI and DynamoDB state lock inspection

## Sources Consulted
- Tofu Controller API reference: https://pkg.go.dev/github.com/flux-iac/tofu-controller/api/v1alpha1
- Tofu Controller documentation: https://flux-iac.github.io/tofu-controller/
- Tofu Controller runner logging documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/with-tf-runner-logging/
- Tofu Controller chart README and values: https://github.com/flux-iac/tofu-controller/tree/main/charts/tofu-controller
- Tofu Controller source code for plan failure reasons, plan storage, and runner cleanup behavior: https://github.com/flux-iac/tofu-controller
- Flux reconcile request annotation docs/source: https://github.com/fluxcd/pkg/blob/main/apis/meta/annotations.go
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post referenced `.status.plan.error`, but the current Tofu Controller status schema exposes plan metadata under `.status.plan` and does not define an `error` field. I changed the command to read the Ready condition message and added a warning-event query.
- The example condition and alerting guidance used `TerraformPlanFailed`, but Tofu Controller uses `TFExecPlanFailed` for plan execution failures. I updated both references.
- The post said runner pods contain the full Terraform output. Tofu Controller documentation notes runner logging can be disabled and plan errors are sanitized by default, so I qualified that statement.
- The debug logging snippet listed `trace` as a log level. The chart documents `logLevel` and operational examples use `info`/`debug`; I removed the unsupported `trace` suggestion.
- The post advised using a longer pod grace period to retain runner logs. The CRD defines `runnerTerminationGracePeriodSeconds` for shutdown behavior, while `alwaysCleanupRunnerPod` controls cleanup after reconciliation. I changed the guidance to temporarily set `.spec.alwaysCleanupRunnerPod: false`.

## Review Notes
The AWS credential debug pod command is technically valid, but it expands secret values into the local shell command and may expose them through shell history or process metadata. A future hardening pass could show a Kubernetes Secret/ServiceAccount-based debug pod instead.

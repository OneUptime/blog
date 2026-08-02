# Validation Summary: Why an Argo Rollouts AnalysisRun Is Stuck, Inconclusive, or Failing

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo Rollouts
- AnalysisRun and AnalysisTemplate custom resources
- Kubernetes Jobs and Pods
- kubectl
- Prometheus and PromQL
- Web metric providers
- Progressive delivery

## Sources Consulted
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts FAQ: AnalysisRun completion, failures, and errors](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Job Metrics (stable)](https://argo-rollouts.readthedocs.io/en/stable/analysis/job/)
- [Argo Rollouts: Job Metrics (latest development documentation)](https://argo-rollouts.readthedocs.io/en/latest/analysis/job/)
- [Argo Rollouts v1.9.1 Job provider source](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/metricproviders/job/job.go)
- [Argo Rollouts v1.9.1 analysis controller source](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/analysis/analysis.go)
- [Argo Rollouts v1.9.1 AnalysisRun API types](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/pkg/apis/rollouts/v1alpha1/analysis_types.go)
- [Argo Rollouts: Prometheus Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/)
- [Argo Rollouts: Web Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/web/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts kubectl plugin: Promote](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found
- The Job troubleshooting commands assumed the generated analysis Job was in the AnalysisRun namespace. Argo Rollouts stores both `job-name` and `job-namespace` in measurement metadata and can be configured to create Jobs in another namespace or cluster. The text and commands now use the recorded Job namespace and mention selecting the corresponding cluster context.
- The post described terminal image waiting reasons as always short-circuiting a Job measurement to `Inconclusive`. That behavior exists in the latest development code and documentation but is absent from the current v1.9.1 release, whose provider waits for the Job's `Complete` or `Failed` condition. The text now distinguishes the released and development behaviors and tells readers to verify their controller version.
- The post said failed measurements make a metric fail when they reach `failureLimit`. The API defines the field as the maximum allowed failures, and the controller fails a metric when the failed count exceeds that limit. The wording now says “exceeded.”
- The cleanup guidance blurred fields that live on AnalysisRun and Rollout resources. It now names AnalysisRun `measurementRetention` and `ttlStrategy` separately from Rollout `successfulRunHistoryLimit` and `unsuccessfulRunHistoryLimit`.

## Review Notes
- The YAML configuration snippet parses correctly, and the documented `count: 0`, `initialDelay`, `interval`, condition evaluation, empty-result, and phase behaviors match the official analysis documentation.
- The `kubectl get`, `describe`, and `logs` command forms and the standard `batch.kubernetes.io/job-name` selector are current.
- All five official documentation links already present in the post returned successful HTTP responses during validation.

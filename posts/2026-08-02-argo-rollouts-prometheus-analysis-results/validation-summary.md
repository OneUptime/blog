# Validation Summary: Prometheus AnalysisTemplates in Argo Rollouts: Handling Arrays, NaN, and Empty Results

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Argo Rollouts AnalysisTemplate and AnalysisRun custom resources
- Prometheus and PromQL
- Kubernetes
- Expr expression language
- kubectl

## Sources Consulted

- [Argo Rollouts: Prometheus Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts metric API types](https://github.com/argoproj/argo-rollouts/blob/master/pkg/apis/rollouts/v1alpha1/analysis_types.go)
- [Argo Rollouts Prometheus provider implementation](https://github.com/argoproj/argo-rollouts/blob/master/metricproviders/prometheus/prometheus.go)
- [Argo Rollouts expression evaluator implementation](https://github.com/argoproj/argo-rollouts/blob/master/utils/evaluate/evaluate.go)
- [Expr language definition](https://expr-lang.org/docs/language-definition)
- [Prometheus: Querying Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Query Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)

## Issues Found

- The no-data Inconclusive example set `inconclusiveLimit: 2` but did not configure repeated measurements. When both `interval` and `count` are omitted, the effective count is one; a single inconclusive measurement does not exceed a limit of two and the metric can complete as Successful when its count is reached. Added `interval: 1m` and `count: 5`, and clarified that the first two inconclusive measurements are tolerated while the third makes the metric Inconclusive.
- The NaN and infinity discussion implied that counter resets themselves can yield infinity. PromQL's `rate()` adjusts for counter resets. Replaced that statement with the precise IEEE 754 behavior: zero divided by zero yields NaN, while a nonzero value divided by zero yields infinity.

## Review Notes

- Verified the condition expressions, including empty-vector short-circuiting and vector NaN handling, against the current upstream Argo Rollouts evaluator and its Expr dependency.
- Ran the upstream `utils/evaluate` and `metricproviders/prometheus` Go test suites successfully, plus focused tests for the post's empty-result and NaN expressions.
- The post does not pin an Argo Rollouts version. The reviewed fields and behavior are present in the current stable documentation and upstream API definitions as of the validation date.

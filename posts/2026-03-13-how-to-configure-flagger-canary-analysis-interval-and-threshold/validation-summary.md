# Validation Summary: How to Configure Flagger Canary Analysis Interval and Threshold

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Kubernetes Deployments and DaemonSets
- Knative Services
- Prometheus and other metrics providers
- kubectl
- YAML

## Sources Consulted
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger "Deployment Strategies" documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger "Metrics Analysis" documentation: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ: https://docs.flagger.app/faq
- Flagger upgrade guide: https://docs.flagger.app/main/dev/upgrade-guide
- Flagger CRD source: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger Canary API source: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/apis/flagger/v1beta1/canary.go
- Flagger scheduler source: https://github.com/fluxcd/flagger/blob/main/pkg/controller/scheduler.go

## Issues Found
- The post described `threshold` as counting only consecutive failures and said the counter resets after a passing check. Flagger tracks failed checks for the current canary analysis and increments the counter on failed metric or webhook checks; successful checks do not reset that counter. Updated the introduction and threshold explanation accordingly.
- The prerequisites said a Canary can target a `StatefulSet`. The current Flagger CRD allows `Deployment`, `DaemonSet`, and `Service` targets, with `Service` used for the Knative provider. Updated the prerequisite bullet to avoid claiming StatefulSet support.
- The metric interval guidance said metric intervals should generally be equal to or longer than the analysis interval. Flagger's FAQ states that the metric interval should be lower than or equal to the control loop interval. Updated the guidance and rationale.

## Review Notes
- The configuration snippets use current `flagger.app/v1beta1` Canary fields such as `spec.analysis.interval`, `threshold`, `maxWeight`, `stepWeight`, `metrics[].thresholdRange`, and `metrics[].interval`.
- The rollback and promotion time formulas are approximate. Actual timing can vary with controller reconciliation, startup checks, hooks, provider behavior, and rollout health checks.

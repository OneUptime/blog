# Validation Summary: How to Use Argo Rollouts for Progressive Delivery with Analysis Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo Rollouts
- Kubernetes
- kubectl Argo Rollouts plugin
- Istio VirtualService traffic routing
- Prometheus analysis metrics and alerts
- Kubernetes Jobs
- Argo Rollouts notifications

## Sources Consulted
- Argo Rollouts installation documentation: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts Prometheus analysis provider documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Argo Rollouts rollout specification documentation: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Istio traffic management documentation: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- Argo Rollouts experiment documentation: https://argoproj.github.io/argo-rollouts/features/experiment/
- Argo Rollouts job analysis provider documentation: https://argoproj.github.io/argo-rollouts/analysis/job/
- Argo Rollouts dashboard documentation: https://argoproj.github.io/argo-rollouts/dashboard/
- Argo Rollouts notifications documentation: https://argoproj.github.io/argo-rollouts/features/notifications/
- Argo Rollouts controller metrics documentation: https://argoproj.github.io/argo-rollouts/features/controller-metrics/
- Argo Rollouts controller metrics package reference: https://pkg.go.dev/github.com/argoproj/argo-rollouts@v1.9.0/controller/metrics

## Issues Found
- Some inline canary analysis steps referenced the `success-rate` and `latency` AnalysisTemplates without supplying the required `service-name` argument. Added the missing `args` blocks so each inline AnalysisRun can resolve the template argument.
- The advanced error-rate comparison embedded a Prometheus comparison in the query but did not define a `successCondition`, which would leave the Argo Rollouts analysis inconclusive. Added `successCondition: result[0] == 1` and used Prometheus `bool` comparison so the query returns a numeric pass/fail value.
- The CPU and memory usage examples divided by cAdvisor quota/limit metrics in a way that was not a correct CPU-core or memory-byte utilization calculation. Updated them to compare usage against `kube_pod_container_resource_limits` and added a `canary-pod-regex` argument for pod matching.
- The experiment conversion-rate analysis also embedded its pass/fail comparison in the Prometheus query without a `successCondition`. Added `successCondition: result[0] == 1` and `bool` comparison.
- The Prometheus alert examples used undocumented or deprecated metric names (`argo_rollout_phase` and `argo_rollout_phase_timestamp`) and an incorrect label reference. Updated the alerts to use documented `rollout_info` metrics, current controller phase values, and the `name` label.

## Review Notes
The examples are version-neutral and use the current `argoproj.io/v1alpha1` Argo Rollouts API. The Prometheus metric names for application-level request, latency, conversion, and resource metrics are examples and still need to match the reader's own instrumentation and kube-state-metrics setup.

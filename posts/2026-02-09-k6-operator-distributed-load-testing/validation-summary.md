# Validation Summary: How to Configure K6 Operator for Distributed Load Testing of Kubernetes Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Grafana k6
- k6 Operator
- TestRun custom resources
- Helm
- Prometheus Remote Write
- Kubernetes CronJob and RBAC

## Sources Consulted
- Grafana k6 documentation: Running distributed tests, https://grafana.com/docs/k6/latest/testing-guides/running-distributed-tests/
- Grafana k6 documentation: Install k6 Operator, https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/install-k6-operator/
- Grafana k6 documentation: Configure the TestRun CRD, https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/usage/configure-testrun-crd/
- k6 Operator generated CRD reference, https://github.com/grafana/k6-operator/blob/main/docs/crd-generated.md
- k6 Operator sample TestRun manifest, https://github.com/grafana/k6-operator/blob/main/config/samples/k6_v1alpha1_testrun.yaml
- Grafana k6 documentation: Prometheus remote write, https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: RBAC, https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post used the old `kind: K6` resource. Current k6 Operator documentation and CRDs use `kind: TestRun` with the `testruns.k6.io` resource, so all manifests, `kubectl` commands, and RBAC resources were updated.
- The installation command pinned an outdated release URL. It was replaced with the official bundle installation command from the current k6 Operator documentation.
- The architecture section implied automatic result aggregation from all runners. The operator orchestrates distributed jobs, but centralized metrics require a real-time output backend, so the wording was corrected.
- The distributed-load section claimed total load equals single-pod load multiplied by `parallelism`. The k6 Operator splits the configured workload across runners using execution segments, so the explanation was corrected.
- The manual pod anti-affinity example was replaced with the supported `separate: true` TestRun option for spreading runners across nodes.
- The Prometheus example used Pushgateway-style configuration and omitted the k6 Prometheus Remote Write output flag. It now uses `-o experimental-prometheus-rw`, the `/api/v1/write` endpoint, and current remote-write metric names.
- The cleanup example used an unsupported `ttlSecondsAfterFinished`-style value. The k6 Operator CRD currently supports `cleanup: post`, so the example was corrected.
- The log summary command grepped for a literal `summary` string that is not reliably present in k6 end-of-test output. It now tails the runner logs directly.

## Review Notes
The post is technically valid after corrections. Prometheus Remote Write remains documented by k6 as experimental, and Prometheus 2.x must be started with remote-write receiver support for the example endpoint to work.

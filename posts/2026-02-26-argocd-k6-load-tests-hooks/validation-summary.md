# Validation Summary: How to Use k6 Load Tests with ArgoCD Hooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks and sync waves
- Kubernetes Jobs, ConfigMaps, environment variables, and resource limits
- Grafana k6 load testing, thresholds, checks, scenarios, custom metrics, and exit codes
- k6 Prometheus remote-write output
- k6-operator TestRun resources
- Helm
- Slack incoming webhooks

## Sources Consulted
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 checks documentation: https://grafana.com/docs/k6/latest/using-k6/checks/
- Grafana k6 built-in metrics reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Grafana k6 Prometheus remote-write output: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Grafana k6 Operator installation: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/install-k6-operator/
- Grafana k6 Operator TestRun CRD usage: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/usage/executing-k6-scripts-with-testrun-crd/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

## Issues Found
- The k6 scripts used `check()` assertions but did not threshold the `checks` metric. k6 documents that failed checks do not fail the run by themselves, so I added `checks: ['rate>0.99']` to the relevant threshold examples.
- The Prometheus section said metrics were pushed to Prometheus without mentioning the remote-write receiver prerequisite. I clarified that k6 sends to a Prometheus remote-write endpoint and that Prometheus 2.x needs `--web.enable-remote-write-receiver`.
- The k6-operator Helm install command omitted the required Grafana Helm repository setup. I added `helm repo add grafana https://grafana.github.io/helm-charts` and `helm repo update`.
- The Slack result handler captured the pipeline exit status from `tee`, not from `k6`, so threshold failures could be hidden. I changed the wrapper to persist and reuse the actual k6 exit code.
- The Slack payload interpolated raw k6 output into JSON, which could break when the summary contained quotes or newlines. I added minimal escaping and newline flattening.
- The Slack notification example used the stock `grafana/k6` image while invoking `curl`. I changed it to a placeholder wrapper image that explicitly includes both k6 and curl.

## Review Notes
- The examples still pin `grafana/k6:0.49.0`. The APIs shown are still consistent with current k6 documentation, but the image tag is old and should be updated after testing in the target environment.
- Local validation confirmed the Markdown YAML code blocks parse with PyYAML, the standalone JavaScript block passes `node --check`, and the referenced OneUptime link returned HTTP 200. k6 itself was not installed locally, so the k6 scripts were reviewed against official documentation rather than executed.

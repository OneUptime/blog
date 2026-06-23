# Validation Summary: How to Implement Canary Deployments with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio traffic management
- Kubernetes Deployments, Services, CronJobs, and RBAC
- Prometheus and Prometheus Operator
- Grafana dashboards
- Flagger progressive delivery
- GitLab CI/CD
- Bash scripting

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Flagger installation documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger canary workflow documentation: https://docs.flagger.app/usage/how-it-works
- Flagger metrics analysis documentation: https://docs.flagger.app/usage/metrics
- Flagger Istio progressive delivery tutorial: https://docs.flagger.app/tutorials/istio-progressive-delivery

## Issues Found
- The Flagger Helm install omitted the CRD installation step while using the Helm chart directly. Added the official CRD apply command and set `crd.create=false`, matching Flagger's documented Helm install flow.
- The Flagger `request-success-rate` MetricTemplate calculated `100 - successful_request_percentage`, which is an error-rate style value while the Canary used `thresholdRange.min: 99`. Changed the query to return the successful request percentage.
- The analyzer CronJob used `bitnami/kubectl:latest` while the script depends on `bash`, `curl`, `jq`, and `bc` in addition to `kubectl`. Changed the example to require a custom analyzer image containing those tools.
- The Flagger Canary example referenced a Deployment named `myapp` after earlier manual examples created separate `myapp-stable` and `myapp-canary` Deployments. Added a clarification that the Flagger example assumes a single Deployment named `myapp`, which Flagger uses to create/manage primary and canary workloads.
- The monitoring section described scraping Istio request metrics with a ServiceMonitor targeting `istiod`. Istio request metrics such as `istio_requests_total` are emitted by data-plane proxies, while `istiod` exposes control-plane metrics. Clarified that application pods must be scraped through Istio metrics merge for canary request metrics, and that the shown ServiceMonitor is for Istiod control-plane metrics.

## Review Notes
The Istio networking examples use `networking.istio.io/v1beta1`, which remains accepted for the versions discussed, though current Istio documentation increasingly shows `networking.istio.io/v1`. The Prometheus queries depend on the default Istio telemetry labels, including `destination_version`; clusters that customize telemetry dimensions may need to adjust the queries.

# Validation Summary: How to Set Up Automatic Recovery for Istio Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Deployments
- Kubernetes liveness and readiness probes
- Kubernetes HorizontalPodAutoscaler
- Kubernetes CronJobs
- kubectl
- istioctl
- Envoy sidecar health endpoints
- Istio certificate management
- Prometheus Alertmanager

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Istio Debugging Envoy and Istiod / proxy-status: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio plug in CA certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Prometheus Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The first `apps/v1` Deployment example was missing the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels`.
- The HPA section omitted the requirement that resource utilization targets depend on container resource requests. Added a short note that CPU and memory requests must be set on the istiod container.
- The sidecar health CronJob used `jq` while the selected image only guaranteed `kubectl`. Replaced the JSON + `jq` pipeline with a `kubectl` Go template.
- The istio config sync CronJob used `istio/istioctl:latest` while also invoking `kubectl`. Changed the example to use a custom image that contains both tools.
- The config sync script used `grep -c ... || echo "0"`, which can produce duplicate zero output when `grep` finds no matches. Changed it to `grep -c ... || true`.
- The certificate expiry CronJob used an istioctl image even though it invoked `kubectl`, `openssl`, and `date`. Changed it to a custom image containing the required tools.
- The certificate expiry script checked only `istio-ca-secret` and `ca-cert.pem` while plugged-in CA installs use the `cacerts` secret and `root-cert.pem`. Added checks for `cacerts/root-cert.pem`, `istio-ca-secret/root-cert.pem`, and then `istio-ca-secret/ca-cert.pem` as a fallback.
- The certificate expiry script could continue with an empty parsed expiry value. Added an explicit parse failure check.
- The ingress gateway health CronJob used `curlimages/curl` while invoking `kubectl`. Changed it to a custom image containing both `kubectl` and `curl`.
- The simple controller script claimed it waited 5 minutes before restarting istiod, but it restarted immediately when ready replicas were zero. Updated the comment to match the script behavior.
- The Alertmanager route used deprecated `match` syntax. Updated it to the current `matchers` syntax.

## Review Notes
The recovery examples are still illustrative and require appropriate RBAC for each service account before they can run in a cluster. The custom image placeholders should be replaced with internally built images that pin tested versions of `kubectl`, `istioctl`, `curl`, and `openssl`.

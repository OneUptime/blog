# Validation Summary: How to Implement Gradual Rollout with Automatic Rollback in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService and DestinationRule
- Kubernetes CronJob, ConfigMap, ServiceAccount, RBAC, and Deployments
- kubectl patch, set image, and scale
- Prometheus HTTP API and PromQL
- Bash rollout scripting
- Flagger

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Flagger Istio progressive delivery documentation: https://docs.flagger.app/main/tutorials/istio-progressive-delivery

## Issues Found
- The Istio resource examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for VirtualService and DestinationRule examples, so both snippets were updated.
- The Prometheus queries selected `destination_workload="my-app-canary"` and `destination_workload="my-app-stable"`, which depends on workload names and does not directly match the version labels used by the DestinationRule subsets. The queries now select the service and `destination_version` labels, with `reporter="destination"` and the namespace label to avoid ambiguous or double-counted metrics.
- The error-rate comparison could fail if Prometheus returned no sample or a non-finite value. The script now normalizes non-numeric results to `0` before passing the value to `bc`.
- The CronJob used `bitnami/kubectl:latest`, but the script requires `kubectl`, `curl`, `jq`, `bc`, and `bash`, and `latest` is not a reproducible runtime choice. The image reference was changed to a pinned custom controller image placeholder with the required tools called out.
- The RBAC allowed only VirtualService access, but the post-rollout cleanup script also reads, patches, and scales Deployments. The Role now includes `apps/deployments` and `apps/deployments/scale` permissions.
- The latency check divided by the stable P99 value without guarding against missing or zero data. The example now validates both latency values and avoids division by zero.
- The rollout timeline ended at `T+45` but said the total was about 50 minutes. The text now says about 45 minutes once the controller starts.

## Review Notes
- The script-based approach is technically valid for a simple tutorial, but a production implementation should also handle idempotency, promotion state, request-volume gates, alert delivery failures, and multi-route VirtualServices more rigorously.

# Validation Summary: How to Correlate ArgoCD Logs with Application Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications, resource tracking, sync hooks, and notifications
- Kubernetes Deployments and kubectl logs
- OpenTelemetry Collector filelog receiver, k8sattributes processor, transform processor, and OTLP HTTP exporter
- Grafana annotations API
- Loki LogQL
- Elasticsearch Query DSL
- Bash scripting

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD resource tracking: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD resource hooks / sync phases: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications webhook service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- OpenTelemetry Collector Kubernetes components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry k8sattributes processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- Grafana Annotations HTTP API: https://grafana.com/docs/grafana/latest/http_api/annotations/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/logql/

## Issues Found
- The Argo CD Application manifest omitted `spec.project`, which is part of the standard Application spec. Added `project: default`.
- The Application example implied `CreateNamespace=true` propagates labels to managed resources. Corrected the comment because that sync option creates the destination namespace; matching workload labels still need to be declared in manifests.
- The Kubernetes Deployment snippet was incomplete for `apps/v1` because it lacked a required selector and pod container spec. Added `spec.selector`, matching pod labels, and a minimal container.
- The sync hook used `${ARGOCD_APP_REVISION}` and `${ARGOCD_APP_SOURCE_REPO_URL}` as if Argo CD automatically injected them into the Job container. Replaced those with `kubectl get application ... -o jsonpath=...` commands that can run from the hook pod when RBAC permits.
- The OpenTelemetry Collector filelog receiver examples used receiver-level `attributes` fields and manually parsed container logs with a regex. Updated them to use the documented `container` operator and `add` operators.
- The OpenTelemetry transform read `argocd_app` from log attributes even though `k8sattributes` extracts labels into resource attributes. Updated the transform to read `resource.attributes["argocd_app"]`.

## Review Notes
- The hook Job's `deployment-annotator` service account must be granted permission to read the Argo CD Application and annotate the target Deployment.
- The OpenTelemetry Collector DaemonSet also needs hostPath mounts for `/var/log/pods` and RBAC for Kubernetes metadata enrichment.
- Grafana's legacy `/api/annotations` endpoint remains valid, but Grafana documentation notes that `/api` routes are being deprecated in favor of newer `/apis` routes where replacements exist.

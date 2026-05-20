# Validation Summary: How to Set Up Full Observability for ArgoCD with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Operator
- Prometheus remote write
- Jaeger / OTLP
- Grafana Loki / OTLP logs
- cert-manager

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/release-3.3/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector contrib component manifest: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-releases/main/distributions/otelcol-contrib/manifest.yaml
- Grafana Loki OpenTelemetry Collector log ingestion documentation: https://grafana.com/docs/grafana-cloud/send-data/logs/collect-logs-with-otel/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/

## Issues Found
- The OpenTelemetryCollector examples used `apiVersion: opentelemetry.io/v1alpha1` and string-style `spec.config`. Updated them to current `opentelemetry.io/v1beta1` examples with object-style `spec.config`.
- The collector examples used the removed/non-current `loki` exporter. Updated Loki log export to use the supported `otlphttp` exporter with Loki's OTLP endpoint.
- The main collector used `otlphttp/loki` in the logs pipeline without defining that exporter. Added the matching exporter definition.
- The collector defined a filter processor but did not use it in the metrics pipeline. Added `filter` to the metrics processor list so the example matches the comment.
- The cert-manager install command pinned an old release. Updated it to the current official manifest version shown in cert-manager docs.
- The metrics section suggested enabling metrics with `server.enable.proxy.extension` in `argocd-cm`, which is unrelated to Argo CD metrics. Replaced it with checks for the default metrics services and backend query verification.
- The tracing section configured `otlp.address` in `argocd-cm`; Argo CD runtime command parameters belong in `argocd-cmd-params-cm`. Updated the ConfigMap name and added supported OTLP parameters.
- The tracing section suggested generic OpenTelemetry environment variables and sampler settings for Argo CD components. Replaced them with supported Argo CD `otlp.headers` and `otlp.attrs` command parameters.
- The filelog receiver attempted to parse Kubernetes container log files directly as Argo CD JSON logs and omitted host log volume mounts. Updated it to use the collector's `container` parser and added `/var/log/pods` hostPath mounting.
- The metric names `argocd_app_reconcile_duration` and `argocd_repo_server_queue_depth` were not current Argo CD metrics. Replaced them with `argocd_app_reconcile` and `argocd_repo_pending_request_total`.
- The correlation section included an invalid transform example using `SpanID()` in a metric datapoint context and implied scraped metrics automatically gain exemplars. Replaced it with a correct caveat about shared resource attributes and trace context requirements.
- The Loki verification query used `{namespace="argocd"}` even the corrected OTLP resource attribute is normalized as `k8s_namespace_name` in Loki. Updated the query accordingly and URL-encoded it with `curl -G --data-urlencode`.

## Review Notes
- The Prometheus remote write endpoint in the example assumes the destination accepts remote write. Plain Prometheus requires its remote write receiver to be enabled; Mimir and other compatible backends commonly accept this endpoint.
- The OpenTelemetry Collector contrib image is specified because the example uses contrib components such as `prometheusremotewrite` and `filelog`.

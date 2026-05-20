# Validation Summary: How to Trace ArgoCD Operations with Distributed Tracing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- OpenTelemetry and OTLP
- OpenTelemetry Collector
- Jaeger
- Grafana Tempo
- Grafana Loki derived fields

## Sources Consulted
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD high availability and shallow clone documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/#shallow-clone
- Argo CD source code for OTLP tracer initialization and span names: https://github.com/argoproj/argo-cd
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/latest/deployment/operator/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo data source documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/

## Issues Found
- The post said OpenTelemetry tracing was added in Argo CD 2.8. Argo CD release notes show OpenTelemetry tracing integration existed earlier for server and repo-server, and current support varies by component. Removed the inaccurate version claim.
- The OTLP endpoint was shown under `argocd-cm`. Argo CD documents `otlp.address`, `otlp.insecure`, `otlp.headers`, and `otlp.attrs` in `argocd-cmd-params-cm`, so the ConfigMap example was corrected.
- The environment variable examples used generic OpenTelemetry SDK variables such as `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_TRACES_SAMPLER`. Argo CD reads component-specific `ARGOCD_*_OTLP_*` variables and `--otlp-*` flags, so the examples were corrected.
- The sampling guidance implied Argo CD would honor OpenTelemetry SDK sampler environment variables. The Argo CD tracer initialization uses its built-in OTLP configuration, so the guidance now recommends collector-side tail sampling.
- The span table used fabricated span names such as `argocd.sync`, `argocd.git.fetch`, and `argocd.manifest.generate`. These were replaced with representative Argo CD gRPC and Kubernetes operation spans from the current command/source layout.
- The shallow clone example incorrectly used `spec.source.directory.recurse: false`, which controls directory recursion and does not enable shallow cloning. It now uses the repository Secret `depth: "1"` option documented by Argo CD.
- The log correlation section implied Argo CD automatically injects trace IDs into logs. It now states that the log pipeline can link log lines that contain trace IDs.

## Review Notes
The Jaeger and Tempo snippets are plausible examples, but production deployments should normally be managed through the current operator or Helm chart for each backend and adapted to the storage, credentials, and retention requirements of the target environment.

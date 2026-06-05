# Validation Summary: How to Configure Jaeger All-In-One with Persistent Storage

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Jaeger all-in-one
- Jaeger Badger storage backend
- Kubernetes Deployments, Services, PersistentVolumeClaims, ConfigMaps, Ingress, probes, and CronJobs
- OpenTelemetry OTLP exporters for Go and Python
- Jaeger Operator
- Elasticsearch storage for Jaeger production deployments

## Sources Consulted
- Jaeger 1.76 Deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger 1.76 CLI flags: https://www.jaegertracing.io/docs/1.76/deployment/cli/
- Jaeger 1.76 Sampling documentation: https://www.jaegertracing.io/docs/1.76/architecture/sampling/
- Jaeger 2.x Deployment and Configuration documentation: https://www.jaegertracing.io/docs/2.16/deployment/configuration/
- Jaeger 2.x Architecture documentation: https://www.jaegertracing.io/docs/latest/architecture/
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/1.37/operator/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes well-known annotations documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Go OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html

## Issues Found
- The post used `jaegertracing/all-in-one:latest` while relying on Jaeger 1.x environment variables. I pinned the image examples to `jaegertracing/all-in-one:1.76.0` and added a short note that Jaeger 2.x uses configuration files instead.
- The persistent Deployment used `name: jaeger-persistent` and `app: jaeger-persistent`, while the Service and Ingress targeted `jaeger` / `app: jaeger`. I aligned the persistent Deployment name and labels with the existing Service target.
- The examples configured health probes on port `14269` but did not expose that admin port in the Deployment port lists. I added the admin container port to the basic and persistent Deployment snippets.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingressClassName: nginx`.
- The Python OTLP gRPC exporter endpoint omitted the URL scheme. I changed it to `http://jaeger.tracing.svc.cluster.local:4317`, matching OpenTelemetry exporter endpoint guidance for insecure OTLP/gRPC connections.
- The troubleshooting section referenced `BADGER_TRUNCATION_INTERVAL`, which is not a Jaeger 1.76 Badger option. I replaced it with a valid operational recommendation to increase memory limits.

## Review Notes
The guide is accurate as a Jaeger 1.76 all-in-one guide. For future modernization, a separate Jaeger 2.x version should use the `jaegertracing/jaeger` image and Jaeger 2.x YAML configuration instead of the Jaeger 1.x environment variables.

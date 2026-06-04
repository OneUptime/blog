# Validation Summary: How to Add Custom Span Events and Attributes for Kubernetes-Specific Context

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Downward API
- OpenTelemetry tracing
- OpenTelemetry Go API
- OpenTelemetry semantic conventions
- Go
- Linux cgroups
- Grafana Tempo and TraceQL

## Sources Consulted
- OpenTelemetry Kubernetes resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry Go trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes cgroup v2 overview: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux kernel CFS bandwidth control documentation: https://www.kernel.org/doc/html/latest/scheduler/sched-bwc.html
- Go ioutil package documentation: https://pkg.go.dev/io/ioutil
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/enterprise-traces/latest/api_docs/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The Kubernetes namespace attribute used `k8s.namespace`, which does not match OpenTelemetry's Kubernetes resource semantic convention. Changed it to `k8s.namespace.name`.
- The post treated the Deployment `pod-template-hash` label as a ReplicaSet name. The Kubernetes Downward API can expose labels, but it does not expose owner ReplicaSet names through `fieldRef`. Renamed the field and environment variable to `PodTemplateHash` / `K8S_POD_TEMPLATE_HASH` and recorded it as `k8s.pod.label.pod-template-hash`.
- Several Go snippets were missing imports required by the code shown, including `trace`, `codes`, and the local `observability` package. Added placeholder module imports so the snippets are syntactically complete.
- The resource monitoring example used deprecated `io/ioutil`. Replaced it with `os.ReadFile`, which Go documentation recommends for new code.
- The cgroup example only read cgroup v1 paths and converted cumulative CPU time to millicores incorrectly. Updated it to read cgroup v2 files first, fall back to cgroup v1 files, store cumulative CPU usage as nanoseconds, and compute CPU limit millicores from quota and period.
- The HTTP examples used older semantic convention keys such as `http.method`, `http.target`, `http.status_code`, and `http.user_agent`. Updated them to current keys including `http.request.method`, `url.path`, `http.response.status_code`, and `user_agent.original`.
- The database example used older semantic convention keys `db.system` and `db.statement`. Updated them to `db.system.name` and `db.query.text`.
- The database error example called `RecordError` but did not set span status. OpenTelemetry Go documents that `RecordError` does not change span status, so the snippet now also calls `span.SetStatus(codes.Error, err.Error())`.
- The Tempo query examples used JSON POST bodies for `/api/search`. Tempo documents GET requests with `q` for TraceQL or `tags` for logfmt tag search, so the examples now use `curl -G --data-urlencode` with TraceQL.
- The slow-request Tempo query filtered event attributes as if they were span tags. Updated it to use TraceQL event scope with `event:name` and `event.event.type`.

## Review Notes
- The resource usage fields are useful as span attributes for debugging, but in production they are often better emitted as metrics or resource attributes collected by an OpenTelemetry Collector/Kubernetes integration.
- `db.query.text` can expose sensitive data if raw SQL contains literals. The post keeps the original example shape, but production instrumentation should sanitize non-parameterized query text or avoid recording it by default.

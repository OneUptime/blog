# Validation Summary: How to Integrate Zipkin with Istio for Distributed Tracing

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- Zipkin
- Envoy distributed tracing
- B3 and W3C trace context propagation
- Kubernetes Deployments, Services, CronJobs, and kubectl
- Elasticsearch / OpenSearch storage for Zipkin
- Java Spring Boot servlet filters
- Node.js Express middleware

## Sources Consulted
- Istio Telemetry API tracing docs: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio distributed tracing overview and propagation guidance: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- OpenZipkin server README and configuration reference: https://github.com/openzipkin/zipkin
- OpenZipkin zipkin-server configuration reference: https://raw.githubusercontent.com/openzipkin/zipkin/master/zipkin-server/README.md
- OpenZipkin B3 propagation specification: https://github.com/openzipkin/b3-propagation
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Spring Boot servlet documentation: https://docs.spring.io/spring-boot/3.3/reference/web/servlet.html

## Issues Found
- The Zipkin examples pinned `openzipkin/zipkin:3.3`, which is stale for a 2026 guide. Updated both Deployment examples to `openzipkin/zipkin:3.6.1`, the latest release shown by the official OpenZipkin repository at review time.
- The UI URL used `http://localhost:9411`. Zipkin's current documentation points users to `/zipkin`, so the article now uses `http://localhost:9411/zipkin`.
- The Istio `IstioOperator` example omitted `defaultConfig.tracing: {}`, which Istio's Telemetry API guide includes to disable legacy MeshConfig tracing options. Added it and updated the ConfigMap instruction accordingly.
- The B3 single-header description did not mention that the sampling state and parent span ID are optional. Updated the sentence to match the B3 propagation specification.
- The application propagation snippets only forwarded B3 headers and `x-request-id`. Istio's current tracing overview also recommends forwarding `traceparent` and `tracestate`, so both Java and Node.js examples now include them.
- The Java snippet used an undefined `TraceContext` helper and omitted imports. Replaced it with a local `ThreadLocal` example, added current `jakarta.servlet` imports for Spring Boot 3, and cleared the context in a `finally` block.
- The Elasticsearch example used a short service DNS name. Updated it to the fully qualified Kubernetes service DNS name for consistency with the Zipkin service example.
- The index cleanup CronJob used `grep -P`, which is not portable in the `curlimages/curl` container. Replaced it with a POSIX-compatible `sed` expression and quoted the index variable.
- The troubleshooting command executed `curl` inside the `istio-proxy` container. Istio proxy images are not a reliable place to expect curl, so the command now runs from the application container in the `sleep` deployment.

## Review Notes
- `kubectl` and `istioctl` were not installed in the local environment, so CLI validation was performed against official Kubernetes and Istio documentation instead of local help output.
- The index cleanup example remains a simple illustrative CronJob. Production Elasticsearch/OpenSearch retention is often better handled with ILM or an operator-managed retention policy.

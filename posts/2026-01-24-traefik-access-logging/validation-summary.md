# Validation Summary: How to Configure Access Logging in Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik access logs
- Kubernetes ConfigMaps, Deployments, volumes, and CRDs
- Fluentd log shipping
- Elasticsearch/OpenSearch query DSL
- Grafana Loki LogQL
- Prometheus / PromQL

## Sources Consulted
- Traefik Logs & AccessLogs documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/logs-and-accesslogs/
- Traefik Kubernetes CRD provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/kubernetes/kubernetes-crd/
- Traefik IngressRoute CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik per-router observability documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/observability/
- Traefik metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Elasticsearch range query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-range-query
- Grafana Loki query documentation: https://grafana.com/docs/loki/latest/query/

## Issues Found
- The default access-log example showed generic CLF output, but Traefik's default `common` format is extended CLF with additional request count, router, backend URL, and duration fields. Updated the wording and example output.
- The JSON format section implied only `json` and `common` are valid formats. Updated it to include `genericCLF`, which is supported by current Traefik documentation.
- The selective filtering section suggested adding a header with middleware and filtering access logs by that header. Traefik access-log filters support status codes, retry attempts, and minimum duration, not arbitrary header filtering. Replaced the example with router-level `observability.accessLogs: false`.
- The log rotation section did not mention Traefik's file reopen behavior. Added a note that external rotation must send `USR1` or use copy/truncate behavior.
- The Fluentd sidecar mounted `/var/log/traefik` read-only while placing `pos_file` under that same path. Moved the Fluentd position file to a separate writable `emptyDir` mount.
- The Elasticsearch/OpenSearch range-query example contained an inline SQL-style comment inside the JSON body. Removed it so the request body is valid JSON.
- The PromQL example grouped `traefik_entrypoint_requests_total` by `path`, but Traefik's entrypoint metrics do not expose a `path` label. Changed the example to request rate by router using `traefik_router_requests_total`.
- The performance section implied Traefik itself supports percentage sampling and path-based filtering. Updated it to describe sampling in the log pipeline and router-level disabling for low-value routes.

## Review Notes
The Kubernetes Deployment snippets remain illustrative excerpts rather than complete apply-ready manifests; production manifests should include selectors, pod template labels, images, probes, and security context appropriate to the deployment.

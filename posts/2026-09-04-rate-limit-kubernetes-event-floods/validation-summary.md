# Validation Summary: How to Rate-Limit Kubernetes Event Floods Before They Saturate the API Server

## Status
validated

## Post Type
Technical guide with PromQL, shell commands, a Go configuration fragment, Kubernetes YAML, and operational rollout guidance.

## Technologies Covered
- Kubernetes Events: core/v1 and events.k8s.io/v1
- EventRateLimit admission controller and kube-apiserver admission configuration
- client-go event recorders, correlation, and REST client throttling
- KubeletConfiguration v1beta1
- API Priority and Fairness (APF)
- ResourceQuota, audit logging, Prometheus, and etcd
- Go, kubectl, jq, and YAML

## Sources Consulted
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#eventratelimit
- EventRateLimit configuration API: https://kubernetes.io/docs/reference/config-api/apiserver-eventratelimit.v1alpha1/
- Kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Core Event API, including list pagination and reporting fields: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes APF documentation: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- client-go record package: https://pkg.go.dev/k8s.io/client-go/tools/record
- client-go events package: https://pkg.go.dev/k8s.io/client-go/tools/events
- client-go REST configuration: https://pkg.go.dev/k8s.io/client-go/rest#Config
- client-go v0.35.0 correlator implementation: https://github.com/kubernetes/client-go/blob/v0.35.0/tools/record/events_cache.go
- client-go v0.35.0 REST limiter construction: https://github.com/kubernetes/client-go/blob/v0.35.0/rest/config.go
- EventRateLimit admission implementation, checked at v1.35.0 and v1.36.0: https://github.com/kubernetes/kubernetes/blob/v1.35.0/plugin/pkg/admission/eventratelimit/admission.go and https://github.com/kubernetes/kubernetes/blob/v1.36.0/plugin/pkg/admission/eventratelimit/admission.go
- EventRateLimit bucket implementation: https://github.com/kubernetes/kubernetes/blob/v1.35.0/plugin/pkg/admission/eventratelimit/limitenforcer.go
- API endpoint kind selection and admission attributes: https://github.com/kubernetes/apiserver/blob/v0.35.0/pkg/endpoints/installer.go and https://github.com/kubernetes/apiserver/blob/v0.35.0/pkg/endpoints/handlers/create.go
- Events API storage and conversion: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/registry/events/rest/storage_events.go and https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/apis/events/v1/conversion.go
- ResourceQuota ignored resources, checked at v1.35.0 and v1.36.0: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/quota/v1/install/registry.go and https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/quota/v1/install/registry.go
- APF response header implementation: https://github.com/kubernetes/apiserver/blob/v0.35.0/pkg/server/filters/priority-and-fairness.go
- jq manual: https://jqlang.org/manual/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
1. **Authenticated identity was claimed as a metric dimension.** `apiserver_request_total` has no authenticated-user label. Updated the introduction to the query to direct identity attribution to audits and explain that `instance` comes from the scrape target configuration. The PromQL itself is valid.
2. **The sample command was not bounded at retrieval.** The original command fetched all Events and truncated only after jq and sorting. Replaced the retrieval with one core API list page using `limit=200`, removed the redundant output truncation, and explained that this is neither an exhaustive nor a newest-first sample.
3. **The reporting field did not match core/v1 Events.** core/v1 uses `reportingComponent`, whereas events.k8s.io/v1 uses `reportingController`. Made the extraction match the explicitly selected core endpoint, retained legacy source fallbacks, and handled empty strings as well as missing values. Simplified object references and counts to the core API fields.
4. **User agent was presented as stronger attribution evidence.** It is client-supplied just like the reporting field. Updated the text to distinguish authenticated identity from the supporting user-agent clue.
5. **Aggregation keys and spam-filter bucket keys were conflated.** Clarified that `SpamKeyFunc` determines rate-limit buckets, that the default spam key excludes the message, and that the legacy default aggregator can combine differing messages. This avoids implying that changing messages automatically creates new default rate-limit buckets.
6. **REST throttling scope was overstated.** A configuration is not itself a shared process-wide limiter. Clarified that separately constructed clients can have separate buckets unless they share a limiter; preserved the correct custom `RateLimiter` override behavior.
7. **EventRateLimit coverage was overstated.** The checked v1.35.0 and v1.36.0 implementations restrict admission by the core Event GroupKind. Endpoint registration and admission attribute construction retain the requested API group, even though Event storage uses a common internal object. Added the explicit version-scoped limitation for events.k8s.io/v1 and told readers to verify their emitter's API and server version. Retained core create/update coverage, including PATCH updates.
8. **Bucket scope across API-server replicas was omitted.** The plugin allocates its token buckets and caches in process memory. Clarified that all bucket types are per API-server process and that replica count and traffic distribution affect the aggregate allowance.
9. **ResourceQuota was incorrectly described as limiting Event object counts.** Stock Kubernetes explicitly ignores Events in both API groups in the checked versions. Replaced the claim with the actual behavior.
10. **The conclusion implied APF needed to be added.** APF is normally enabled already. Changed the conclusion to describe tuning it and qualified EventRateLimit use by its API coverage.

## Review Notes
- Verified the alpha, disabled-by-default status of EventRateLimit, four limit types, configuration API versions, admission flags, positive example QPS/burst values, LRU cache semantics, and Server cache-size exception against documentation and implementation.
- Verified the documented kubelet defaults of 50 Event creations per second and burst 100, and the documented zero-QPS semantics. The post's 25/50 values remain clearly labeled examples rather than defaults or production prescriptions.
- Verified Event series/count fields, best-effort diagnostic semantics, client-go recorder APIs, REST configuration fields, and APF response classification headers. The retry pseudocode expresses sound producer-side suppression and backoff guidance.
- Reviewed the correlation of Event writes with admission, persistence, watches, and broader API load. Event object count alone remains insufficient to diagnose write volume; the post correctly calls for multiple metrics and audit evidence.
- All seven official documentation links in the post resolved to relevant resources. The older Event URL redirects to the current core Event reference and remains functional.
- Local checks passed: shell syntax validation; jq extraction against modern core reporting fields, legacy sources with empty reporting strings, and missing attribution fields; and parsing all three YAML blocks with PyYAML.
- The Go example is a configuration fragment intended for an error-returning function with the client-go/rest import. It is not a standalone program. It was checked against the API and implementation, not compiled as a complete application.
- No live Kubernetes cluster was used, no flood was generated, and no admission rollout or performance guarantee was tested. Production settings still require the isolated validation and version-specific checks described in the post.
- Changes were limited to technical corrections within existing sections. Documentation was consulted on 2026-09-05; source-sensitive findings are explicitly tied to the inspected release tags rather than assumed to apply to every future release.

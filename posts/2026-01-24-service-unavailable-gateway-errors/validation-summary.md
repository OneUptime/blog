# Validation Summary: How to Fix 'Service Unavailable' Gateway Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- HTTP 503
- Kubernetes Services, Pods, probes, DNS, and EndpointSlices
- ingress-nginx
- AWS Elastic Load Balancing and AWS Load Balancer Controller
- HAProxy
- Node.js HTTP agent
- Spring Boot WebClient and Reactor Netty
- Istio VirtualService and DestinationRule
- Kong Ingress Controller and KongUpstreamPolicy
- Go net/http health checks
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- Istio VirtualService documentation: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule documentation: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kong Ingress Controller KongIngress migration guide: https://developer.konghq.com/kubernetes-ingress-controller/migrate/kongingress/
- Kong Ingress Controller service health check documentation: https://developer.konghq.com/kubernetes-ingress-controller/service-health-checks/
- Reactor Netty ConnectionProvider API documentation: https://docs.spring.io/projectreactor/reactor-netty/docs/current/api/reactor/netty/resources/ConnectionProvider.Builder.html
- Node.js HTTP Agent documentation: https://nodejs.org/api/http.html
- kube-state-metrics endpoint metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md
- kube-state-metrics v2.14.0 release notes: https://github.com/kubernetes/kube-state-metrics/releases/tag/v2.14.0
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The ingress-nginx diagnostic command used `/nginx_status` on port `10254`. Current ingress-nginx exposes the controller health endpoint at `/healthz`; changed the command and comment to check `localhost:10254/healthz`.
- The Spring WebClient example created a configured `HttpClient` but returned a new `HttpClient.create(provider)`, dropping the timeout handlers and connect timeout. Reordered the example so the returned `ReactorClientHttpConnector` uses the configured `httpClient`.
- The Node.js snippet said to "Increase max sockets", but modern Node.js defaults `agent.maxSockets` to `Infinity`. Changed the wording to "Tune connection pool" and "Set an explicit per-origin socket limit".
- The Kong example used the deprecated `KongIngress` resource and snake_case health check fields. Replaced it with current `Service` annotations for proxy timeouts/retries and a `KongUpstreamPolicy` using lowerCamelCase health check fields.
- The Go health check example referenced `fmt` without importing it and used undefined `db` and `redis` identifiers. Added the `fmt` import, changed the snippet to `package main`, and replaced undefined client calls with a reusable HTTP health check helper.
- The Prometheus alert used `kube_endpoint_address_available`, which was removed from kube-state-metrics after prior deprecation. Replaced it with a `sum(kube_endpoint_address{endpoint="my-service",ready="true"}) == 0` expression.

## Review Notes
- Go tooling was not installed in the environment, so the Go snippet could not be run through `gofmt` locally. The JavaScript snippet was checked with `node --check`.
- `kubectl get endpoints` still appears in many operational workflows, but Kubernetes has moved toward EndpointSlices for scalable backend discovery. A future update could mention EndpointSlices alongside Endpoints.

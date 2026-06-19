# Validation Summary: How to Fix 'Service Registration Failed' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Consul service registration and health checks
- Spring Cloud Netflix Eureka
- Spring Boot Actuator health checks
- Kubernetes Services, readiness probes, EndpointSlices, and kubectl
- Python python-consul client
- Node.js/TypeScript consul client
- Prometheus Go client metrics

## Sources Consulted
- HashiCorp Consul Go API package documentation: https://pkg.go.dev/github.com/hashicorp/consul/api
- HashiCorp Consul Agent check API documentation: https://developer.hashicorp.com/consul/api-docs/agent/check
- Spring Cloud Netflix reference documentation: https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/
- Spring Cloud Netflix common application properties appendix: https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/appendix.html
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- python-consul documentation: https://python-consul.readthedocs.io/en/latest/
- consul npm package documentation and bundled TypeScript definitions for version 2.0.1: https://www.npmjs.com/package/consul

## Issues Found
- The Go Consul ACL error helper was syntactically invalid because the boolean expression opened on the next line after `&&`. I changed it to a valid multi-line expression.
- The same Go helper implemented a `contains` function that only checked string prefixes. I replaced it with `strings.Contains` so ACL errors are detected anywhere in the error message.
- The Kubernetes connectivity command used the deprecated API server `/healthz` endpoint over plain HTTP. I changed it to HTTPS and `/readyz`, which is the current readiness endpoint.
- The Eureka example configured health URLs but did not enable Spring Cloud Netflix health check propagation. I added `eureka.client.healthcheck.enabled: true` under `eureka.client`.
- The Kubernetes section described service registration only through Endpoints. I updated it to mention EndpointSlices, with legacy Endpoints as a compatibility view.
- The Kubernetes debugging command only inspected the legacy Endpoints resource. I added an EndpointSlice query using the standard `kubernetes.io/service-name` label and kept the old Endpoints command as a legacy check.
- The TypeScript example used `import { Consul } from 'consul'`, which does not match the current `consul` package export shape. I changed it to `import Consul = require('consul');`, matching the package's bundled TypeScript definitions.

## Review Notes
- Local `go`, `gofmt`, `javac`, and `kubectl` were not installed, so Go/Java/kubectl snippets were reviewed against official documentation rather than executed locally.
- The Python snippet was syntax-checked with Python 3 using in-memory compilation.
- The Eureka lease interval example uses a 10-second renewal interval. Spring Cloud Netflix documents that values below the 30-second default can speed registration but are usually not recommended for production because Eureka server internals assume the default cadence.

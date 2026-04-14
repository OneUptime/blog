# Validation Summary: How to Use Dapr with External Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, health API)
- Kubernetes (Services, Ingress, probes, externalTrafficPolicy)
- NGINX Ingress Controller (configuration-snippet, ssl-redirect)
- AWS Load Balancer Controller (ALB annotations)
- cert-manager (cluster-issuer for TLS)
- Python / Flask (X-Forwarded-For header access)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr sidecar health documentation: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- AWS Load Balancer Controller Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.4/guide/ingress/annotations/
- Kubernetes Service spec: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found

### 1. Dapr sidecar port 3500 exposed via LoadBalancer (security issue)
- **What was wrong:** The LoadBalancer Service definition included a `dapr-http` port mapping that exposed port 3500 externally. Dapr sidecars listen on localhost by default and should not be exposed to the internet. Exposing the full Dapr API surface externally could allow unauthorized callers to invoke state stores, pub/sub, secrets, and other building blocks directly.
- **What was changed:** Removed the `dapr-http` port (3500) from the LoadBalancer Service definition, keeping only the application port (80 -> 8080).
- **Why:** Dapr security documentation explicitly recommends restricting sidecar listening addresses to localhost. External traffic should reach the application port; the app then communicates with its Dapr sidecar locally.

### 2. Invalid NGINX Ingress annotation `proxy-pass-headers`
- **What was wrong:** The annotation `nginx.ingress.kubernetes.io/proxy-pass-headers` does not exist in the NGINX Ingress Controller. It would be silently ignored.
- **What was changed:** Removed the invalid annotation. The `configuration-snippet` with `proxy_set_header` directives already handles header forwarding correctly.
- **Why:** The NGINX Ingress Controller has no `proxy-pass-headers` annotation. The closest mechanism is the `proxy-set-headers` ConfigMap-level setting, which works differently (takes a ConfigMap name, not a comma-separated list). The configuration-snippet approach used in the post is the correct way to forward specific headers.

### 3. Health check annotations used wrong prefix
- **What was wrong:** The health check annotation section was labeled "AWS ALB Ingress annotation" but used the `nginx.ingress.kubernetes.io/` prefix. The NGINX Ingress Controller has no `healthcheck-path` or `healthcheck-port` annotations.
- **What was changed:** Changed the annotation prefix to `alb.ingress.kubernetes.io/` to match the AWS ALB Ingress Controller, which does support these annotations.
- **Why:** The AWS Load Balancer Controller uses the `alb.ingress.kubernetes.io/` prefix. The `healthcheck-path` and `healthcheck-port` annotations are documented AWS ALB annotations, not NGINX Ingress annotations.

## Review Notes
- The `configuration-snippet` annotation used for header forwarding is disabled by default in newer NGINX Ingress Controller versions (post-CVE-2021-25742) and requires `allow-snippet-annotations: "true"` in the controller ConfigMap. The post does not mention this prerequisite.
- The Ingress resources do not include an `ingressClassName` field, which is the preferred method since Kubernetes 1.18+ (the `kubernetes.io/ingress.class` annotation is deprecated). This is not incorrect but is worth noting for readers using newer clusters.
- The Dapr health endpoint `/v1.0/healthz` on port 3500 is confirmed correct per Dapr documentation. Dapr also offers `/v1.0/healthz/outbound` for checking outbound readiness, which could be a better fit for readiness probes in some scenarios.
- The Python Flask example for accessing `X-Forwarded-For` is correct and functional.

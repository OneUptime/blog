# Validation Summary: How to Use HAProxy Ingress Controller with Blue-Green Deployment Annotations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Services, and Ingress resources
- HAProxy Ingress Controller
- HAProxy Ingress blue-green annotations
- Helm
- kubectl
- Prometheus metrics

## Sources Consulted
- HAProxy Ingress Getting Started documentation: https://haproxy-ingress.github.io/docs/getting-started/
- HAProxy Ingress Blue/green example: https://haproxy-ingress.github.io/docs/examples/blue-green/
- HAProxy Ingress Configuration Keys reference: https://haproxy-ingress.github.io/docs/configuration/keys/
- HAProxy Ingress Metrics example: https://haproxy-ingress.github.io/docs/examples/metrics/
- HAProxy native Prometheus metrics reference: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post mixed HAProxy Technologies Kubernetes Ingress Controller installation and `haproxy.org/*` annotations with HAProxy Ingress blue-green behavior. I changed the installation commands and annotations to the documented HAProxy Ingress chart and `haproxy-ingress.github.io/*` annotation prefix.
- The original examples used nonexistent annotations such as `haproxy.org/server-weight-blue` and `haproxy.org/server-weight-green`. I replaced them with the documented `blue-green-balance` and `blue-green-mode` annotations.
- The original weighted examples tried to route between two separate Ingress backends, but HAProxy Ingress blue-green routing works by selecting endpoint groups behind one Service using labels. I changed the main Service to select both blue and green pods and kept version-specific Services only for the path-routing example.
- The header and cookie examples used raw HAProxy `use-server` snippets that would not work with Kubernetes Service names as written. I replaced them with the documented `blue-green-header` and `blue-green-cookie` annotations.
- The health check annotations used the wrong controller keys and values. I changed them to `health-check-uri`, `health-check-interval`, `health-check-rise-count`, and `health-check-fall-count`.
- The automatic rollback example used invalid HAProxy stick-table logic in an Ingress annotation. I replaced it with a rollback command that restores the blue-green balance annotation.
- The metrics ConfigMap and metric names did not match HAProxy Ingress metrics configuration. I replaced the ConfigMap with Helm values that enable stats and metrics, and updated the sample metric queries.
- The shell examples now quote namespace/version variables where appropriate and annotate the correct blue-green balance key.

## Review Notes
The article is now accurate for HAProxy Ingress v0.16-style configuration. The `myapp:v1.0` and `myapp:v2.0` images remain placeholders, so readers must substitute real application images that expose port 8080 and return the version strings shown in the curl examples.

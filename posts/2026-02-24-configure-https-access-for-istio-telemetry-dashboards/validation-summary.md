# Validation Summary: How to Configure HTTPS Access for Istio Telemetry Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService resources
- Istio ingress gateway TLS termination
- cert-manager Certificate resources
- Kubernetes TLS Secrets and kubectl
- Grafana, Kiali, Prometheus, and Jaeger telemetry dashboards
- DNS, HTTPS, TLS, and HSTS response headers

## Sources Consulted
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio official sample addon manifests: https://github.com/istio/istio/tree/master/samples/addons
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Kiali accessing Kiali documentation: https://kiali.io/docs/installation/installation-guide/accessing-kiali/
- Prometheus command-line flags documentation: https://github.com/prometheus/prometheus/blob/main/docs/command-line/prometheus.md
- Jaeger deployment documentation for query base path: https://www.jaegertracing.io/docs/next-release/deployment/

## Issues Found
- The verification text said every dashboard should return HTTP 200. Some dashboards, especially Kiali with its default `/kiali` web root, may return a redirect while still being correctly exposed over HTTPS. Changed this to "successful responses or redirects with valid TLS."
- The single-domain path-based VirtualService rewrote `/grafana`, `/kiali`, and `/prometheus` to `/`, which conflicts with dashboards that need to receive and generate URLs for their configured public path prefix. Removed the rewrites and expanded the note to mention the required dashboard base-path settings.
- The single-domain path-based example claimed to consolidate everything but omitted Jaeger. Added a `/jaeger` route to the same VirtualService.
- The troubleshooting command used `app=grafana`, which does not match the current Istio sample Grafana manifest labels. Updated it to `app.kubernetes.io/name=grafana`.

## Review Notes
The Istio `networking.istio.io/v1` Gateway and VirtualService examples, `credentialName` usage, HTTP-to-HTTPS redirect setting, cert-manager Certificate fields, Kubernetes TLS secret command, and VirtualService HSTS header syntax are current and consistent with official documentation. The Istio sample addons are suitable for demos and tutorials, but production deployments should still harden dashboard authentication and authorization separately.

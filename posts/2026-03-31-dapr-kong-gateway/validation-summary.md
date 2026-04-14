# Validation Summary: How to Use Dapr with Kong Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kong Gateway / Kong Ingress Controller
- Kubernetes (Deployments, Services, Ingress)
- Helm

## Sources Consulted
- Kong Ingress Controller Helm chart source and values — https://github.com/Kong/charts/tree/main/charts/ingress
- Kong `kong/kong` subchart templates and helpers — https://github.com/Kong/charts/tree/main/charts/kong
- Kong Ingress Controller annotation reference — https://docs.konghq.com/kubernetes-ingress-controller/latest/references/annotations/
- Kong rate-limiting plugin configuration — https://docs.konghq.com/hub/kong-inc/rate-limiting/configuration/
- Kong key-auth plugin configuration — https://docs.konghq.com/hub/kong-inc/key-auth/configuration/
- Dapr Service Invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

### 1. Incorrect Helm install flag for `kong/ingress` chart
- **What was wrong:** The Helm install command included `--set ingressController.installCRDs=false`. This parameter is a legacy toggle from the older `kong/kong` chart and is not a valid top-level parameter for the `kong/ingress` chart (which is a meta-chart wrapping two `kong/kong` subcharts). CRDs are managed automatically via Helm's built-in CRD mechanism in this chart.
- **What was changed:** Removed the `--set ingressController.installCRDs=false` flag from the Helm install command.
- **Why:** The flag would be silently ignored but is misleading, suggesting it's a necessary configuration step when it has no effect on the `kong/ingress` chart.

### 2. Incorrect Kong proxy service hostname
- **What was wrong:** The test curl command used `kong-proxy.kong.svc` as the proxy service hostname. The `kong/ingress` chart (with release name `kong`) creates a proxy service named `kong-gateway-proxy`, not `kong-proxy`.
- **What was changed:** Updated the hostname to `kong-gateway-proxy.kong.svc`.
- **Why:** Using the wrong service name would cause DNS resolution failures when testing the integration.

## Review Notes
- The architecture of routing external traffic through Kong to the Dapr sidecar port (3500) using the Dapr invoke API is a valid pattern, though it exposes Dapr's invoke path structure to external callers. An alternative approach would be to use Kong's request-transformer plugin to rewrite paths, keeping the Dapr invoke details hidden from clients.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are correct and current as of Dapr v1.17.
- All Kong plugin configurations (rate-limiting: `minute`, `hour`, `policy`; key-auth: `key_names`, `hide_credentials`) are correct.
- The KongPlugin CRD API version (`configuration.konghq.com/v1`) and the `konghq.com/plugins` annotation format (comma-separated `metadata.name` references) are correct.
- The Kubernetes Service targeting port 3500 (Dapr sidecar) rather than 8080 (app) is intentional and correct for this integration pattern.

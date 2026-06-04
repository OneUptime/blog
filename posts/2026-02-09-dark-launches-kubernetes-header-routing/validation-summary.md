# Validation Summary: How to Implement Dark Launches Using Kubernetes and Header-Based Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Deployments and Services
- Kubernetes networking.k8s.io/v1 Ingress
- Ingress-NGINX Controller canary annotations
- Istio VirtualService routing
- Express-style JavaScript request handlers and middleware
- Prometheus PromQL
- kubectl apply, patch, and delete commands

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Ingress-NGINX Controller canary annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Prometheus PromQL operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Node.js syntax check using local Node.js v22.22.0 for JavaScript snippets

## Issues Found
- The application-level dark launch JavaScript example calculated `isDarkLaunch` outside the request handler, where `req` is not defined. Moved the calculation inside the handler so it evaluates per request.
- The same JavaScript example used `await` inside a non-async `forEach` callback, which is invalid JavaScript. Replaced it with `await Promise.all(products.map(async ...))`.
- The monitoring middleware only detected header-based dark launch access and missed the cookie-based access shown earlier. Updated it to check both the header and cookie.
- The PromQL comparison example used `vs`, which is not a PromQL operator. Replaced it with a valid `sum by (version)` query over both production and dark version labels.
- The feature flag example checked `process.env.VERSION === 'dark'`, but the Deployment example sets `DARK_LAUNCH_MODE`. Updated the snippet to check `process.env.DARK_LAUNCH_MODE === 'true'`.

## Review Notes
- `kubectl` was not installed in the review environment, so command behavior was checked against Kubernetes API structure and documented kubectl-compatible resource operations rather than local CLI help.
- The Ingress examples use the community Ingress-NGINX Controller annotation prefix. The official project documentation notes that Ingress-NGINX entered retirement after March 2026, so future posts should mention controller choice or current maintenance status when recommending it for new production deployments.

# Validation Summary: How to Rewrite URLs for Grafana with Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Kubernetes Ingress
- ingress-nginx
- Grafana Helm chart
- Traefik IngressRoute and StripPrefix middleware
- AWS Load Balancer Controller / Application Load Balancer
- cert-manager annotations
- OAuth callback configuration
- WebSocket proxying

## Sources Consulted
- Grafana documentation: Configure Grafana, including `root_url` and `serve_from_sub_path` - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana tutorial: Run Grafana behind a reverse proxy - https://grafana.com/tutorials/run-grafana-behind-a-proxy/
- Grafana documentation: Generic OAuth authentication callback URL and configuration options - https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana documentation: Grafana server CLI commands - https://grafana.com/docs/grafana/latest/administration/cli/
- Kubernetes documentation: Ingress API, `pathType`, and `ingressClassName` - https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx documentation: Rewrite target annotation and regex capture groups - https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx documentation: WebSocket support and timeout requirements - https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/#websockets
- Grafana Helm chart values - https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml
- Traefik documentation: StripPrefix middleware - https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/stripprefix/
- AWS Load Balancer Controller documentation: Ingress annotations and URL rewrite transforms - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/

## Issues Found
- Replaced deprecated `kubernetes.io/ingress.class` annotations in the Kubernetes and Helm examples with `spec.ingressClassName`, which is the current Kubernetes Ingress field for selecting an IngressClass.
- Removed unnecessary and potentially misleading ingress-nginx WebSocket annotations such as `connection-proxy-header` and `upstream-hash-by`. ingress-nginx supports WebSockets by default; the important settings for long-lived Grafana Live connections are `proxy-read-timeout` and `proxy-send-timeout`.
- Updated the AWS ALB section. The post said ALB did not support native path rewriting, but current AWS Load Balancer Controller documentation supports URL rewrite transforms through `alb.ingress.kubernetes.io/transforms.<service-name>`. The example now uses a `url-rewrite` transform that strips `/grafana`.
- Replaced the invalid `grafana-cli admin settings` troubleshooting command. Grafana's documented server CLI does not provide that command, so the post now verifies `root_url` and `serve_from_sub_path` by reading the mounted `grafana.ini`.
- Fixed the Generic OAuth example. `redirect_uri` is not a Grafana `[auth.generic_oauth]` configuration option in the official docs; the callback URL must be configured in the OAuth provider, while Grafana uses `root_url` to generate the correct callback URL.
- Added the missing `nginx.ingress.kubernetes.io/rewrite-target: /$2` annotation to the multiple Grafana instances example so the regex capture groups are actually used to strip the instance-specific prefix.
- Added `ingressClassName: nginx` to examples that were missing an explicit class and added the matching `proxy-send-timeout` to the complete example for consistency with the WebSocket guidance.

## Review Notes
- The examples intentionally use `pathType: ImplementationSpecific` for ingress-nginx regex paths, which matches ingress-nginx documentation.
- The Kubernetes Ingress API is stable, but Kubernetes documentation notes that the API is frozen and recommends Gateway API for newer designs. The post remains technically relevant because Ingress is still widely supported and not scheduled for removal.

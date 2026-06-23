# Validation Summary: How to Configure Grafana Email URL with root_url

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana configuration
- Grafana Alerting and email notifications
- SMTP configuration
- Nginx reverse proxy
- Kubernetes Ingress
- Docker and Docker Compose
- Helm chart values

## Sources Consulted
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana reverse proxy tutorial: https://grafana.com/tutorials/run-grafana-behind-a-proxy/
- Grafana email notification documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-email/
- Grafana contact points documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- Grafana alert rules documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- NGINX Ingress rewrite examples: https://kubernetes.github.io/ingress-nginx/examples/rewrite/

## Issues Found
- Corrected the explanation of default URL construction. Grafana uses its server configuration, including `root_url`, `protocol`, `domain`, and `http_port`, rather than simply deriving public URLs from incoming requests.
- Replaced unsupported or unverified "API documentation links" usage with redirects, which matches Grafana's documented `root_url` behavior for links, redirects, OAuth callbacks, and subpath deployments.
- Removed the `nginx.ingress.kubernetes.io/rewrite-target: /` annotation from the root-path Kubernetes Ingress example because rewriting all root-path traffic to `/` can break normal Grafana route handling.
- Removed the legacy `[alerting] enabled = true` stanza from the SMTP example and kept `[unified_alerting]`, which matches current Grafana Alerting configuration.
- Corrected the `domain` setting description. Grafana documents `domain` as being used as part of `root_url`, not as a cookie-domain setting.
- Replaced the `allow_embedding = true` troubleshooting advice for mixed HTTP/HTTPS links with the relevant proxy headers, especially `X-Forwarded-Proto`.

## Review Notes
The post is technically relevant and valid after the corrections. The Nginx examples are sufficient for the article's URL-link focus, but a future expansion could include Grafana Live WebSocket proxy locations from the official reverse proxy tutorial.

# Validation Summary: How to Configure Cloudflare Zero Trust

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Cloudflare Zero Trust
- Cloudflare Access
- Cloudflare Tunnel and cloudflared
- Kubernetes
- Terraform Cloudflare provider
- Cloudflare Logpush
- Cloudflare WARP / Cloudflare One Client MDM deployment
- PrometheusRule monitoring

## Sources Consulted
- Cloudflare Tunnel Kubernetes deployment guide: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/deployment-guides/kubernetes/
- Cloudflare Tunnel configuration file docs: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/
- Cloudflare Tunnel metrics docs: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/monitor-tunnels/metrics/
- Cloudflare browser-rendered SSH docs: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-browser-rendering/
- Cloudflare One Client managed deployment parameters: https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/deployment/mdm-deployment/parameters/
- Cloudflare Terraform provider repository and generated resource docs: https://github.com/cloudflare/terraform-provider-cloudflare
- Cloudflare Terraform provider v5.20 usage docs: https://github.com/cloudflare/terraform-provider-cloudflare/blob/main/README.md
- Cloudflare Terraform resource docs for `cloudflare_dns_record`, `cloudflare_zero_trust_access_application`, `cloudflare_zero_trust_access_identity_provider`, `cloudflare_zero_trust_access_policy`, `cloudflare_zero_trust_access_service_token`, `cloudflare_zero_trust_device_posture_rule`, and `cloudflare_logpush_job`.

## Issues Found
- The Kubernetes `cloudflared` liveness probe used `/ready` on port 2000 without starting the metrics server on that port. Added `--metrics 0.0.0.0:2000`.
- Terraform DNS examples used the older `cloudflare_record` resource and `value` attribute. Updated them to current `cloudflare_dns_record`, `content`, and explicit `ttl = 1`.
- Terraform Access examples used older `cloudflare_access_*` resources and invalid v5 policy attachment syntax. Updated examples to current `cloudflare_zero_trust_access_*` resources and inline application `policies`.
- Access policy rules used invalid group, login method, service token, MFA, and device posture shapes for the current provider. Replaced them with current object-based rule syntax.
- Browser SSH config included an unsupported `originRequest.browserTTL` field. Removed it and kept the supported `ssh://` tunnel service.
- Device posture examples used the older resource name and block-style `input`. Updated them to `cloudflare_zero_trust_device_posture_rule` with attribute-map input and current OS version operator field.
- Logpush used deprecated `frequency`. Replaced it with `max_upload_interval_seconds`.
- Prometheus rules referenced non-native metrics. Removed the unsupported Access failure metric and changed the tunnel alert to the documented `cloudflared_tunnel_ha_connections` metric.

## Review Notes
The guide is technically relevant and salvageable. The remaining examples are still illustrative and require real Cloudflare account IDs, zone IDs, tunnel credentials, IdP configuration, Access groups or IdP groups, and destination permissions before use.

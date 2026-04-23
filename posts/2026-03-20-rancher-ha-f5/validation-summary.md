# Validation Summary: How to Configure Rancher HA with F5

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- F5 BIG-IP LTM
- TMSH
- iRules
- TLS/SSL
- HTTP/2
- WebSocket

## Sources Consulted
- SUSE Rancher Prime Helm Chart Options: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/references/helm-chart-options.html
- Docker Install with TLS Termination at Layer-7 NGINX Load Balancer: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/infrastructure-setup/configure-layer-7-nginx-load-balancer.html
- Installation Requirements | SUSE Rancher Manager: https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/installation-and-upgrade/requirements/requirements.html
- High Availability | RKE2: https://docs.rke2.io/install/ha
- Requirements | RKE2: https://docs.rke2.io/install/requirements
- F5 TMSH Reference: `ltm monitor http`: https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_monitor_http.html
- F5 TMSH Reference: `ltm profile client-ssl`: https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_profile_client-ssl.html
- F5 TMSH Reference: `ltm profile http`: https://clouddocs.f5.com/cli/tmsh-reference/v14/modules/ltm/ltm_profile_http.html
- F5 TMSH Reference: `ltm profile http2`: https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_profile_http2.html
- F5 TMSH Reference: `ltm virtual`: https://clouddocs.f5.com/cli/tmsh-reference/latest/modules/ltm/ltm_virtual.html
- F5 TMSH Reference: `ltm persistence source-addr`: https://clouddocs.f5.com/cli/tmsh-reference/v15/modules/ltm/ltm_persistence_source-addr.html
- F5 Monitors Reference: common send/receive string behavior: https://techdocs.f5.com/en-us/bigip-15-0-0/big-ip-local-traffic-manager-monitors-reference/common-elements-for-monitors-reference.html

## Issues Found
- The post described SSL offloading but sent Rancher traffic to backend `443` with a server SSL profile. Rancher’s external TLS termination guidance requires `--set tls=external` and points the load balancer at backend port `80`. I updated the Rancher web pool to use port `80`, removed the backend server SSL profile, and aligned the instructions with external TLS termination.
- The health monitor used `/ping` over HTTPS for the Rancher UI path. For this external-TLS Rancher setup, the documented health check endpoint is `/healthz`, and the monitor should be an HTTP monitor against the backend Rancher nodes. I corrected the monitor protocol, path, and send string.
- The F5 virtual server did not set the Layer 7 headers Rancher requires. I added configuration for `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Port` using an HTTP profile and iRule.
- The post referenced WebSocket support but did not enable HTTP/2 on the client-facing virtual server, even though Rancher documents HTTP/2/SPDY capability as a requirement for proxies and load balancers. I added an HTTP/2 profile to the HTTPS virtual server.
- The persistence example used a broader cross-service persistence setting than necessary for the Rancher UI path. I simplified it to a standard source-address persistence profile applied to the Rancher HTTPS virtual server.
- The verification command tested the VIP by IP only. I updated it to send the Rancher hostname in the `Host` header so the check matches the documented ingress behavior.

## Review Notes
- The RKE2 control-plane examples remain valid: RKE2 uses port `9345` for the fixed registration address and port `6443` for the Kubernetes API.
- The `use-forwarded-headers` prerequisite is specifically relevant to Rancher deployments using `ingress-nginx` behind external TLS termination. Newer RKE2 releases are changing ingress defaults over time, so that note is version- and ingress-specific.

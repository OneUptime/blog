# Validation Summary: How to Fix 502 Bad Gateway with Cloudflare Tunnel in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Tunnel (`cloudflared`)
- Cloudflare Dashboard / Cloudflare One
- Portainer
- Docker
- YAML tunnel configuration

## Sources Consulted
- Cloudflare Tunnel monitoring and status docs: https://developers.cloudflare.com/tunnel/monitoring/
- Cloudflare Tunnel common errors and tunnel status docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/troubleshoot-tunnels/common-errors/
- Cloudflare Tunnel routing and published application docs: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel protocols for published applications: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/protocols/
- Cloudflare Tunnel configuration overview: https://developers.cloudflare.com/tunnel/configuration/
- Cloudflare Tunnel origin parameters reference: https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare WebSockets docs: https://developers.cloudflare.com/network/websockets/
- Cloudflare Tunnel troubleshooting docs: https://developers.cloudflare.com/cloudflare-one/troubleshooting/tunnel/
- Portainer requirements and ports: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Docker install docs: https://docs.portainer.io/start/install/server/docker/wsl
- Portainer Edge Agent architecture notes on legacy port `9000`: https://docs.portainer.io/advanced/edge-agent
- Docker `logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker `network connect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker networking overview: https://docs.docker.com/network/

## Issues Found
- Portainer port defaults were outdated. The post treated HTTP port `9000` as the default, but current Portainer documentation states `9443` is the default UI/API port and `9000` is legacy HTTP. I corrected the examples and conclusion to reflect that.
- The `config.yml` example reused the `service` key three times in one YAML object, which is not a valid copy-paste example. I converted it into distinct YAML documents so each wrong/correct example is structurally valid.
- The Cloudflare dashboard navigation was outdated. I updated it to the current Cloudflare One path for tunnel management.
- The connectivity checks relied on `wget` inside the `cloudflared` container and `netstat` inside the Portainer container. Those tools are not guaranteed to exist in those images. I replaced those checks with disposable network-side probes that test the exact origin URL from the shared Docker network.
- The timeout example did not actually increase some defaults and included `originServerName` on an HTTP example, which was misleading. I updated the snippet to use an HTTPS-origin example with genuinely increased timeout values.
- The WebSocket section incorrectly implied `disableChunkedEncoding: false` was a WebSocket fix. Cloudflare documents that WebSocket support is automatic, and `disableChunkedEncoding` is for HTTP/1.1 chunked transfer behavior, primarily relevant to WSGI cases. I removed that incorrect guidance.
- The debug logging example showed an incomplete Compose command. I changed it to instruct readers to add `--loglevel debug` to their existing command and included a valid token-mode example.
- The conclusion overstated the root cause as “almost always” a reachability issue. I narrowed that language to include both reachability problems and origin protocol/port mismatches.

## Review Notes
- The post is technically relevant and remains useful after the corrections.
- Portainer installations that still expose `9000` are valid, but that port should be described as legacy HTTP rather than the default.
- Cloudflare currently exposes tunnel management in more than one dashboard context depending on product flow; the updated post uses the current Cloudflare One path because the article already references Zero Trust / Cloudflare One administration.

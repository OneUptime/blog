# How to Run a OneUptime Probe Through an HTTP Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Probe, HTTP Proxy, Private Network, Troubleshooting

Description: Route a OneUptime probe through an authenticated egress proxy while keeping internal checks direct and validating each network path.

---

An egress-restricted network often permits outbound traffic only through an HTTP proxy. OneUptime probes support dedicated HTTP, HTTPS, and bypass variables, so the probe can reach the OneUptime control plane and external monitoring targets without a broad firewall exception.

This configuration matches the custom-probe documentation and probe environment in OneUptime 12.0.33.

## Draw the two traffic paths

A probe makes at least two kinds of outbound connection:

1. control traffic to `ONEUPTIME_URL` for registration, work, heartbeats, and results
2. monitoring traffic to the assigned targets

Decide whether each path should use the proxy. An external OneUptime instance normally goes through it. Private targets normally belong in `NO_PROXY` so the probe reaches them directly. If a security gateway must inspect both paths, confirm it supports HTTPS CONNECT and the protocols used by the assigned monitor types.

## Register and configure the probe

Create a custom probe under **Monitors > Settings > Probes** and obtain its unique ID and key. A Compose service can be configured as follows:

```yaml
services:
  oneuptime-probe:
    image: oneuptime/probe:release
    restart: unless-stopped
    environment:
      PROBE_ID: "${PROBE_ID}"
      PROBE_KEY: "${PROBE_KEY}"
      ONEUPTIME_URL: "https://oneuptime.example.com"
      HTTP_PROXY_URL: "http://egress-proxy.example.net:3128"
      HTTPS_PROXY_URL: "http://egress-proxy.example.net:3128"
      NO_PROXY: "localhost,127.0.0.1,.internal.example.com"
```

The `release` tag matches OneUptime's documented example. For reproducible production rollouts, record and pin the tested image digest. An HTTPS destination commonly uses an `http://` proxy URL and then creates a CONNECT tunnel through it. Use the proxy product's required scheme rather than changing it to `https://` merely because the destination is HTTPS.

OneUptime also accepts credentials in the URL:

```text
http://username:password@egress-proxy.example.net:3128
```

That form is easy to expose through Compose rendering, container inspection, process support bundles, and shell history. Inject the value through your deployment's protected secret mechanism, restrict who can inspect the container, and use a dedicated least-privilege proxy account. Percent-encode reserved characters in URL credentials.

## Build `NO_PROXY` deliberately

`NO_PROXY` is a comma-separated list of hosts or domains that should bypass the proxy. Include the self-hosted OneUptime hostname only when it is reachable directly. Include private monitor destinations that must remain on the LAN.

Domain suffix behavior and CIDR matching can vary across proxy libraries. Test every critical form with the OneUptime probe version you deploy. Prefer exact hostnames when practical, and remember that excluding a hostname does not create DNS or routing for it.

Do not put an external target in `NO_PROXY` simply to clear a proxy error. That silently turns a controlled egress path into direct access if the firewall later changes.

## Validate the control-plane path

Start the probe and follow its logs:

```bash
docker compose up -d
docker compose logs --follow --tail=200 oneuptime-probe
```

Confirm the dashboard shows the probe connected. A `407 Proxy Authentication Required` points to proxy credentials or policy. A certificate error can indicate TLS interception; install the organization's trusted CA in the probe image or runtime rather than disabling certificate validation.

If the control-plane connection fails, run a temporary diagnostic client in the same network namespace:

```bash
curl -v --proxy http://egress-proxy.example.net:3128 \
  https://oneuptime.example.com
```

Redact `Proxy-Authorization`, cookies, tokens, and internal hostnames before sharing output.

## Validate monitor traffic separately

Assign one external HTTP monitor and one internal HTTP monitor. Confirm the proxy access log sees the external target but not the `NO_PROXY` target. Then trigger a controlled failure on each and verify that results still reach OneUptime.

The OneUptime documentation describes proxy support across probe monitor types. In practice, an HTTP proxy naturally handles HTTP and HTTPS traffic; Ping, raw TCP, DNS, WHOIS, SNMP, or other protocol-specific checks may use transports an HTTP proxy cannot tunnel. Validate every assigned monitor type and arrange protocol-aware egress where required.

## Operate the proxy path

Monitor proxy latency, rejection rate, certificate expiry, and credential expiry. A shared egress proxy is now part of the monitoring path, so a proxy outage can make many independent targets fail together. Where that matters, run a second probe through a different egress path and use probe agreement.

Rotate proxy and probe credentials independently. Restart one probe at a time, verify its heartbeat, and only then remove the old credential.

## Conclusion

OneUptime's probe proxy variables solve controlled HTTP egress without opening the network broadly. Model control and target paths separately, scope `NO_PROXY`, protect credentials, and test protocol-specific monitors rather than assuming every network protocol behaves like HTTPS.

## Official Documentation

- [OneUptime custom probe and proxy configuration](https://oneuptime.com/docs/en/probe/custom-probe)
- [OneUptime private network access](https://oneuptime.com/docs/en/self-hosted/private-network-access)
- [OneUptime 12.0.33 probe configuration](https://github.com/OneUptime/oneuptime/blob/12.0.33/config.example.env)

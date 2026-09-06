# How to Monitor Private LAN Services with OneUptime Probes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Probe, Private Network, Monitoring, Self-Hosting

Description: Place a project-owned OneUptime probe inside a private LAN so checks stay local while results travel outward to the OneUptime instance.

---

A private service does not need a public firewall rule to be monitored. Run a project-owned OneUptime probe in the network that can already reach the target. The probe executes checks locally and connects outward to OneUptime to fetch work and submit results.

This design uses the custom-probe and private-network behavior documented for OneUptime 12.0.33.

## Keep the trust boundary narrow

Place the probe in a dedicated subnet, VM, container host, or Kubernetes namespace. Give it only:

- DNS access for the internal names it must resolve
- egress to the OneUptime instance over HTTPS
- target ports required by its assigned monitors
- no general administrative access to the LAN

Do not put an Internet-facing OneUptime global probe inside the private network. Use a separately deployed, project-owned probe. In OneUptime 12.0.33, the private-network setting is read from each probe's environment, including bundled probes; it is not restricted to project-owned probes. Leave it off on probes you operate for other people.

## Register the custom probe

In the project dashboard, open **Monitors > Settings > Probes**, create a custom probe, and copy its `PROBE_ID` and `PROBE_KEY`. Treat the key like a password.

A Docker deployment can look like this (the private-network flag is needed only for Custom JavaScript Code monitors in 12.0.33):

```bash
docker run --name oneuptime-lan-probe \
  --restart unless-stopped \
  --network host \
  -e PROBE_ID="$PROBE_ID" \
  -e PROBE_KEY="$PROBE_KEY" \
  -e ONEUPTIME_URL=https://oneuptime.example.com \
  -e PROBE_ALLOW_PRIVATE_NETWORK_MONITORS=true \
  -d oneuptime/probe:release
```

Pin the image to the release you have tested in production rather than following a moving tag indefinitely. Inject the key through your platform's secret facility instead of committing it to a Compose file or shell script.

Host networking is the official Docker example, but it is not mandatory in every design. It requires Docker Engine on Linux or Docker Desktop 4.34 or later with host networking enabled. A dedicated Docker network can be safer when its routing and DNS reach the targets. Choose the minimum connectivity that works.

## Understand the private-address switch

The probe setting:

```dotenv
PROBE_ALLOW_PRIVATE_NETWORK_MONITORS=true
```

permits private ranges for Custom JavaScript Code monitors in OneUptime 12.0.33. For those monitors, it does not permit loopback, link-local, multicast, reserved, or cloud metadata addresses. API, Website, External Status Page, Ping, Port, DNS, SQL, Synthetic, and Network Device monitors are not governed by this switch in that version. Enforce their permitted destinations through network policy.

Set the variable on the private probe itself, not only on the OneUptime API service. It intentionally expands what project members who can author those monitors may reach. Use a separate project and tightly scoped membership for especially sensitive networks.

## Assign and test a monitor

Create a monitor for an internal target such as:

```text
https://orders.internal.example.com/health
```

Select the new private probe for the monitor. Start with a health endpoint that exposes no secrets and assert both an expected status code and a small response condition. Check that the timeline identifies the private probe and reports a successful run.

If the check fails, diagnose using the probe's network configuration. The following command matches the host-network deployment above; if the probe uses a dedicated Docker network, run the diagnostic container on that network instead:

```bash
docker logs --tail=200 oneuptime-lan-probe
docker run --rm --network host curlimages/curl:latest \
  -fsS https://orders.internal.example.com/health
```

Use a trusted diagnostic image and remove it afterward. Confirm DNS, routes, firewall policy, target TLS trust, and the probe's outbound path to OneUptime. Do not disable TLS validation simply to make an internal certificate error disappear; distribute the correct CA instead.

## Avoid accidental exposure

No inbound connection from OneUptime Cloud to the probe is required for this pattern. Still, verify that the probe host has no forwarded public port and that the monitored service remains bound to the LAN. Rotate the probe key if it appears in logs or terminal history.

Monitor the probe itself for disconnection. A missing result is different from a confirmed service failure, and a single probe shares the failure domain of its host, DNS, and local gateway. Deploy another independent probe when that distinction matters.

## Conclusion

A project-owned probe turns private monitoring into an outbound-results path. Place it near the targets, enable private Custom JavaScript Code requests only where needed, restrict its network and project privileges, and test using the network configuration in which the checks run.

## Official Documentation

- [OneUptime custom probes](https://oneuptime.com/docs/en/probe/custom-probe)
- [OneUptime private network access](https://oneuptime.com/docs/en/self-hosted/private-network-access)
- [OneUptime API monitors](https://oneuptime.com/docs/en/monitor/api-monitor)

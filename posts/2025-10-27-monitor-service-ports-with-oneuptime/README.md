# Keep Critical Ports Available with OneUptime: A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Infrastructure, Port Monitoring, Reliability, Uptime Monitoring, DevOps

Description: Learn how to configure port monitors in OneUptime so anyone can spot service outages quickly- without reading source code or writing scripts.

---

Databases, message brokers, SMTP servers, and custom apps all listen on specific ports. If a port stops accepting connections, the service is effectively down. OneUptime's port monitor gives you a simple, guided way to check that reachability and alert the right people fast.

---

## What port monitors do for you

- Confirm that the host and port you care about still respond to TCP connections.
- Measure response times so you can see sluggish behavior before outages.
- Trigger incidents and alerts automatically when a service goes offline.
- Share history and automation with every other monitor type in OneUptime.

---

## Create a port monitor in minutes

1. **Add a new monitor** and select **Port**.
2. **Name the monitor** clearly, such as "Postgres primary 5432" or "SMTP gateway".
3. **Enter the hostname or IP address**. The form checks the format for you.
4. **Specify the port number**. You can monitor anything from 22 and 80 through custom ports.
5. **Choose probe locations**. Use OneUptime probes for external visibility or self-hosted probes inside private networks.
6. **Pick how often to check**. Critical systems often run every minute; less critical services can be slower.
7. **Review the default alert rule** that fires when the port is offline. Add additional rules if you care about slow responses or repeated timeouts.
8. **Connect notifications** to on-call policies, chat tools, email, or workflows.
9. **Save** and watch the first result arrive on the monitor timeline.

---

## Everyday best practices

- Monitor every tier of a stack (database, cache, queue, app) so you know which dependency failed first.
- Pair port monitors with website or synthetic monitors to map symptoms to causes.
- Use maintenance windows to silence alerts during planned work like upgrades or certificate renewals.
- Group monitors by team or service in the dashboard to keep ownership clear.

---

## Troubleshooting without digging into code

- **Monitor shows offline, but you can connect manually?** Check firewall rules from the probe's viewpoint. External probes might be blocked even if your laptop is allowed.
- **Seeing repeated timeouts?** Increase the interval, require multiple failures before alerting, or create a separate rule that watches sustained timeouts.
- **Need a pause?** Switch the monitor to maintenance mode right from its detail page.

---

Port monitors close the gap between infrastructure checks and high-level user journeys. Set them up for every service whose downtime hurts, layer on your automations, and let OneUptime keep watch around the clock- no low-level debugging required.

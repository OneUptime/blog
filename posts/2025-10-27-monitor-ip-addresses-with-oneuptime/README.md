# Monitor Every IP Address with OneUptime: Simple Setup, Reliable Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Infrastructure, IP Monitoring, Reliability, Uptime Monitoring, DevOps

Description: Learn how to configure IP monitors in OneUptime so anyone on your team can spot network issues quickly—no code or deep networking knowledge required.

---

IP monitors keep watch on routers, firewalls, databases, and third-party services that expose only an address. When a device stops responding, OneUptime lets you know fast and gives you the context you need to act. Everything happens through guided screens, so you can set it up in minutes.

---

## Why IP monitoring helps

- Confirms whether a target is reachable before users feel the impact.
- Creates a shared signal for network, infrastructure, and application teams.
- Works across IPv4 and IPv6 without extra tooling.

---

## Set up an IP monitor

On OneUptime Dashboard, 

1. **Add a new monitor** and select **IP**.
2. **Name the monitor** so it is obvious what you are watching (for example "Edge firewall" or "Billing database").
3. **Enter the IP address**. The form checks the format immediately, so typos are caught before you save.
4. **Choose probe locations**. Use OneUptime probes or your own self-hosted probes. Multiple locations help confirm whether an issue is local or global.
5. **Pick a check interval**. Critical systems usually get one-minute checks; less critical ones can run less often.
6. **Review the default alert rule**. By default, OneUptime opens an incident when the address is offline. Add more rules if you want to react to slower responses or flap protection.
7. **Connect notifications** to on-call rotations, chat channels, email, or automated workflows.
8. **Save** and watch the live status update as soon as probes complete their first checks.

---

## Everyday tips

- Combine IP monitors with website or port monitors to pinpoint whether a failure is network, TLS, or application related.
- Use maintenance windows to silence alerts during planned downtime like firmware upgrades.
- Tag monitors by team or service so the right people see alerts and history.

---

## Troubleshooting made easy

- **Seeing offline alerts unexpectedly?** Confirm whether the provider blocks ping. Switch to a port monitor if the service only answers over TCP.
- **Alerts flicker on and off?** Increase the interval or require multiple consecutive failures before paging.
- **Need a quick pause?** Put the monitor into maintenance mode directly from its detail page.

---

IP monitors give you a dependable early warning when critical infrastructure goes dark. Pair them with port, website, and telemetry monitors to build a full incident picture—all without touching any code.

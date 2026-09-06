# How to Run OneUptime Probes in Multiple Regions and Avoid False Outage Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Probe, High Availability, Monitoring, Alerting

Description: Deploy independent OneUptime probes across regions and use probe agreement to separate a service outage from one failing vantage point.

---

One probe reports what one network path sees. If its region loses DNS, routing, power, or egress, a healthy service can appear offline. OneUptime can assign multiple probes to a monitor and require a minimum number to agree before changing monitor status.

That quorum is useful only when the probes are genuinely independent.

## Choose failure domains before regions

Deploy at least three probes when you want a majority decision. Place them across different providers or networks where practical, not merely different virtual machines on one subnet. Each should have independent DNS and outbound routing to both OneUptime and the monitored endpoint.

Name probes by observable location, such as `eu-west-provider-a`, `us-east-provider-b`, and `ap-south-provider-c`. Record their NAT addresses if the target uses allowlists.

Create each project-owned probe in **Monitors > Settings > Probes**, then install it with its unique `PROBE_ID` and `PROBE_KEY`. Never reuse one identity across regions because heartbeats and results would no longer describe one vantage point.

```bash
docker run --name oneuptime-probe \
  --restart unless-stopped \
  -e PROBE_ID="$REGION_PROBE_ID" \
  -e PROBE_KEY="$REGION_PROBE_KEY" \
  -e PROBE_NAME=eu-west-provider-a \
  -e ONEUPTIME_URL=https://oneuptime.example.com \
  -d oneuptime/probe:release
```

Pin and roll out the tested image version consistently. Store each key only in that region's secret manager.

## Configure probe agreement

Assign all three probes to the monitor, then set the minimum probe agreement to `2`. With three connected probes, two must report the same status before the monitor changes state. This commonly filters a single regional path failure while still detecting a service failure visible from most locations.

OneUptime's `minimumProbeAgreement` behavior has an important default: when no number is set, all enabled and connected probes must agree. A disconnected or disabled probe is excluded. The implementation also caps the effective threshold at the number of active probes. If only one of three probes remains connected, a configured threshold of two therefore becomes one for that evaluation. Alert on probe disconnections and decide whether degraded probe coverage should pause paging. A probe that remains connected but disagrees can still prevent an all-probes threshold from being reached.

Choose the number from your failure model:

| Probes | Agreement | Meaning |
| --- | --- | --- |
| 2 | 2 | both must agree; conservative but can delay a status change |
| 3 | 2 | majority tolerates one disagreeing region |
| 5 | 3 | majority tolerates two disagreeing regions |

Do not set agreement to `1` and call the system highly available. That makes any single bad vantage point sufficient to change status.

## Keep check behavior identical

Use the same interval, timeout, assertions, DNS name, and TLS validation across regions. Otherwise, disagreement may reflect configuration drift rather than geography. Allowlist every probe at the target before enabling alert creation.

Account for endpoints that intentionally return different content by region. Assert a stable health contract rather than a region-specific response body. For globally balanced services, also watch latency per probe, since a majority availability status can hide one degraded region.

## Test failure scenarios

Run controlled tests during a maintenance window:

1. Block one probe's path to the target and confirm the monitor stays healthy with two successful regions.
2. Block two independent paths and confirm the monitor changes state and the intended notification fires.
3. Disconnect one probe from OneUptime and confirm it is shown as disconnected rather than silently healthy.
4. Restore each path and confirm recovery requires the configured agreement.

Keep tests at the network-policy or test-endpoint layer. Do not disrupt production DNS or delete a probe to simulate a transient fault.

## Monitor the monitors

Create alerts for probe disconnection and track per-region execution latency. Review the probe list before planned regional maintenance; a three-probe majority loses its single-failure tolerance while one probe is offline.

Probe agreement determines when OneUptime changes monitor state. It does not prove the root cause or combine arbitrary business signals. Preserve each probe's result and region in the incident timeline so responders can distinguish global failure, regional degradation, target allowlist error, and probe failure.

## Conclusion

Multi-region probing reduces false outages when each probe represents an independent failure domain and the agreement threshold matches the desired tolerance. Three probes with a threshold of two are a strong baseline, backed by disconnection monitoring and deliberate failure tests.

## Official Documentation

- [OneUptime custom probes](https://oneuptime.com/docs/en/probe/custom-probe)
- [OneUptime 12.0.33 monitor model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/Monitor.ts)
- [OneUptime 12.0.33 probe agreement logic](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorResource.ts)
- [OneUptime monitors](https://oneuptime.com/docs/en/monitor/website-monitor)

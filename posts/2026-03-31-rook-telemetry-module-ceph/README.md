# How to Configure the Telemetry Module in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Telemetry, Monitoring, Configuration

Description: Learn how to enable and configure the Ceph telemetry module to share anonymized cluster metrics with the Ceph community for improving the project.

---

The Ceph telemetry module collects anonymized cluster statistics and optionally shares them with the Ceph development team. This data helps the community understand real-world usage patterns, hardware configurations, and common failure modes, which directly informs development priorities.

## What Data Is Collected

The telemetry module collects non-sensitive operational data including:

- Cluster size (number of OSDs, monitors, MDSes)
- Hardware information (CPU arch, storage device types)
- Feature flags in use
- Crash reports (crash backtraces)
- Pool and service configurations (no data contents)

No user data, object names, or storage contents are ever collected.

## Enabling Telemetry

Enable the module and opt in to sharing:

```bash
ceph mgr module enable telemetry
ceph telemetry on --license sharing-1-0
```

You must explicitly accept the license to activate data sharing.

## Previewing What Will Be Sent

Before enabling sharing, review the data that would be transmitted:

```bash
ceph telemetry preview
```

This outputs a JSON report showing exactly what the module would send.

## Configuring the Report URL

By default reports are sent to `https://telemetry.ceph.com/report`. You can override this for air-gapped environments or testing:

```bash
ceph config set mgr mgr/telemetry/url https://internal-telemetry.example.com/report
```

## Setting the Channel

Telemetry data is organized into channels. Configure which channels to enable:

```bash
# Enable crash reporting channel
ceph config set mgr mgr/telemetry/channel_crash true

# Enable ident channel (basic cluster info)
ceph config set mgr mgr/telemetry/channel_ident true

# Enable performance stats channel
ceph config set mgr mgr/telemetry/channel_perf true
```

List available channels:

```bash
ceph telemetry show-all
```

## Checking Telemetry Status

View the current telemetry configuration and last send time:

```bash
ceph telemetry status
```

Example output:

```json
{
  "enabled": true,
  "last_opt_revision": 3,
  "url": "https://telemetry.ceph.com/report",
  "interval": 24
}
```

## Disabling Telemetry

To stop sending data:

```bash
ceph telemetry off
```

Or disable the module entirely:

```bash
ceph mgr module disable telemetry
```

## Summary

The Ceph telemetry module provides an opt-in mechanism for sharing anonymized cluster statistics with the Ceph community. Configuration is managed through `ceph config set` for the URL and channels, and the `ceph telemetry preview` command lets administrators review exactly what will be shared before enabling data transmission.

# How to Set Machine Time Servers (NTP) in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NTP, Time Synchronization, Kubernetes, Configuration

Description: Learn how to configure NTP time servers in Talos Linux to keep your Kubernetes cluster clocks accurate and synchronized.

---

Accurate time synchronization is one of those things you never think about until it breaks. When the clocks on your Kubernetes nodes drift, you start seeing certificate validation errors, failed authentication tokens, inconsistent log timestamps, and strange behavior in distributed systems like etcd. Talos Linux uses NTP to keep node clocks synchronized, and configuring it correctly is a small but important step in building a reliable cluster.

This post walks through how to configure NTP time servers in Talos Linux, why it matters, and how to troubleshoot time synchronization issues.

## Default Time Synchronization

Out of the box, Talos Linux uses `pool.ntp.org` as its default time server. For many deployments, this works fine. The NTP pool project provides a large collection of volunteer-run time servers distributed around the world, and your nodes will automatically connect to the geographically closest ones.

However, there are good reasons to override the default:

- Corporate networks may block outbound NTP traffic to the internet
- High-accuracy requirements may demand dedicated time servers
- Air-gapped environments have no internet access at all
- Compliance requirements may mandate specific time sources

## Configuring Custom NTP Servers

The NTP configuration lives in the `machine.time` section of the Talos machine config:

```yaml
# machine-config.yaml
machine:
  time:
    disabled: false
    servers:
      - time.cloudflare.com
      - time.google.com
      - pool.ntp.org
```

The `servers` field takes a list of NTP server hostnames or IP addresses. Talos will try them in order and use the first one that responds. Having multiple servers provides redundancy - if one server is unreachable, Talos falls back to the next one.

## Applying the Configuration

For a new cluster, include the NTP settings in your config generation:

```bash
# Create a patch file for NTP
cat > ntp-patch.yaml << 'EOF'
machine:
  time:
    servers:
      - time.cloudflare.com
      - time.google.com
EOF

# Generate config with the NTP patch
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @ntp-patch.yaml
```

For an existing cluster, apply the config patch:

```bash
# Patch a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"time": {"servers": ["time.cloudflare.com", "time.google.com"]}}}'
```

The change takes effect almost immediately - Talos restarts its time synchronization service and begins using the new servers.

## Using Internal NTP Servers

In corporate environments, it is common to run internal NTP servers. These might be dedicated NTP appliances, domain controllers (in Windows environments), or Linux servers running chrony or ntpd.

```yaml
machine:
  time:
    servers:
      # Primary internal NTP server
      - ntp1.corp.internal
      # Secondary internal NTP server
      - ntp2.corp.internal
      # Fallback to public server if internal ones are down
      - pool.ntp.org
```

If your internal NTP servers use non-standard ports or require specific configuration, you need to make sure the network path between your Talos nodes and the NTP servers is clear. NTP uses UDP port 123 by default.

## Air-Gapped Environments

In air-gapped environments with no internet access, you must provide internal NTP servers. Without any NTP configuration that works, your node clocks will drift over time, and the drift can be significant - several seconds per day on some hardware.

```yaml
# Configuration for air-gapped environments
machine:
  time:
    servers:
      - 10.0.0.5
      - 10.0.0.6
```

Use IP addresses instead of hostnames if DNS might not be available during early boot. NTP synchronization happens early in the boot process, and DNS resolution might not be ready yet.

## Disabling Time Synchronization

In rare cases, you might want to disable Talos NTP entirely - for example, if the hypervisor handles time synchronization through guest tools:

```yaml
machine:
  time:
    disabled: true
```

Be very careful with this. Most hypervisor time sync mechanisms are less reliable than NTP, and some do not work at all with Linux guests. Only disable NTP if you are absolutely sure that another mechanism is handling time synchronization.

## Verifying Time Synchronization

After configuring your NTP servers, verify that time synchronization is working:

```bash
# Check the time service status
talosctl service timed --nodes 192.168.1.10

# View time service logs for sync status
talosctl logs timed --nodes 192.168.1.10
```

The logs will show which NTP server was contacted and whether synchronization was successful. You should see messages indicating successful time adjustments.

You can also check the current time on a node:

```bash
# View current node time
talosctl time --nodes 192.168.1.10
```

Compare this with your local machine's time or a known-accurate time source. They should match within a few milliseconds.

## Why Time Accuracy Matters for Kubernetes

Kubernetes and its components are sensitive to clock skew. Here are the specific areas affected:

**etcd** - The distributed key-value store that backs Kubernetes uses Raft consensus, which relies on timeouts. Significant clock skew between control plane nodes can cause leader election issues and data inconsistencies.

**TLS certificates** - Certificates have a "not before" and "not after" timestamp. If a node's clock is wrong, it might reject valid certificates as expired or not-yet-valid.

**Token authentication** - Service account tokens and OIDC tokens have expiration times. Clock skew can cause tokens to be rejected prematurely or accepted after they should have expired.

**Logging and observability** - When correlating logs across multiple nodes, accurate timestamps are essential. Clock drift makes log analysis significantly harder.

**Scheduled jobs** - CronJobs in Kubernetes depend on accurate node time. If the clock is wrong, jobs fire at the wrong time.

## Choosing NTP Servers

Here are some popular public NTP servers and their characteristics:

```yaml
# Cloudflare - anycast, fast, reliable
- time.cloudflare.com

# Google - smears leap seconds instead of stepping
- time.google.com
- time1.google.com
- time2.google.com

# NTP Pool Project - community-run, geographically distributed
- pool.ntp.org
- 0.pool.ntp.org
- 1.pool.ntp.org

# NIST - US government time servers
- time.nist.gov
```

A note about Google's time servers: Google uses "leap second smearing," which spreads leap second adjustments over a longer period instead of adding or removing a second all at once. If you mix Google NTP servers with non-smearing servers, you can get inconsistencies during leap second events. Pick one approach and stick with it.

## Monitoring Time Synchronization

For production clusters, you should monitor time synchronization as part of your observability stack. The node_exporter Prometheus exporter provides NTP-related metrics:

```yaml
# Prometheus alert for time drift
# Alert if node time drifts more than 500ms from NTP
groups:
  - name: time-sync
    rules:
      - alert: ClockSkewDetected
        expr: abs(node_timex_offset_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Clock skew detected on node"
```

## Troubleshooting

If time synchronization is not working, check these common issues:

**Firewall blocking UDP port 123** - NTP requires outbound UDP port 123. Many corporate firewalls block this by default. Check with your network team.

**DNS resolution failures** - If you use hostnames for NTP servers and DNS is not available during boot, time sync will fail. Use IP addresses as a fallback.

**All NTP servers unreachable** - If every configured server is down or unreachable, time sync stops. Always configure at least two or three servers for redundancy.

**Large initial clock offset** - If the hardware clock is significantly wrong (hours or days off), the NTP client might refuse to make a large adjustment. In these cases, you may need to fix the hardware clock in BIOS first.

```bash
# Check timed logs for errors
talosctl logs timed --nodes 192.168.1.10 --tail 50
```

## Conclusion

NTP configuration in Talos Linux is simple but important. Set your time servers in the machine config, verify they are reachable, and monitor for drift. For most deployments, two or three reliable NTP servers are sufficient. In corporate or air-gapped environments, make sure your internal NTP infrastructure is in place before deploying Talos. Accurate time is the foundation for secure, reliable Kubernetes operations, and getting it right from the start saves you from debugging cryptic certificate errors and token rejections later.

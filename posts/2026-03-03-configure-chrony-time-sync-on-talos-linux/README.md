# How to Configure Chrony Time Sync on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, chrony, NTP, Time Synchronization, Kubernetes, System Extensions

Description: Learn how to configure Chrony for time synchronization on Talos Linux, including installation via system extensions, configuration options, and best practices.

---

Talos Linux ships with a built-in time synchronization daemon, but some environments need more advanced NTP capabilities. Chrony is a versatile NTP implementation that offers faster convergence, better accuracy, and more configuration options than basic NTP clients. If you need features like hardware timestamping support, NTS (Network Time Security) authentication, or fine-grained control over clock discipline, Chrony on Talos Linux is worth considering.

## Why Chrony Over the Default Time Daemon?

The default time synchronization in Talos Linux is intentionally simple and works well for most clusters. However, Chrony brings some specific advantages:

- **Faster initial sync** - Chrony can converge to accurate time more quickly after a cold start, which is useful for nodes that boot with a badly wrong clock
- **Better handling of intermittent connectivity** - Chrony adapts well to networks where NTP servers are not always reachable
- **NTS support** - Network Time Security provides authentication for NTP, preventing time-based attacks
- **Hardware timestamping** - For environments requiring sub-microsecond accuracy
- **Detailed statistics** - More visibility into synchronization quality

## Installing Chrony as a System Extension

Talos Linux uses system extensions to add functionality beyond the minimal base OS. Chrony is available as an official system extension.

To add Chrony, you need to include it in your machine configuration or installer image:

```yaml
# Machine configuration with Chrony extension
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.7.0
    extensions:
      - image: ghcr.io/siderolabs/chrony:latest
```

If your cluster is already running, you can add the extension through an upgrade:

```bash
# Generate an installer image with the Chrony extension using Image Factory
# Visit https://factory.talos.dev to create a custom image
# Or use the image factory API

# Upgrade with the new image that includes Chrony
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<schematic-id>:v1.7.0
```

After the upgrade completes and the node reboots, the Chrony extension will be available.

## Configuring Chrony

Once the Chrony extension is installed, you need to configure it through the Talos machine configuration. The configuration is passed through extension service configuration:

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/chrony:latest
  files:
    - content: |
        # Chrony configuration for Talos Linux
        server time.cloudflare.com iburst nts
        server time1.google.com iburst
        server time2.google.com iburst
        server time3.google.com iburst

        # Allow stepping the clock on first sync
        makestep 1.0 3

        # Record the drift rate
        driftfile /var/lib/chrony/drift

        # Enable RTC tracking
        rtcsync

        # Log statistics
        logdir /var/log/chrony
        log tracking measurements statistics
      path: /etc/chrony/chrony.conf
      permissions: 0644
      op: create
```

### Key Configuration Directives

Let's break down the important Chrony directives:

```bash
# Server directive - defines an NTP source
# iburst: send a burst of requests on startup for faster sync
# nts: use Network Time Security (authenticated NTP)
server time.cloudflare.com iburst nts

# Pool directive - use multiple servers from a pool
pool pool.ntp.org iburst maxsources 4

# makestep: allow large time corrections
# First number: threshold in seconds
# Second number: how many corrections are allowed
# "1.0 3" means allow steps up to 1 second during the first 3 updates
makestep 1.0 3

# rtcsync: sync the real-time clock
rtcsync

# driftfile: remember the clock drift between reboots
driftfile /var/lib/chrony/drift

# maxdistance: maximum allowed distance to a time source
maxdistance 3.0
```

## Disabling the Default Time Daemon

When using Chrony, you should disable the built-in time daemon to avoid conflicts:

```yaml
machine:
  time:
    disabled: true
  install:
    extensions:
      - image: ghcr.io/siderolabs/chrony:latest
  files:
    - content: |
        server time.cloudflare.com iburst
        server time1.google.com iburst
        makestep 1.0 3
        driftfile /var/lib/chrony/drift
        rtcsync
      path: /etc/chrony/chrony.conf
      permissions: 0644
      op: create
```

Having two NTP daemons fighting over the system clock will cause erratic behavior. Always disable one when enabling the other.

## Configuring NTS (Network Time Security)

NTS is one of Chrony's standout features. It authenticates NTP responses, preventing man-in-the-middle attacks on your time synchronization:

```bash
# Chrony config with NTS enabled
server time.cloudflare.com iburst nts
server nts.netnod.se iburst nts
server nts.sth1.ntp.se iburst nts

# NTS key storage
ntsdumpdir /var/lib/chrony

# Allow stepping for initial sync
makestep 1.0 3
driftfile /var/lib/chrony/drift
rtcsync
```

NTS works similarly to TLS - the client and server negotiate a secure session, and subsequent NTP packets are authenticated. This is particularly important in environments where you cannot trust the network path between your nodes and the NTP servers.

## Monitoring Chrony Status

Once Chrony is running, you can check its status. Since Talos does not provide a shell, you will need to check through the extension service logs:

```bash
# View Chrony logs
talosctl -n 192.168.1.10 logs ext-chrony

# Check if the Chrony service is running
talosctl -n 192.168.1.10 services | grep chrony
```

In the logs, look for messages like:

```text
Selected source time.cloudflare.com
System clock wrong by 0.003421 seconds
System clock was stepped by 0.003421 seconds
```

These indicate that Chrony is successfully synchronizing time.

## Chrony for High-Precision Environments

If you need very precise time synchronization (microsecond-level), Chrony supports hardware timestamping on supported network interfaces:

```bash
# Chrony config with hardware timestamping
server 10.0.1.50 iburst minpoll 4 maxpoll 4
server 10.0.1.51 iburst minpoll 4 maxpoll 4

# Enable hardware timestamping on the network interface
hwtimestamp eth0

# More aggressive polling for better accuracy
makestep 0.1 3
driftfile /var/lib/chrony/drift
rtcsync

# Reduce minimum sources for selection
minsources 1
```

Hardware timestamping eliminates the jitter introduced by the kernel's network stack, giving you significantly better accuracy. This is useful for financial trading systems, telecommunications, and scientific computing.

## Applying Chrony Configuration Across the Cluster

For consistent configuration across all nodes, use a script:

```bash
#!/bin/bash

# Chrony configuration
CHRONY_CONFIG='server time.cloudflare.com iburst nts
server time1.google.com iburst
server time2.google.com iburst
makestep 1.0 3
driftfile /var/lib/chrony/drift
rtcsync'

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $NODES; do
  echo "Configuring Chrony on $node..."

  # Disable default time daemon and configure Chrony
  talosctl -n "$node" patch machineconfig -p "[
    {
      \"op\": \"replace\",
      \"path\": \"/machine/time/disabled\",
      \"value\": true
    }
  ]"

  echo "Done: $node"
done
```

## Troubleshooting Chrony

### Extension Not Loading

If Chrony does not start after installation:

```bash
# Check extension status
talosctl -n 192.168.1.10 get extensions

# View system logs for extension loading errors
talosctl -n 192.168.1.10 dmesg | grep -i chrony

# Check service list
talosctl -n 192.168.1.10 services
```

### Chrony Not Syncing

If Chrony is running but not syncing:

```bash
# Check logs for error messages
talosctl -n 192.168.1.10 logs ext-chrony

# Verify network connectivity to NTP servers
# Check firewall rules for UDP port 123
# For NTS, also check TCP port 4460
```

### Clock Not Converging

If the clock is adjusting but never stabilizing:

```bash
# Check for competing time sources
# Make sure the default time daemon is disabled
talosctl -n 192.168.1.10 get timeserverconfig -o yaml

# Look for "disabled: true" in the output
```

## Best Practices

1. **Choose the right tool** - If the default time daemon meets your needs, stick with it. Chrony adds complexity that is only justified when you need its advanced features.

2. **Test in staging first** - Before rolling Chrony to production, test the extension and configuration in a non-critical environment.

3. **Use NTS when possible** - Authenticated time synchronization prevents a category of attacks that standard NTP is vulnerable to.

4. **Monitor sync quality** - Track not just whether time is synced but how accurately. Chrony's logging provides detailed statistics for this purpose.

5. **Keep configurations consistent** - All nodes in a cluster should use the same time synchronization approach and configuration.

Chrony on Talos Linux gives you enterprise-grade time synchronization capabilities while maintaining the security and simplicity of the Talos operating model. For clusters that need more than basic NTP, it is a solid choice.

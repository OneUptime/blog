# How to Use talosctl get events for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Events, Debugging, Kubernetes, Cluster Management

Description: A practical guide to using talosctl get events for debugging issues on Talos Linux nodes and understanding system-level events.

---

Talos Linux generates a stream of internal events as it manages the lifecycle of a node. These events cover everything from service state changes to configuration updates to hardware detection. When something is not working as expected, these events are often the fastest path to figuring out what went wrong.

The `talosctl get events` command gives you access to this event stream. Unlike Kubernetes events (which track pod scheduling, container starts, and similar cluster-level activity), Talos events operate at the operating system level. They tell you what Talos itself is doing on each node.

## Running the Command

The simplest form of the command retrieves recent events from a node:

```bash
# Get events from a specific node
talosctl get events --nodes 192.168.1.10
```

This returns a list of events with their types, timestamps, and associated data. You can also follow events in real time:

```bash
# Follow events as they happen
talosctl get events --nodes 192.168.1.10 --watch
```

The watch mode keeps the connection open and prints new events as they occur. This is extremely useful when you are making configuration changes and want to see how the system responds.

## Understanding Event Structure

Each event in the output contains several fields:

```text
NODE           TYPE        ID                                   VERSION   TIMESTAMP
192.168.1.10   ConfigSet   config-set-1234                     1         2026-03-03T10:15:30Z
192.168.1.10   PhaseEvent  phase-event-5678                    1         2026-03-03T10:15:31Z
```

The key fields are:

- **NODE**: Which node generated the event
- **TYPE**: The category of event
- **ID**: A unique identifier for the event
- **TIMESTAMP**: When the event occurred

To get more detail about a specific event, use the YAML output format:

```bash
# Get detailed event information in YAML format
talosctl get events --nodes 192.168.1.10 -o yaml
```

This will show you the full event payload, including any additional metadata that is not visible in the table view.

## Common Event Types

### ConfigSet Events

These fire when the node configuration is applied or updated:

```bash
# Filter for configuration-related events
talosctl get events --nodes 192.168.1.10 | grep -i config
```

ConfigSet events tell you when a machine configuration was applied. If you recently pushed a config change and it did not take effect, check whether a ConfigSet event appeared. If it did not, the configuration might not have been accepted.

### PhaseEvent

Phase events track the stages of the Talos boot and configuration process. Talos goes through several phases during boot:

1. Security phase (setting up security primitives)
2. Network phase (configuring network interfaces)
3. Disk phase (mounting disks and partitions)
4. Kubernetes phase (starting kubelet and related services)

Each phase transition generates events. If a node is stuck during boot, the phase events will show you exactly where it stopped.

```bash
# Look for phase-related events
talosctl get events --nodes 192.168.1.10 -o yaml | grep -A5 "PhaseEvent"
```

### ServiceStateEvent

These track the state of Talos-managed services like etcd, kubelet, and the API server:

```bash
# Check service state changes
talosctl get events --nodes 192.168.1.10 | grep -i service
```

A common debugging scenario is finding that etcd failed to start. The service state events will show the transition from "Starting" to "Failed" and may include an error message explaining why.

### TaskEvent

Task events represent individual operations within a phase. They provide granular detail about what specific action was being performed when something went wrong.

## Debugging Scenarios

### Node Not Joining the Cluster

When a new node is not joining your Kubernetes cluster, events will show you where the process stalled:

```bash
# Watch events on the new node during bootstrap
talosctl get events --nodes 192.168.1.20 --watch
```

Look for:
- Network phase events completing successfully (the node needs network connectivity)
- Etcd events (on control plane nodes, etcd must start before Kubernetes)
- Kubelet service state events (kubelet must start and register with the API server)

If you see a phase event that never completes, that tells you which subsystem has the problem.

### Configuration Changes Not Taking Effect

After applying a new machine configuration, you should see a sequence of events:

```bash
# Apply a config and watch events simultaneously
# Terminal 1:
talosctl get events --nodes 192.168.1.10 --watch

# Terminal 2:
talosctl apply-config --nodes 192.168.1.10 --file new-config.yaml
```

You should see:
1. A ConfigSet event showing the new configuration was received
2. Phase events as Talos reconfigures affected subsystems
3. Service restart events for services affected by the change

If the ConfigSet event appears but no subsequent phase events follow, the configuration might be syntactically valid but not different enough from the current configuration to trigger a reconfiguration.

### Etcd Membership Issues

Etcd problems are among the most common issues in Talos clusters. Events can help diagnose them:

```bash
# Check etcd-related events across all control plane nodes
talosctl get events --nodes 192.168.1.10,192.168.1.11,192.168.1.12 | grep -i etcd
```

Look for events that show etcd failing to join the cluster, certificate errors, or timeout events. These often point to network connectivity or certificate issues between control plane nodes.

### Upgrade Failures

During a Talos upgrade, the event stream shows each step of the process:

```bash
# Monitor events during an upgrade
talosctl get events --nodes 192.168.1.10 --watch

# In another terminal, start the upgrade
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.7.0
```

If the upgrade fails, the events will show you which step failed. Common failure points include disk space issues, network problems downloading the new image, or configuration incompatibilities.

## Correlating with Other Data Sources

Events are most useful when combined with other diagnostic information. Here is a practical workflow:

```bash
# Step 1: Check events for the timeframe of the problem
talosctl get events --nodes 192.168.1.10

# Step 2: Check service logs for any services that showed errors in events
talosctl logs --nodes 192.168.1.10 kubelet

# Step 3: Check kernel messages for hardware-level issues
talosctl dmesg --nodes 192.168.1.10

# Step 4: Verify the current machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml
```

This layered approach starts with the high-level event view and drills down into specific subsystems as needed.

## Filtering and Output Formats

You can control the output format to make events easier to parse:

```bash
# JSON output for programmatic processing
talosctl get events --nodes 192.168.1.10 -o json

# YAML output for human-readable detail
talosctl get events --nodes 192.168.1.10 -o yaml

# Table output (default) for quick scanning
talosctl get events --nodes 192.168.1.10 -o table
```

For automated monitoring, JSON output works well with tools like `jq`:

```bash
# Extract specific fields from events using jq
talosctl get events --nodes 192.168.1.10 -o json | jq '.spec.type'
```

## Building an Event Monitoring Practice

Rather than only looking at events when something breaks, consider building a habit of checking events proactively. After any configuration change, upgrade, or node addition, spend a minute reviewing the event stream to confirm everything happened as expected.

You can also pipe events to a centralized logging system for historical analysis. This lets you go back and see what was happening on a node before it went offline, which is not possible if you only check events after the fact.

## Conclusion

The `talosctl get events` command provides visibility into the internal workings of Talos Linux at the operating system level. By understanding the different event types and knowing what to look for in common debugging scenarios, you can significantly reduce the time it takes to diagnose and resolve issues. Make events your first stop when troubleshooting, and combine them with service logs and kernel messages for a complete picture of what is happening on your nodes.

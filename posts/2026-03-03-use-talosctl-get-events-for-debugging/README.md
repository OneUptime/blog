# How to Use talosctl get events for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Event, Debugging, Kubernetes, Cluster Management

Description: A practical guide to using talosctl get events for debugging issues on Talos Linux nodes and understanding system-level events.

---

Talos Linux generates a stream of internal events as it manages the lifecycle of a node. These events cover everything from service state changes to configuration updates to hardware detection. When something is not working as expected, these events are often the fastest path to figuring out what went wrong.

The `talosctl events` command gives you access to this event stream. Unlike Kubernetes events (which track pod scheduling, container starts, and similar cluster-level activity), Talos events operate at the operating system level. They tell you what Talos itself is doing on each node.

## Running the Command

The simplest form of the command streams new events from a node:

```bash
# Get events from a specific node
talosctl events --nodes 192.168.1.10
```

By default, the command streams events as they occur. To include recent history before the live stream, use `--tail` or `--duration`:

```bash
# Show the last 50 events and then continue streaming
talosctl events --nodes 192.168.1.10 --tail 50

# Show events from the last 10 minutes and then continue streaming
talosctl events --nodes 192.168.1.10 --duration 10m
```

The live stream keeps the connection open and prints new events as they occur. This is extremely useful when you are making configuration changes and want to see how the system responds.

## Understanding Event Structure

Each event includes metadata about where it came from, when it happened, and the event payload. The exact display format can vary by Talos version, but the important fields are:

- **NODE**: Which node generated the event
- **ID**: The event identifier, which can be used with `--since` to resume after a known event
- **TIMESTAMP**: When the event occurred
- **ACTOR ID**: The actor associated with the operation, when available
- **TYPE / PAYLOAD**: The event type and event-specific details

To resume after a specific event ID, use `--since`:

```bash
# Continue after a known event ID
talosctl events --nodes 192.168.1.10 --since <event-id>
```

This is useful when you are collecting events over time and do not want to process the same event twice.

## Common Event Types

### Configuration Events

Configuration changes appear in the event stream as Talos processes the apply-config request and reconciles affected subsystems:

```bash
# Filter for configuration-related events
talosctl events --nodes 192.168.1.10 --tail 100 | grep -i config
```

If you recently pushed a config change and it did not take effect, check whether configuration-related events appeared after the apply operation. If they did not, the configuration might not have been accepted or the command might not have reached the node.

### PhaseEvent

Phase events track stages of Talos boot and configuration processing. Depending on the Talos version and node role, these can include early boot, platform setup, networking, storage, service startup, and Kubernetes-related work.

Each phase transition generates events. If a node is stuck during boot, the phase events will show you exactly where it stopped.

```bash
# Look for phase-related events
talosctl events --nodes 192.168.1.10 --tail 100 | grep "PhaseEvent"
```

### ServiceStateEvent

These track the state of Talos-managed services like etcd, kubelet, and the API server:

```bash
# Check service state changes
talosctl events --nodes 192.168.1.10 --tail 100 | grep -i service
```

A common debugging scenario is finding that etcd failed to start. The service state events can show transitions such as starting, running, or failed, and may include a message explaining why.

### TaskEvent

Task events represent individual operations within a phase. They provide granular detail about what specific action was being performed when something went wrong.

## Debugging Scenarios

### Node Not Joining the Cluster

When a new node is not joining your Kubernetes cluster, events will show you where the process stalled:

```bash
# Watch events on the new node during bootstrap
talosctl events --nodes 192.168.1.20
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
talosctl events --nodes 192.168.1.10

# Terminal 2:
talosctl apply-config --nodes 192.168.1.10 --file new-config.yaml
```

You should see:
1. Configuration-related events showing the apply operation was received or processed
2. Phase or task events as Talos reconfigures affected subsystems
3. Service restart events for services affected by the change

If configuration-related events appear but no subsequent phase or task events follow, the configuration might be syntactically valid but not different enough from the current configuration to trigger a reconfiguration.

### Etcd Membership Issues

Etcd problems are among the most common issues in Talos clusters. Events can help diagnose them:

```bash
# Check etcd-related events across all control plane nodes
talosctl events --nodes 192.168.1.10,192.168.1.11,192.168.1.12 --tail 200 | grep -i etcd
```

Look for events that show etcd failing to join the cluster, certificate errors, or timeout events. These often point to network connectivity or certificate issues between control plane nodes.

### Upgrade Failures

During a Talos upgrade, the event stream shows each step of the process:

```bash
# Monitor events during an upgrade
talosctl events --nodes 192.168.1.10

# In another terminal, start the upgrade
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.7.0
```

If the upgrade fails, the events will show you which step failed. Common failure points include disk space issues, network problems downloading the new image, or configuration incompatibilities.

## Correlating with Other Data Sources

Events are most useful when combined with other diagnostic information. Here is a practical workflow:

```bash
# Step 1: Check events for the timeframe of the problem
talosctl events --nodes 192.168.1.10 --duration 30m

# Step 2: Check service logs for any services that showed errors in events
talosctl logs --nodes 192.168.1.10 kubelet

# Step 3: Check kernel messages for hardware-level issues
talosctl dmesg --nodes 192.168.1.10

# Step 4: Verify the current machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml
```

This layered approach starts with the high-level event view and drills down into specific subsystems as needed.

## Filtering and History Options

You can control how much event history is included before the live stream:

```bash
# Show the last 100 events
talosctl events --nodes 192.168.1.10 --tail 100

# Show events from the last 30 minutes
talosctl events --nodes 192.168.1.10 --duration 30m

# Resume after a specific event ID
talosctl events --nodes 192.168.1.10 --since <event-id>
```

You can also filter by actor ID when you know which operation produced the events:

```bash
# Filter events by actor ID
talosctl events --nodes 192.168.1.10 --actor-id <actor-id>
```

## Building an Event Monitoring Practice

Rather than only looking at events when something breaks, consider building a habit of checking events proactively. After any configuration change, upgrade, or node addition, spend a minute reviewing the event stream to confirm everything happened as expected.

You can also pipe events to a centralized logging system for historical analysis. This lets you go back and see what was happening on a node before it went offline, which is not possible if you only check events after the fact.

## Conclusion

The `talosctl events` command provides visibility into the internal workings of Talos Linux at the operating system level. By understanding the different event types and knowing what to look for in common debugging scenarios, you can significantly reduce the time it takes to diagnose and resolve issues. Make events your first stop when troubleshooting, and combine them with service logs and kernel messages for a complete picture of what is happening on your nodes.

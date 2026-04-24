# How to Configure Async Edge Agent Ping and Snapshot Frequency (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Async, Snapshot, Ping Interval, IoT

Description: Fine-tune the async Edge Agent's ping interval and snapshot frequency in Portainer for optimal performance in bandwidth-constrained environments.

## Introduction

The async Edge Agent has three separate timing controls: the ping interval (heartbeat), the command check interval, and the snapshot interval. Async Edge Agent mode is available in Portainer Business Edition. In Portainer, these are configured on the async Edge environment itself, and the agent receives the effective intervals from Portainer during polling. Understanding each and configuring them appropriately is key to building efficient edge deployments.

## The Three Async Intervals Explained

### Ping interval (Heartbeat)

How often the agent performs a heartbeat check-in with Portainer.

**Effect on UI**: This contributes to how frequently the agent checks in, but Portainer's "Last Check-in" updates on any async poll, including command and snapshot polls.

### Command interval (Command Polling)

How often the agent checks for queued commands from Portainer.

**Effect on UI**: Time between issuing a command and it executing on the remote device.

### Snapshot interval (State Reporting)

How often the agent sends an environment snapshot to Portainer for snapshot browsing.

**Effect on UI**: How fresh the snapshot browsing information is in Portainer.

## Configuring All Intervals

```yaml
# compose.yaml

services:
  edge-agent:
    image: portainer/agent:latest
    environment:
      EDGE: "1"
      EDGE_ID: "remote-device-001"
      EDGE_KEY: "your-edge-key-here"
      EDGE_ASYNC: "1"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /var/run/portainer:/var/run/portainer
    restart: always
```

Set the `Ping interval`, `Snapshot interval`, and `Command interval` in Portainer when creating or editing the async Edge environment under **More settings**.

## Monitoring Interval Effectiveness

```bash
# Follow agent logs from the Compose service
docker compose logs -f edge-agent

# For per-poll messages, run the agent with LOG_LEVEL=DEBUG
# and look for "sending async-poll" entries

# In Portainer UI: Monitor the "Last Check-in" value
# It updates whenever the async agent polls Portainer
```

## Tuning for Different Connectivity Types

In current Portainer releases, the async interval selectors use preset values such as 1 minute, 1 hour, 1 day, and 1 week.

### High-Speed Fiber (Office Branch)
```bash
Ping interval: 60
Command interval: 60
Snapshot interval: 60
```

### 4G/LTE Connection
```bash
Ping interval: 60
Command interval: 60
Snapshot interval: 3600
```

### Satellite Internet (High Latency)
```bash
Ping interval: 3600
Command interval: 3600
Snapshot interval: 86400
```

### Infrequent Check-In (Solar/Battery Powered)
```bash
Ping interval: 86400
Command interval: 86400
Snapshot interval: 604800
```

## Impact of Long Intervals on User Experience

With all active async intervals set to 1 hour:
- Portainer updates the "Last Check-in" information about once an hour
- Commands may wait up to 1 hour before the agent fetches them
- Snapshot browsing data may be up to 1 hour old

Portainer tracks `Last Check-in` and marks async Edge environments offline only after roughly 2x the shortest active interval plus 20 seconds without contact.

## Conclusion

The three async intervals give fine-grained control over the trade-off between responsiveness and bandwidth. Start with the default 1-minute intervals, then raise the snapshot interval first if you need to reduce bandwidth. Increase the ping and command intervals only if slower status freshness and slower command pickup are acceptable.

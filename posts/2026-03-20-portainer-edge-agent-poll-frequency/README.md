# How to Configure Edge Agent Poll Frequency - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Poll Interval, Configuration, Performance

Description: Tune the Portainer Edge Agent's polling interval to balance command responsiveness against network bandwidth usage.

## Introduction

The Edge Agent's poll frequency determines how often it checks in with the Portainer server for new commands. A lower interval means faster command execution but higher bandwidth consumption. This guide covers configuring poll frequency for different use cases.

## Standard Mode Poll Interval

In standard mode, Portainer stores the poll frequency on the environment. Set the **Poll frequency** in Portainer when you create or edit the environment. The default is 5 seconds, and the agent deployment command does not include a separate poll-interval environment variable. Set `PORTAINER_VERSION` to match your Portainer Server version:

```bash
PORTAINER_VERSION=your-portainer-version

docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  --restart always \
  -e EDGE=1 \
  -e EDGE_ID=device-id \
  -e EDGE_KEY=edge-key \
  --name portainer_edge_agent \
  portainer/agent:$PORTAINER_VERSION
```

## Async Mode Intervals

In Portainer Business Edition, async mode has three independent interval settings: **Ping**, **Snapshot**, and **Command**. Configure these in Portainer when you create or edit the environment, or set their defaults under **Settings** > **Edge Compute**. The default for each is once a minute, and the agent deployment command only adds `EDGE_ASYNC=1`:

```bash
PORTAINER_VERSION=your-portainer-version

docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  --restart always \
  -e EDGE=1 \
  -e EDGE_ID=device-id \
  -e EDGE_KEY=edge-key \
  -e EDGE_ASYNC=1 \
  --name portainer_edge_agent \
  portainer/agent:$PORTAINER_VERSION
```

## Interval Selection Guide

Portainer's async interval selectors offer **Use default interval**, **Disabled**, **1 minute**, **1 hour**, **1 day**, and **1 week**. Example combinations:

| Scenario | Ping | Commands | Snapshot |
|----------|------|---------|---------|
| Low-latency, good connectivity | 1 minute | 1 minute | 1 minute |
| Standard office/branch | 1 minute | 1 minute | 1 hour |
| Metered/cellular connection | 1 hour | 1 hour | 1 day |
| Very remote / satellite | 1 day | 1 day | 1 week |
| IoT with daily check-in | 1 day | 1 day | 1 day |

## Updating Poll Interval on Running Agent

To change the interval for an existing Edge environment:

1. Open **Environments** in Portainer and select the Edge environment.
2. Edit the environment and change **Poll frequency** for standard mode, or the **Ping**, **Snapshot**, and **Command** intervals for async mode.
3. Save the changes.

You do not need to recreate the agent container just to change these intervals.

## Bandwidth Estimation

Calculate monthly bandwidth usage for standard mode using Portainer's documented figure of about 324 bytes per second per agent at the default 5-second poll interval:

```bash
python3 << 'EOF'
AGENTS = 1
DAYS = 30

BYTES_PER_SECOND_PER_AGENT = 324

daily_mb = (AGENTS * BYTES_PER_SECOND_PER_AGENT * 86400) / (1024 * 1024)
monthly_mb = daily_mb * DAYS

print(f"Agents: {AGENTS}")
print(f"Total: {daily_mb:.2f} MB/day, {monthly_mb:.1f} MB/month")
EOF
```

## Conclusion

Poll frequency configuration is a key tuning parameter for edge deployments. Start with the defaults (5s for standard mode, 1 minute each for async mode) and increase intervals if bandwidth or cost is a concern. For IoT or remote monitoring scenarios where hours-long response times are acceptable, use longer intervals to minimize data usage while maintaining management capability.

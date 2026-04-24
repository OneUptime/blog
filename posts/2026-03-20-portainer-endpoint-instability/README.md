# How to Fix Endpoint Instability in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Endpoint, Stability

Description: Address Portainer endpoint instability where environments frequently switch between online and offline states, causing unreliable management and false alerts.

## Introduction

An unstable endpoint in Portainer flickers between online and offline states - it shows green for a few minutes, then goes red, then recovers on its own. This is different from a permanently failed connection. Instability is usually caused by network intermittency, resource exhaustion, agent connectivity or authentication issues, or snapshot polling that is too frequent for a slow host.

## Step 1: Identify the Pattern

```bash
# Check Portainer logs for repeated connection/disconnection messages

docker logs portainer 2>&1 | grep -i "endpoint\|connect\|disconnect\|timeout" | tail -50

# Look for patterns like:
# "Failed to query endpoint" followed by "Endpoint is back online"
# This indicates intermittent connectivity, not permanent failure
```

## Step 2: Check Agent Host Resources

An agent on an overloaded host will respond slowly or intermittently:

```bash
# SSH to the agent host and check resources
docker stats --no-stream  # Container CPU/RAM usage
free -h                    # Available RAM
df -h                      # Disk space
uptime                     # Load average
```

If the host is overloaded:

```bash
# Reduce container load or add resources
# Review the busiest containers before restarting anything
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Restart problematic containers
docker restart <container-name-or-id>
```

## Step 3: Check Network Stability

```bash
# Run a ping test from Portainer server to agent
ping -c 100 agent-host | tail -5

# Check for packet loss
# Expected: 0% packet loss
# If you see > 0%, there's network instability

# Test with larger packets (more realistic)
ping -s 1400 -c 50 agent-host

# Check the network path
traceroute agent-host
```

## Step 4: Increase Snapshot Interval to Reduce Load

Frequent snapshots can overwhelm a slow or busy agent:

```bash
# Restart Portainer with a longer snapshot interval
docker stop portainer && docker rm portainer

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval=10m  # Every 10 minutes instead of 5m (default)
```

## Step 5: Fix Docker Daemon Instability on Agent Host

```bash
# Check Docker daemon health on the agent host
sudo systemctl status docker
journalctl -u docker --since "1 hour ago" | grep -i "error\|warn\|failed"

# Common Docker daemon issues causing agent instability:
# - Memory pressure (OOM killer hitting Docker)
# - Disk full
# - inotify watches exhausted

# Check for OOM events
dmesg | grep -i "oom\|killed" | tail -10

# Check inotify limits
cat /proc/sys/fs/inotify/max_user_watches
# If workloads on the host are exhausting this limit, increase it:
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 6: Fix Agent Connectivity Failures

```bash
# Check the agent logs for claim/authentication problems
docker logs portainer-agent 2>&1 | tail -50

# If your Portainer Server uses AGENT_SECRET,
# redeploy the agent with the same value:
docker stop portainer-agent && docker rm portainer-agent

docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -e AGENT_SECRET=yoursecret \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

If `AGENT_SECRET` is not set on the Portainer Server, omit that line.

## Step 7: Adjust Snapshot Interval in the UI

For slow or geographically distant agents:

```bash
# Portainer doesn't expose a direct connection timeout setting.
# To reduce polling without redeploying the container:
# In Portainer UI → Settings → General → Snapshot interval
# Increase the global snapshot interval if slower environments are overloaded
```

## Step 8: Use a Stable DNS Name

If the agent's address can change, prefer a stable DNS name and make sure it resolves consistently:

```bash
# Portainer Agent environments can use either a DNS name or an IP address
# If the address may change, prefer a hostname and verify resolution
nslookup agent-hostname

# If using an IP that might change, use a DDNS service
# or update the environment URL in Portainer after the change

# In /etc/hosts on the Portainer server host:
echo "192.168.1.50 agent-host" | sudo tee -a /etc/hosts
```

## Step 9: Check for Restart Loops on Agent

```bash
# Check if the agent is restarting frequently
docker inspect portainer-agent | grep '"RestartCount"'

# High restart count indicates a configuration problem
# View the restart history
docker events --filter container=portainer-agent --since 1h

# Fix restart loop by examining logs at startup
docker logs portainer-agent 2>&1 | head -30
```

## Step 10: Set Up Monitoring for Endpoint Status

Use the Portainer API to monitor endpoint status programmatically:

```bash
#!/bin/bash
# Check all endpoint statuses
TOKEN=$(curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

curl -sk -H "Authorization: Bearer $TOKEN" \
  https://localhost:9443/api/endpoints | \
  jq '.[] | {name: .Name, status: .Status, url: .URL}'

# Status values: 1 = Online, 2 = Offline
```

## Conclusion

Endpoint instability in Portainer is almost always caused by resource exhaustion on the agent host, network packet loss, or the Docker daemon itself being unstable. Start with checking agent host resources (CPU, RAM, disk), then test network stability, and finally tune the snapshot interval to reduce the polling frequency if the agent is being overwhelmed.

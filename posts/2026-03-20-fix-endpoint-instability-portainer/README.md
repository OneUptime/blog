# How to Fix Endpoint Instability in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Endpoint, Stability, Docker, Agent

Description: Learn how to diagnose and resolve endpoint instability in Portainer, where environments frequently toggle between online and offline states.

---

Endpoint instability - environments that randomly go offline and come back - is usually caused by snapshot timeouts, overloaded Docker hosts, or network congestion. This guide covers systematic diagnosis and remediation.

## Understanding Endpoint Health Checks

Portainer takes environment snapshots on the interval configured by `--snapshot-interval` (default `5m`). If Portainer cannot reach the environment reliably during these checks, you will typically see snapshot errors in the logs alongside online/offline flapping.

## Step 1: Check Snapshot Errors in Logs

```bash
# Look for snapshot-related errors

docker logs portainer 2>&1 | grep -Ei "snapshot|environment|error" | tail -50

# Common error patterns:
# "environment snapshot error" or "Unable to create snapshot" → Portainer could not complete the snapshot
# "context deadline exceeded" → the environment did not respond before the timeout
# "connection reset by peer" → the TCP connection was closed mid-request
```

## Step 2: Check Agent Host Resource Usage

An overloaded Docker host causes slow responses that Portainer interprets as failures:

```bash
# Check CPU and memory on the agent host
top -b -n 1 | head -20

# Check Docker daemon load
systemctl status docker
journalctl -u docker --since "1 hour ago" | tail -30
```

## Step 3: Increase Snapshot Interval

Reduce polling frequency to give stressed hosts more breathing room:

```bash
# Recreate Portainer with a longer snapshot interval (10 minutes)
docker stop portainer
docker rm portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --snapshot-interval 10m
```

## Step 4: Check Network Quality

Intermittent packet loss between Portainer and the agent causes timeout failures:

```bash
# Run a prolonged ping to measure packet loss
ping -c 100 <agent-host-ip>

# Linux: test a 1500-byte IPv4 path MTU (1472-byte payload + 28-byte headers)
ping -M do -s 1472 <agent-host-ip>
```

Any persistent packet loss is worth investigating. MTU mismatches can lead to dropped or black-holed packets and stalled TCP connections.

## Step 5: Check Agent Health Loop

```bash
# Check agent logs for repeated connection errors
docker logs portainer_agent 2>&1 | grep -Ei "error|timeout|reset|tls" | tail -50

# If you see repeated timeout, TLS, or reset errors,
# check the agent's current resource usage
docker stats portainer_agent --no-stream
```

## Step 6: Upgrade Agent Version

Stability issues are sometimes caused by agent bugs or by version mismatches between the Portainer Server and the agent. Keep the agent version aligned with the Portainer Server version:

```bash
docker stop portainer_agent
docker rm portainer_agent

# Example shown for the current LTS channel - use the same channel or exact version as your Portainer Server
docker pull portainer/agent:lts

# If your Portainer Server uses AGENT_SECRET, add: -e AGENT_SECRET=<same-secret>
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts
```

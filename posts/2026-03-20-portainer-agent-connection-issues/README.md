# How to Troubleshoot Portainer Agent Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Troubleshooting, Connectivity, Debugging

Description: Diagnose and resolve connection failures between the Portainer server and Portainer Agent including network, certificate, and configuration issues.

## Introduction

Agent connection failures are one of the most common Portainer issues. Environments show as "Down" or "Unreachable" when Portainer cannot communicate with the agent. This guide provides a systematic diagnostic approach.

## Step 1: Check Agent Container Status

```bash
# On the Docker host running the agent

docker ps | grep portainer_agent
docker logs portainer_agent --tail 50
docker stats portainer_agent --no-stream
```

## Step 2: Verify Port 9001 is Listening

```bash
# On the agent host
ss -tlnp | grep 9001
# OR
netstat -tlnp | grep 9001

# Expected: a LISTEN entry on :9001
```

## Step 3: Test Network Connectivity

```bash
# From the Portainer server
nc -zv AGENT_HOST_IP 9001
# Expected: "Connection to AGENT_HOST_IP 9001 port [tcp/*] succeeded!"

# Or probe the agent's HTTPS endpoint
curl -vk https://AGENT_HOST_IP:9001/ping
# Expected: HTTP/1.1 204 No Content
```

## Step 4: Check Firewall Rules

```bash
# On the agent host
sudo ufw status | grep 9001
sudo iptables -L INPUT -n | grep 9001

# Add rule if missing
sudo ufw allow from PORTAINER_SERVER_IP to any port 9001 proto tcp
```

## Step 5: Verify Agent Secret Matches

If an agent secret is configured, it must match on both sides:

```bash
# Check the agent-side secret
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' portainer_agent | grep '^AGENT_SECRET=' || echo 'No AGENT_SECRET set'

# Check the Portainer Server secret
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' portainer | grep '^AGENT_SECRET=' || echo 'No AGENT_SECRET set'
```

## Common Error Messages and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `connection refused` | Agent not running or wrong port | Start agent, check port |
| `connection timed out` | Firewall blocking | Open port 9001 |
| `authentication failed` | Secret mismatch | Sync `AGENT_SECRET` on both sides |
| `certificate error` | HTTP used instead of HTTPS, or strict validation of the agent's self-signed cert | Use HTTPS and trust the cert, or use `curl -k` for manual tests |

## Restarting the Agent

```bash
docker restart portainer_agent

# Watch logs after restart
docker logs portainer_agent -f
```

## Review the Environment Configuration in Portainer

1. Go to Environments
2. Click on the problematic environment
3. Verify the Environment URL / Address is the agent host or DNS name with port `9001` and no protocol
4. Save settings if you updated the address

## Conclusion

Most agent connection issues fall into four categories: the agent is not running, port 9001 is blocked by a firewall, the agent secret doesn't match, or the connection check is using HTTP or strict certificate validation against the agent's self-signed HTTPS endpoint. Work through the checklist systematically, starting with the simplest check (is the agent running?) before investigating network issues.

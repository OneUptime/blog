# How to Fix 'Unable to Connect to Agent' Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Agent, Docker, Networking, Connectivity

Description: Learn how to diagnose and fix 'Unable to Connect to Agent' errors in Portainer by checking network connectivity, TLS certificates, and agent secret configuration.

---

The "Unable to Connect to Agent" error appears in Portainer when the server cannot successfully communicate with the Portainer Agent on a remote host. The causes range from firewall rules to agent authentication mismatches to wrong port configurations.

## Understand the Connection Flow

```mermaid
graph LR
    A[Portainer Server] -->|HTTPS 9001| B[Portainer Agent]
    B -->|Docker Socket| C[Docker Daemon]
```

The server initiates an HTTPS connection to the agent on port 9001. Both network and application-level issues can break this.

## Step 1: Verify Agent is Running

On the agent host:

```bash
# Check if the agent container is running

docker ps | grep portainer_agent

# If not running, check for startup errors
docker logs --tail 50 portainer_agent
```

## Step 2: Test Network Connectivity

From the Portainer server host:

```bash
# Test TCP connectivity to the agent port
telnet <agent-host-ip> 9001

# Or using nc (netcat)
nc -zv <agent-host-ip> 9001

# Expected: the TCP connection opens successfully
# This confirms basic reachability only; Portainer still needs to complete HTTPS and agent authentication checks
# If connection refused: agent not listening or the host is rejecting the connection
# If timeout: network path blocked or traffic dropped by a firewall
```

## Step 3: Check Firewall Rules

On the agent host, ensure port 9001 is open:

```bash
# UFW
sudo ufw allow 9001/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 9001 -j ACCEPT

# firewalld
sudo firewall-cmd --permanent --add-port=9001/tcp
sudo firewall-cmd --reload
```

## Step 4: Verify Agent Secret Match

Both the server and agent must use the same secret:

```bash
# Portainer Server container must be started with:
-e AGENT_SECRET=mysecrettoken

# Portainer Agent must be started with:
-e AGENT_SECRET=mysecrettoken
```

If the secrets differ, the HTTPS connection may succeed, but agent authentication fails with "Unable to Connect."

## Step 5: Confirm Port 9001 is Published

For a remote Portainer Server, port `9001` must be published on an address the server can reach, not only on localhost:

```bash
# Check how Docker published the agent port
docker port portainer_agent 9001
# Should show a published mapping for port 9001, such as 0.0.0.0:9001
```

## Step 6: Re-add the Environment in Portainer

If network and secrets are correct, remove and re-add the environment in Portainer:

1. Go to **Environments > Select the environment > Remove**.
2. Go to **Environments > Add environment**.
3. Select **Docker Standalone** and click **Start Wizard**.
4. Under **More options**, select **Agent**, then enter the correct IP or DNS name and port `9001`.
5. Click **Connect**.

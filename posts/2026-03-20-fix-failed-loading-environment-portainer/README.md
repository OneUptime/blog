# How to Fix 'Failed Loading Environment' Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Environment, Docker, Agent, Connectivity

Description: Learn how to diagnose and fix 'Failed Loading Environment' errors in Portainer caused by stale endpoints, network changes, or agent failures.

---

The "Failed Loading Environment" error appears when Portainer cannot communicate with a previously configured environment. This is a runtime error, meaning the environment was working before and something changed.

## Common Causes

- The Docker host or agent IP address changed (e.g., DHCP reassignment)
- The Portainer Agent container was recreated with a different port
- Firewall rules were updated after the environment was configured
- The Docker daemon on the remote host is stopped

## Step 1: Check the Environment Status

In Portainer go to **Environments** and look at the status indicators. A red dot or "Down" label means the server cannot currently reach the host.

## Step 2: Verify the Endpoint URL

In Portainer go to **Environments > Select Environment > Edit**. Check that the address and port match the current agent address. For Portainer Agent environments, do not include a protocol in the **Environment URL** field:

```bash
# On the agent host, confirm the agent container is running
docker ps --filter "name=portainer_agent"

# Confirm which host port is mapped to the agent's port 9001
docker port portainer_agent 9001

# Confirm the IP has not changed
# Replace eth0 with your actual network interface name
ip addr show eth0 | grep "inet "
```

## Step 3: Test Connectivity

From the Portainer server, test direct connectivity:

```bash
# Replace with your actual agent IP and port
curl -k -s -o /dev/null -w "%{http_code}\n" https://<agent-ip>:9001/ping

# Expected: 204
# If connection refused: agent is down or port changed
# If timeout: firewall blocking
```

## Step 4: Reassign a Static IP to the Agent Host

To prevent future failures caused by IP changes:

```bash
# Set a static IP on Ubuntu (netplan)
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    # Replace eth0 with your actual interface name
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

Then apply the change:

```bash
sudo netplan apply
```

Or configure a DHCP reservation for the host's MAC address in your router.

## Step 5: Update the Environment URL

If the IP changed, update it in Portainer:

1. Go to **Environments > Select the failing environment**.
2. Click **Edit**.
3. Update the **Environment URL** to the new IP/hostname and port. Do not include `https://`.
4. Click **Update Environment**.

## Step 6: Restart the Agent

If the agent container is running but not responding:

```bash
docker restart portainer_agent

# Then verify
docker logs portainer_agent --tail 20
```

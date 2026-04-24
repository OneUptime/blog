# How to Fix Portainer Firewall Issues After Synology DSM Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Synology, NAS, Docker, Firewall, Troubleshooting, DSM

Description: Troubleshoot and fix common Portainer connectivity issues caused by Synology DSM firewall rule resets after system updates.

## Introduction

After Synology DSM updates, it is worth rechecking the active firewall profile and rule order, because either can block access to Portainer and other Docker containers. This guide covers how to diagnose and fix these issues so your Portainer installation survives future updates.

## Understanding the Problem

Synology DSM's built-in firewall manages access to the NAS at the system level. Published container ports are exposed through the NAS host, so they are subject to the same firewall rules. After DSM updates:

- The active firewall profile may need to be checked again
- Rule ordering may change, with broader deny rules taking precedence
- Docker's published-port firewall rules may need to be recreated

## Step 1: Diagnose the Issue

### Check Container Status

First, verify Portainer is actually running:

```bash
# SSH into Synology with an account in the administrators group

ssh <administrator-account>@<synology-ip>

# Check container status
sudo docker ps | grep portainer

# Check container logs for errors
sudo docker logs portainer --tail 50
```

### Check Port Binding

Verify Portainer's published ports:

```bash
# Show Portainer's published ports
sudo docker port portainer
```

### Test Local Connectivity

Test from the Synology itself:

```bash
# Portainer uses HTTPS on 9443 by default
curl -k -s -o /dev/null -w "%{http_code}" https://localhost:9443

# If you explicitly enabled legacy HTTP on 9000:
# curl -s -o /dev/null -w "%{http_code}" http://localhost:9000
```

If this returns `200` or `302` but you can't access it from your network, DSM firewall or other host-level filtering is the likely issue.

## Step 2: Fix the DSM Firewall

### Via DSM Web Interface

1. Go to **Control Panel > Security > Firewall**
2. Click **Edit Rules** for the active profile
3. Check the **All Interfaces** table and your active interface for deny rules that match Portainer
4. Look for a rule allowing port `9443`; only check `9000` if you explicitly enabled Portainer's legacy HTTP port

If the rules are missing, add them:

1. Click **Create**
2. Set **Ports**: Custom, TCP, `9443`
3. Set **Source IP**: Specific IP or range for your LAN (e.g., `192.168.1.1/255.255.255.0`)
4. Set **Action**: Allow
5. If you explicitly enabled legacy HTTP, repeat for port `9000`
6. **Drag** the allow rules above any broader deny rule in the same table

### Understanding Rule Order

DSM firewall rules are matched by priority. Rules in **All Interfaces** are evaluated before rules in a specific interface, and within each table the first matching rule wins:

```text
# Example order:
1. ALLOW TCP 9443 from 192.168.1.1/255.255.255.0
2. ALLOW TCP 9000 from 192.168.1.1/255.255.255.0  ← Only if legacy HTTP is enabled
3. DENY ALL (default)
```

## Step 3: Recreate Docker's Published-Port Rules

On Linux, Docker creates firewall rules for published ports. If your DSM firewall rules look correct but Portainer is still unreachable, restart Container Manager so Docker can recreate those rules.

Or via DSM:
1. Open **Package Center**
2. Click on **Container Manager**
3. Click **Stop**, wait 10 seconds, then **Start**

## Step 4: Create a Persistent Post-Boot Check

Create a Task Scheduler script that runs after startup and verifies that Portainer is reachable locally:

```bash
#!/bin/sh
# Verify Portainer after startup.
# Run this as a triggered task in Task Scheduler.

# Wait for network services to start
sleep 30

if ! curl -k -fsS --connect-timeout 5 https://localhost:9443 >/dev/null; then
    echo "Portainer HTTPS on 9443 did not respond locally after startup."
    exit 1
fi

echo "Portainer HTTPS on 9443 is reachable locally."
```

Add this as a triggered task in Task Scheduler:
- Task name: `Check Portainer After Startup`
- Task type: `Triggered Task > User-defined script`
- User: `root`
- Select the startup event available in your DSM version
- Optional: enable **Save output results** in Task Scheduler **Settings**

## Step 5: Prevent Future Issues with Firewall Profile

Create a dedicated firewall profile that you can reapply after updates:

1. In **Control Panel > Security > Firewall**, click the **+** icon in the **Firewall Profile** section
2. Name it `Docker Services`
3. Add all your Docker port rules to this profile
4. Before applying a DSM update, note which profile is active
5. After the update, reapply your profile if it was reset or another profile became active

## Step 6: Check Docker Network Interface Issues

If Docker's default bridge network is missing, verify it with Docker:

```bash
# Check that Docker's default bridge network exists
sudo docker network ls

# Inspect the default bridge network
sudo docker network inspect bridge
```

If `bridge` is missing or `inspect` fails, restart **Container Manager** from **Package Center** and then verify again.

## Step 7: Verify All Container Ports

After any DSM update, do a quick audit:

```bash
# List all running containers with their ports
sudo docker ps --format "table {{.Names}}\t{{.Ports}}"

# Show Portainer's published ports
sudo docker port portainer

# Test Portainer's default HTTPS listener
curl -k -s -o /dev/null -w "9443: %{http_code}\n" https://localhost:9443

# If you explicitly enabled legacy HTTP on 9000:
# curl -s -o /dev/null -w "9000: %{http_code}\n" http://localhost:9000
```

## Conclusion

Firewall issues after Synology DSM updates are a common frustration for home lab users. The key is understanding that DSM firewall rules may be reset and that Docker's published-port rules also need to be in the correct state. By keeping a dedicated firewall profile and a post-startup check, you can catch problems quickly and restore access to Portainer after an update.

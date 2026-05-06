# How to Check If Port 9001 Is Accessible for Portainer Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Networking, Firewall, Troubleshooting

Description: Verify that port 9001 is open and accessible for Portainer Agent communication between the server and agent hosts.

---

How to Check If Port 9001 Is Accessible for Portainer Agent is an important operational task for maintaining reliable Portainer infrastructure.

## Overview

By default, the Portainer Server communicates with the Portainer Agent on TCP port 9001. Proper configuration and troubleshooting of the agent is essential for uninterrupted container management.

## Common Configuration Steps

```bash
# Check agent container status

docker ps -a --filter name=portainer_agent

# View agent logs for errors
docker logs portainer_agent --tail 50 2>&1

# Verify port 9001 is listening
ss -tlnp | grep 9001
# or
netstat -tlnp | grep 9001
```

## Network Connectivity Test

```bash
# From the Portainer server, test connectivity to the agent
nc -zv <agent-host-ip> 9001
# Success indicates the TCP port is reachable

# Test the agent's public ping endpoint over HTTPS
curl -k -sS -i https://<agent-host-ip>:9001/ping | head -5
# Expected: HTTP/1.1 204 No Content
```

## Firewall Configuration

```bash
# Allow port 9001 (UFW)
sudo ufw allow from <portainer-server-ip> to any port 9001 proto tcp

# Allow port 9001 (firewalld)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<portainer-server-ip>" port port="9001" protocol="tcp" accept'
sudo firewall-cmd --reload

# IPTables rule
sudo iptables -A INPUT -s <portainer-server-ip> -p tcp --dport 9001 -j ACCEPT
```

## SELinux Requirement (RHEL/CentOS)

```bash
# Portainer's Linux agent install assumes SELinux is disabled.
# If SELinux must remain enabled, redeploy the agent with --privileged.
docker stop portainer_agent && docker container rm portainer_agent
docker run -d --privileged -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<matching-version>
```

## Agent Version Compatibility

```bash
# Check current agent version
docker inspect portainer_agent --format '{{.Config.Image}}'

# Check Portainer server image tag
docker inspect portainer --format '{{.Config.Image}}'

# Update agent to match the Portainer server version tag
docker stop portainer_agent && docker container rm portainer_agent
docker pull portainer/agent:<matching-version>
docker run -d -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<matching-version>
```

---

*Keep agent-based environments healthy with proactive monitoring from [OneUptime](https://oneuptime.com).*

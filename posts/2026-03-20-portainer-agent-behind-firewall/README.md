# How to Run Portainer Agent Behind a Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Firewall, Networking, Security

Description: Configure firewall rules to allow Portainer Agent traffic on port 9001 while maintaining network security.

---

How to Run Portainer Agent Behind a Firewall is an important operational task for maintaining reliable Portainer infrastructure.

## Overview

The Portainer Agent communicates with the Portainer server on TCP port 9001. Proper configuration and troubleshooting of the agent is essential for uninterrupted container management.

## Common Configuration Steps

```bash
# Check agent container status

docker ps --filter name=portainer_agent

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
# Expected: Connection succeeded

# Test the agent's public /ping endpoint over HTTPS
curl -sk -o /dev/null -w '%{response_code}\n' https://<agent-host-ip>:9001/ping
# Expected: 204
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
# If SELinux must remain enabled, redeploy the agent with --privileged
docker stop portainer_agent
docker rm portainer_agent
docker run -d --privileged -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<same-tag-as-server>
```

## Agent Version Compatibility

```bash
# Check current agent image/tag
docker inspect portainer_agent --format '{{.Config.Image}}'

# Check the Portainer server image/tag on the server host
docker inspect portainer --format '{{.Config.Image}}'

# Update agent to use the same tag as the Portainer server
docker stop portainer_agent
docker rm portainer_agent
docker pull portainer/agent:<same-tag-as-server>
# If Portainer Server uses AGENT_SECRET, add: -e AGENT_SECRET=<same-secret>
docker run -d -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<same-tag-as-server>
```

---

*Keep agent-based environments healthy with proactive monitoring from [OneUptime](https://oneuptime.com).*

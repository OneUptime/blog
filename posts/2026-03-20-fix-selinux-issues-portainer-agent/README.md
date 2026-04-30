# How to Fix SELinux Issues with Portainer Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SELinux, Linux, Agent, Troubleshooting

Description: Resolve SELinux permission denials that prevent the Portainer Agent from accessing Docker socket and volumes on RHEL-based systems.

---

How to Fix SELinux Issues with Portainer Agent is an important operational task for maintaining reliable Portainer infrastructure.

## Overview

The Portainer server connects to the Portainer Agent on TCP port 9001 over HTTPS. Proper configuration and troubleshooting of the agent is essential for uninterrupted container management.

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

# Test the agent ping endpoint over HTTPS
curl -sk -o /dev/null -w '%{http_code}\n' https://<agent-host-ip>:9001/ping
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

## SELinux Fix (RHEL/CentOS)

```bash
# Portainer's documented fix on SELinux-enabled Docker hosts is to run the agent privileged
IMAGE="$(docker inspect portainer_agent --format '{{.Config.Image}}')"
docker stop portainer_agent && docker container rm portainer_agent
docker run -d --privileged -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  "$IMAGE"

# Or temporarily disable enforcement for testing
sudo setenforce 0
```

## Agent Version Compatibility

```bash
# Check current agent version
docker inspect portainer_agent --format '{{.Config.Image}}'

# Check Portainer server version
SERVER_VERSION="$(curl -sk https://localhost:9443/api/system/status | python3 -c '
import sys, json
status = json.load(sys.stdin)
print(status.get(\"Version\", \"unknown\"))
')"
echo "Server version: $SERVER_VERSION"

# Update agent to match server version
docker stop portainer_agent && docker container rm portainer_agent
docker pull portainer/agent:$SERVER_VERSION
docker run -d --privileged -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:$SERVER_VERSION
```

---

*Keep agent-based environments healthy with proactive monitoring from [OneUptime](https://oneuptime.com).*

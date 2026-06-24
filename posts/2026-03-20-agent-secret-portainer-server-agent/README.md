# How to Configure the Agent Secret Between Portainer Server and Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Security, TLS, Authentication

Description: Set up a shared secret between the Portainer server and Portainer Agent to secure agent communications.

---

How to Configure the Agent Secret Between Portainer Server and Agent is an important operational task for maintaining reliable Portainer infrastructure.

## Overview

The Portainer Agent listens on TCP port 9001 and the Portainer server connects to it over HTTPS. By default, the first Portainer instance to claim an agent becomes the only server that can manage it. If you configure `AGENT_SECRET` on the Portainer server, you must set the same value on the Portainer Agent at container start time.

## Common Configuration Steps

```bash
# If either command prints nothing, AGENT_SECRET is not set on that container
docker inspect --format '{{join .Config.Env "\n"}}' portainer | grep '^AGENT_SECRET='
docker inspect --format '{{join .Config.Env "\n"}}' portainer_agent | grep '^AGENT_SECRET='

# When starting or redeploying Portainer Server, set AGENT_SECRET
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -e AGENT_SECRET='replace-with-a-long-random-secret' \
  portainer/portainer-ce:lts

# When starting or redeploying the agent, use the exact same AGENT_SECRET value
docker run -d -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -e AGENT_SECRET='replace-with-a-long-random-secret' \
  portainer/agent:lts

# View agent logs for claim or authentication errors
docker logs portainer_agent --tail 50 2>&1
```

## Network Connectivity Test

Portainer expects the environment URL in the form `<agent-host-ip>:9001` without a protocol prefix.

```bash
# From the Portainer server, confirm the agent port is reachable
nc -zv <agent-host-ip> 9001

# On the agent host, confirm the agent is listening on TCP/9001
ss -tlnp | grep 9001
```

## Firewall Configuration

```bash
# Allow port 9001 only from the Portainer server host (UFW)
sudo ufw allow proto tcp from <portainer-server-ip> to any port 9001

# Allow port 9001 only from the Portainer server host (firewalld)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<portainer-server-ip>" port port="9001" protocol="tcp" accept'
sudo firewall-cmd --reload

# Allow port 9001 only from the Portainer server host (iptables)
sudo iptables -A INPUT -s <portainer-server-ip> -p tcp --dport 9001 -j ACCEPT
```

## SELinux Context Fix (RHEL/CentOS)

Portainer's Docker agent instructions assume SELinux is disabled. If you must run with SELinux enforcing, redeploy the agent container with `--privileged`.

```bash
docker stop portainer_agent
docker rm portainer_agent
docker run -d --privileged -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -e AGENT_SECRET='replace-with-a-long-random-secret' \
  portainer/agent:lts
```

## Agent Version Compatibility

Always match the agent version to the Portainer server version. If the server is on an LTS release, use the same LTS tag for the agent instead of blindly using `latest`.

```bash
# Check the image tags currently in use
docker inspect portainer --format '{{.Config.Image}}'
docker inspect portainer_agent --format '{{.Config.Image}}'

# Replace lts with the same Portainer release tag used by the server, if different
docker stop portainer_agent
docker rm portainer_agent
docker pull portainer/agent:lts
docker run -d -p 9001:9001 --name portainer_agent --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -e AGENT_SECRET='replace-with-a-long-random-secret' \
  portainer/agent:lts
```

---

*Keep agent-based environments healthy with proactive monitoring from [OneUptime](https://oneuptime.com).*

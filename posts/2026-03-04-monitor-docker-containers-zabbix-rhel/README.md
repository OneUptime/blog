# How to Monitor Docker Containers with Zabbix on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, Docker, Containers, Monitoring, Linux

Description: Monitor Docker containers on RHEL using Zabbix Agent 2's built-in Docker plugin to track container status, resource usage, and performance metrics.

---

Zabbix Agent 2 includes a native Docker monitoring plugin that communicates with the Docker socket. This guide covers setting up Docker container monitoring on RHEL.

## Prerequisites

```bash
# Docker must be installed and running
sudo dnf install -y docker-ce
sudo systemctl enable --now docker

# Zabbix Agent 2 must be installed
sudo dnf install -y zabbix-agent2 zabbix-agent2-plugin-docker
```

## Grant Zabbix Access to Docker

```bash
# Add the zabbix user to the docker group
sudo usermod -aG docker zabbix

# Restart Zabbix Agent 2 to pick up the new group
sudo systemctl restart zabbix-agent2

# Verify Zabbix can access the Docker socket
sudo -u zabbix docker ps
```

## Configure the Docker Plugin

The Docker plugin is configured in the Zabbix Agent 2 configuration:

```bash
# Edit the plugin configuration
sudo tee /etc/zabbix/zabbix_agent2.d/plugins.d/docker.conf << 'CONF'
# Docker plugin configuration
Plugins.Docker.Endpoint=unix:///var/run/docker.sock
CONF

sudo systemctl restart zabbix-agent2
```

## Test Docker Metrics Locally

```bash
# Discover running containers
zabbix_agent2 -t docker.containers.discovery

# Get container info (use container ID or name)
zabbix_agent2 -t docker.container_info[my-container]

# Get container stats
zabbix_agent2 -t docker.container_stats[my-container]

# Check Docker data space usage
zabbix_agent2 -t docker.data_usage

# Get Docker system info
zabbix_agent2 -t docker.info
```

## Link the Docker Template in Zabbix

1. Go to Data collection > Hosts
2. Edit your Docker host
3. Go to the Templates tab
4. Search for and link "Docker by Zabbix agent 2"
5. Save

## What the Template Monitors

The built-in Docker template provides:

```text
Discovery rules:
  - Container discovery (auto-discovers all containers)
  - Image discovery

Items per container:
  - Container status (running, stopped, paused)
  - CPU usage percentage
  - Memory usage and limit
  - Network I/O (bytes sent/received)
  - Block I/O (read/write)
  - Container uptime

Host-level items:
  - Total containers (running, stopped, paused)
  - Total images
  - Docker data space used/available
  - Docker engine info
```

## Create Custom Container Monitoring

For application-specific metrics, use UserParameters:

```bash
# Add custom Docker checks
sudo tee /etc/zabbix/zabbix_agent2.d/docker-custom.conf << 'CONF'
# Count containers by status
UserParameter=docker.count.running,docker ps -q | wc -l
UserParameter=docker.count.all,docker ps -aq | wc -l
UserParameter=docker.count.stopped,docker ps -aq --filter "status=exited" | wc -l

# Check if a specific container is running (returns 1 or 0)
UserParameter=docker.container.running[*],docker inspect -f '{{.State.Running}}' $1 2>/dev/null | grep -c true

# Get container restart count
UserParameter=docker.container.restarts[*],docker inspect -f '{{.RestartCount}}' $1 2>/dev/null || echo -1

# Check container health status
UserParameter=docker.container.health[*],docker inspect -f '{{.State.Health.Status}}' $1 2>/dev/null || echo "none"
CONF

sudo systemctl restart zabbix-agent2
```

## Create Triggers for Container Alerts

Add these triggers to your template or host:

```text
Trigger: Container stopped
  Expression: last(/host/docker.container.running[myapp])=0
  Severity: High

Trigger: Container restart loop
  Expression: change(/host/docker.container.restarts[myapp])>0
  Severity: Warning

Trigger: Container unhealthy
  Expression: last(/host/docker.container.health[myapp])<>"healthy"
  Severity: Average
```

## SELinux Considerations

```bash
# If SELinux blocks Zabbix Agent from accessing Docker socket
sudo setsebool -P zabbix_can_network 1

# If custom SELinux policies are needed
sudo ausearch -m AVC -c zabbix_agent2 -ts recent | audit2allow -M zabbix_docker
sudo semodule -i zabbix_docker.pp
```

With this setup, Zabbix automatically discovers and monitors all Docker containers on your RHEL host, including their resource usage and health status.

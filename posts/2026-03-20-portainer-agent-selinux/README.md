# How to Fix Agent Issues When SELinux Is Enabled - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, SELinux, Security, Agent

Description: Resolve Portainer Agent connection and permission failures caused by SELinux enforcing policies on RHEL, CentOS, and Fedora systems.

## Introduction

SELinux (Security-Enhanced Linux) enforces mandatory access control policies that can prevent the Portainer Agent from accessing the Docker socket, volume paths, and network ports - even when standard Linux permissions would allow it. This guide covers how to diagnose SELinux-related Agent issues and apply the appropriate fixes without completely disabling SELinux.

## Step 1: Verify SELinux Is the Cause

```bash
# Check SELinux status

getenforce
# Outputs: Enforcing, Permissive, or Disabled

sestatus
# Shows detailed SELinux configuration

# Quick test: temporarily set to Permissive and see if issue resolves
sudo setenforce 0
docker restart portainer-agent

# Test connectivity from Portainer server
# If it works in Permissive mode, SELinux is the cause
# Re-enable Enforcing after testing
sudo setenforce 1
```

## Step 2: Check SELinux Audit Logs

```bash
# Check for AVC (Access Vector Cache) denial messages
sudo ausearch -m AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR -ts recent

# Or check the audit log directly
sudo grep -i 'avc:.*denied' /var/log/audit/audit.log | tail -20

# If setroubleshoot is installed, check its summaries too
sudo journalctl -t setroubleshoot --since today

# Get a summary of all denials
sudo aureport --avc
```

## Step 3: Fix Docker Socket Access

On SELinux-enabled Linux hosts, Portainer documents `--privileged` as the required deployment mode for the Agent:

```bash
docker stop portainer-agent && docker rm portainer-agent

docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts

# Match the Agent image tag to your Portainer Server release track/version
```

## Step 4: Fix Volume Path Access

If the agent can't access Docker volume paths:

```bash
# Check the SELinux context on Docker-managed storage
ls -ldZ /var/lib/docker /var/lib/docker/volumes

# Restore the default SELinux contexts if they drifted
sudo restorecon -Rv /var/lib/docker /var/lib/docker/volumes

# If Docker uses a non-standard data root, map it to Docker's default context
sudo semanage fcontext -a -e /var/lib/docker /srv/data/docker
sudo restorecon -Rv /srv/data/docker
```

## Step 5: Create a Custom SELinux Policy Module

For a permanent, precise fix after ruling out labeling issues:

```bash
# Install SELinux tools
sudo dnf install -y policycoreutils-python-utils selinux-policy-devel
# On older RHEL/CentOS releases, use yum instead of dnf

# Generate a policy module from denial messages
sudo ausearch -m AVC,USER_AVC -ts recent --raw | audit2allow -M portainer-agent

# Review the generated policy carefully
cat portainer-agent.te

# Install the policy module
sudo semodule -i portainer-agent.pp

# Verify installation
sudo semodule -l | grep portainer-agent
```

## Step 6: Allow Network Port Access

If the audit log shows a bind denial on port 9001:

```bash
# Check whether 9001 already has an SELinux port label
sudo semanage port -l | grep -w 9001

# Add 9001 for container processes if it is not already defined
sudo semanage port -a -t container_port_t -p tcp 9001

# Or, if 9001 already exists with a different type, modify it instead
sudo semanage port -m -t container_port_t -p tcp 9001

# Verify
sudo semanage port -l | grep -w 9001
```

## Step 7: Enable container_manage_cgroup Only If Denials Mention Cgroups

On RHEL/CentOS, this boolean is relevant only when AVC denials mention cgroup access:

```bash
# Check the current state
sudo getsebool -a | grep container_manage_cgroup

# Enable it permanently if the denials point to cgroup access
sudo setsebool -P container_manage_cgroup on
```

## Step 8: Verify the Privileged Flag Is Set

On SELinux-enabled Linux hosts, confirm the agent is actually running with `--privileged`:

```bash
docker inspect portainer-agent --format '{{.HostConfig.Privileged}}'
# Expected output: true
```

## Step 9: Check SELinux Context on Edge Agent Data Volume

```bash
# If you are also using an Edge Agent data volume, check its context
ls -ldZ /var/lib/docker/volumes/portainer_agent_data
ls -lZ /var/lib/docker/volumes/portainer_agent_data/_data/

# Restore Docker's default contexts if the labels drifted
sudo restorecon -Rv /var/lib/docker/volumes/portainer_agent_data
```

## Step 10: Permanent Solution with Docker Compose

For the same deployment in Docker Compose, use privileged mode on SELinux-enabled hosts:

```yaml
services:
  portainer-agent:
    image: portainer/agent:lts  # Match the Agent tag to your Portainer Server release track/version
    privileged: true
    ports:
      - "9001:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    restart: unless-stopped
```

## Conclusion

SELinux issues with the Portainer Agent are best addressed by deploying the Agent with `--privileged` on SELinux-enabled Linux hosts, which is Portainer's documented requirement. Use the audit logs to confirm whether you also have mislabeled Docker storage or a port-labeling issue, and prefer restoring correct contexts or adding a narrow local policy module over disabling SELinux entirely.

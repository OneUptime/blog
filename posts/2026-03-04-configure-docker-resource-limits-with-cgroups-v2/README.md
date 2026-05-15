# How to Configure Docker Resource Limits with cgroups v2 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Container, Cgroups, Linux

Description: Learn how to configure Docker Resource Limits with cgroups v2 on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to configure Docker resource limits with cgroups v2 on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- A maintained RHEL 8, RHEL 9, or RHEL 10 installation
- Root or sudo access
- A stable network connection

## Overview

Configuring Docker resource limits with cgroups v2 requires a Docker Engine version that supports cgroups v2 and a host running the unified cgroup hierarchy. Docker supports cgroups v2 with Docker Engine 20.10 or later, containerd 1.4 or later, and runc 1.0.0-rc91 or later.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install the DNF repository management plugin:

```bash
sudo dnf install -y dnf-plugins-core
```

Confirm that the host is using cgroups v2. On a cgroups v2 system, `/sys/fs/cgroup/cgroup.controllers` exists:

```bash
test -f /sys/fs/cgroup/cgroup.controllers && echo "cgroups v2 enabled"
```

RHEL 9 uses cgroups v2 by default. On a RHEL 8 host that is still using cgroups v1, enable the unified hierarchy and reboot:

```bash
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
sudo reboot
```

## Step 2: Install Required Packages

Set up Docker's RHEL repository:

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
```

Install Docker Engine and its required packages:

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verify the installation:

```bash
rpm -qi docker-ce
docker --version
```

## Step 3: Configure the Service

Create or edit the Docker daemon configuration file:

```bash
sudo mkdir -p /etc/docker
sudo vi /etc/docker/daemon.json
```

Use the `systemd` cgroup driver for Docker on a cgroups v2 host:

```json
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
```

Apply the recommended settings for your environment. Start with the defaults and adjust resource limits based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now docker
sudo systemctl status docker
```

If you edited `/etc/docker/daemon.json` after Docker was already running, reload systemd and restart Docker:

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo docker run --rm hello-world
```

Verify that Docker is using cgroups v2 and the expected cgroup driver:

```bash
sudo docker info --format 'Cgroup Version: {{.CgroupVersion}}'
sudo docker info --format 'Cgroup Driver: {{.CgroupDriver}}'
```

Run a container with CPU and memory limits:

```bash
sudo docker run --rm --name limited-nginx \
  --memory=512m \
  --memory-swap=1g \
  --cpus=1.5 \
  -d nginx:latest
```

Check the logs for any errors:

```bash
journalctl -u docker -f
```

## Step 6: Configure Firewall Rules

Docker resource limits do not require firewall changes. If a container publishes a network port, open only the required host port. For example, if you publish HTTP traffic on port 8080:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust container limits based on your workload:

```bash
sudo docker stats limited-nginx
sudo docker inspect limited-nginx --format '{{json .HostConfig.Memory}} {{json .HostConfig.NanoCpus}}'
```

On cgroups v2 with the `systemd` cgroup driver, Docker container cgroup data is under `/sys/fs/cgroup/system.slice/docker-<container-id>.scope/`. You can get the full container ID and inspect the memory limit:

```bash
CONTAINER_ID=$(sudo docker inspect --format '{{.Id}}' limited-nginx)
sudo cat /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/memory.max
```

## Security Considerations

- Run containers as a non-root user when possible
- Protect the Docker daemon socket and avoid exposing the remote API without TLS
- Restrict published container ports with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Docker fails to start**: Check `journalctl -u docker -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port
4. **Resource limits are not applied**: Confirm cgroups v2 with `test -f /sys/fs/cgroup/cgroup.controllers` and check `docker info`

## Conclusion

You have successfully configured Docker resource limits with cgroups v2 on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.

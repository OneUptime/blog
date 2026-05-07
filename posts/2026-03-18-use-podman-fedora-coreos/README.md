# How to Use Podman on Fedora CoreOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Fedora CoreOS, Container, DevOps, Linux

Description: Learn how to use Podman on Fedora CoreOS, an automatically updating, minimal operating system designed for running containerized workloads at scale.

---

> Fedora CoreOS ships with Podman pre-installed and is purpose-built for containers. This guide walks you through leveraging Podman on this minimal, immutable operating system for production container workloads.

Fedora CoreOS (FCOS) is a minimal, automatically updating operating system built specifically for running containerized workloads securely and at scale. Unlike traditional Linux distributions, FCOS follows an immutable infrastructure model where the base OS is read-only in normal operation and application workloads are typically run inside containers. Podman comes pre-installed as the default container runtime, making FCOS an ideal platform for container-native deployments.

This guide covers everything you need to know about using Podman effectively on Fedora CoreOS, from initial provisioning to running production workloads.

---

## Understanding Fedora CoreOS

Fedora CoreOS differs from traditional distributions in several key ways. The operating system uses an immutable filesystem with automatic updates delivered through OSTree. You do not install packages with dnf in the traditional sense. Instead, you provision the system using Ignition configs at first boot and typically run your workloads as containers.

Since Podman is baked into the base image, you can start running containers immediately after provisioning.

## Provisioning Fedora CoreOS with Ignition

Before you can use Podman, you need to provision your FCOS instance. Fedora CoreOS uses Butane configs (YAML) that compile into Ignition configs (JSON). Here is a basic Butane config that sets up a user with SSH access:

```yaml
variant: fcos
version: 1.5.0
passwd:
  users:
    - name: core
      ssh_authorized_keys:
        - ssh-rsa AAAA...your-public-key-here
storage:
  files:
    - path: /etc/hostname
      mode: 0644
      contents:
        inline: podman-host
```

Compile this Butane config into an Ignition config:

```bash
butane --pretty --strict config.bu > config.ign
```

Provide the Ignition config to the machine at first boot. If you are installing FCOS directly to a disk, you can embed it during install:

```bash
sudo coreos-installer install /dev/sda --ignition-file config.ign
```

## Verifying the Podman Installation

Once your FCOS instance is running, SSH in and verify Podman is available:

```bash
ssh core@your-fcos-host
podman --version
podman info
```

You should see Podman version information and system details. Since FCOS is designed for containers, Podman is configured and ready to use without additional setup.

## Running Containers with Podman

Running containers on FCOS works the same as any other Podman environment. Pull and run a container:

```bash
podman run -d --name webserver -p 8080:80 docker.io/library/nginx:latest
```

Verify the container is running:

```bash
podman ps
curl http://localhost:8080
```

## Using Quadlet for Systemd-Managed Containers

Fedora CoreOS encourages running containers as systemd services. Quadlet is the modern way to define Podman containers as systemd units. Create a Quadlet container file:

```ini
# /etc/containers/systemd/webapp.container

[Container]
ContainerName=webapp
Image=docker.io/library/nginx:latest
PublishPort=8080:80
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target default.target
```

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl start webapp.service
sudo systemctl enable webapp.service
sudo systemctl status webapp.service
```

Quadlet files are the recommended approach on FCOS because they integrate containers directly with systemd lifecycle management.

## Provisioning Containers at Boot with Ignition

One of the strengths of FCOS is the ability to define your entire container workload in the Ignition config. Here is a Butane config that starts a container on first boot:

```yaml
variant: fcos
version: 1.5.0
passwd:
  users:
    - name: core
      ssh_authorized_keys:
        - ssh-rsa AAAA...your-key
storage:
  files:
    - path: /etc/containers/systemd/monitoring.container
      mode: 0644
      contents:
        inline: |
          [Container]
          ContainerName=monitoring
          Image=docker.io/prom/prometheus:latest
          PublishPort=9090:9090
          Volume=/etc/prometheus:/etc/prometheus:ro

          [Service]
          Restart=always

          [Install]
          WantedBy=multi-user.target default.target
    - path: /etc/prometheus/prometheus.yml
      mode: 0644
      contents:
        inline: |
          global:
            scrape_interval: 15s
          scrape_configs:
            - job_name: 'prometheus'
              static_configs:
                - targets: ['localhost:9090']
systemd:
  units:
    - name: monitoring.service
      enabled: true
```

This ensures your monitoring stack is running immediately after the machine boots for the first time.

## Automatic Container Updates

Podman on FCOS supports automatic container updates. When you set `AutoUpdate=registry` in your Quadlet file, Podman can check for new images and restart containers automatically.

Enable the auto-update timer:

```bash
sudo systemctl enable --now podman-auto-update.timer
```

Check the auto-update status:

```bash
sudo podman auto-update --dry-run
```

This pairs well with the FCOS automatic OS update mechanism, giving you a fully self-updating container host.

## Working with Pods

Podman pods group multiple containers that share network and IPC namespaces. Create a pod for a multi-container application:

```bash
podman pod create --name app-stack -p 8080:80 -p 5432:5432

podman run -d --pod app-stack --name db \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

podman run -d --pod app-stack --name web \
  docker.io/library/nginx:latest
```

List running pods:

```bash
podman pod ps
podman pod inspect app-stack
```

## Managing Storage on FCOS

Fedora CoreOS uses a specific partition layout. Container storage defaults to `/var/lib/containers`. For production workloads that need persistent data, mount additional storage:

```yaml
variant: fcos
version: 1.5.0
storage:
  disks:
    - device: /dev/sdb
      partitions:
        - label: data
  filesystems:
    - device: /dev/disk/by-partlabel/data
      path: /var/data
      format: xfs
      with_mount_unit: true
```

Then mount this storage into your containers:

```bash
podman run -d -e POSTGRES_PASSWORD=secret -v /var/data:/var/lib/postgresql/data:Z docker.io/library/postgres:16
```

## Networking Considerations

FCOS does not ship `firewalld` by default. If you need host-level firewalling, configure it explicitly instead of assuming `firewall-cmd` is available.

For rootless containers, note that ports below 1024 require root privileges or sysctl adjustments:

```bash
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

## Layering Packages with rpm-ostree

While FCOS discourages installing packages on the host, you can layer essential tools if needed:

```bash
sudo rpm-ostree install htop tmux
sudo systemctl reboot
```

However, the recommended approach is to run any additional tools as containers:

```bash
podman run -it --rm docker.io/library/alpine:latest sh
```

## Debugging and Troubleshooting

Inspect container logs through systemd when using Quadlet:

```bash
sudo journalctl -u webapp.service -f
```

Check Podman events:

```bash
sudo podman events --since 1h
```

Enter a running container for debugging:

```bash
sudo podman exec -it webapp /bin/sh
```

## Conclusion

Fedora CoreOS and Podman are a natural pairing for production container workloads. FCOS provides the minimal, secure, auto-updating foundation while Podman delivers the container runtime without requiring a daemon. By using Ignition for provisioning, Quadlet for systemd integration, and auto-updates for maintenance, you can build a container platform that largely manages itself. The immutable nature of FCOS combined with rootless Podman containers creates a security-hardened environment suitable for critical infrastructure.

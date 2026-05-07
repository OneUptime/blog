# How to Use GlobalArgs and PodmanArgs in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Configuration, CLI Arguments

Description: Learn how to pass custom CLI arguments to Podman through Quadlet using the GlobalArgs and PodmanArgs directives.

---

> Extend Quadlet container configuration beyond its built-in directives by passing custom Podman CLI arguments through GlobalArgs and PodmanArgs.

Quadlet provides dedicated directives for common container options, but Podman has many more flags than Quadlet exposes natively. The `PodmanArgs` and `GlobalArgs` directives let you pass additional CLI arguments directly to Podman when you need raw Podman options.

---

## Understanding the Difference

- **GlobalArgs** - Arguments placed before the `run` subcommand (e.g., `podman --log-level=debug run ...`)
- **PodmanArgs** - Arguments placed after the `run` subcommand (e.g., `podman run --shm-size=256m ...`)

## Using PodmanArgs

PodmanArgs appends flags to the `podman run` command, before the image name:

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=Application with custom Podman arguments

[Container]
Image=docker.io/myorg/myapp:latest
PublishPort=3000:3000

# Pass additional flags to podman run
PodmanArgs=--cpus=2.0
PodmanArgs=--cpu-shares=512
PodmanArgs=--no-hosts
PodmanArgs=--oom-score-adj=100

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using GlobalArgs

GlobalArgs adds flags to the Podman command itself:

```ini
[Container]
Image=docker.io/myorg/myapp:latest

# Global Podman flags (before the 'run' subcommand)
GlobalArgs=--log-level=debug
GlobalArgs=--storage-driver=overlay
```

The resulting command looks like:

```bash
podman --log-level=debug --storage-driver=overlay run ...
```

## Common PodmanArgs Use Cases

The following are valid `podman run` flags that can be passed through `PodmanArgs`. When Quadlet has a dedicated directive for the same option, prefer the Quadlet directive because it is understood by the generator.

### Setting Shared Memory Size

```ini
PodmanArgs=--shm-size=512m
```

### Adding Device Access

```ini
PodmanArgs=--device=/dev/dri:/dev/dri
```

### Setting Ulimits

```ini
PodmanArgs=--ulimit=nofile=65536:65536
PodmanArgs=--pids-limit=4096
```

### Adding Sysctl Options

```ini
PodmanArgs=--sysctl=net.core.somaxconn=1024
PodmanArgs=--sysctl=net.ipv4.tcp_syncookies=0
```

### Setting the Hostname

```ini
PodmanArgs=--hostname=myapp-server
```

### Overriding the Entrypoint

```ini
PodmanArgs=--entrypoint='["/bin/sh", "-c"]'
```

## Verifying the Generated Command

```bash
# Reload and check the generated unit
systemctl --user daemon-reload

# View the full ExecStart line to verify arguments
systemctl --user cat myapp.service | grep ExecStart
```

## Combining Multiple Arguments

```ini
[Container]
Image=docker.io/myorg/myapp:latest
PublishPort=3000:3000

# Resource limits
PodmanArgs=--memory=2g
PodmanArgs=--cpus=4.0
PodmanArgs=--pids-limit=1000

# Security
PodmanArgs=--cap-drop=all
PodmanArgs=--cap-add=net_bind_service
PodmanArgs=--security-opt=no-new-privileges:true

# Networking
PodmanArgs=--hostname=api-server
PodmanArgs=--dns=8.8.8.8
```

## Summary

`PodmanArgs` and `GlobalArgs` in Quadlet let you pass Podman CLI flags through to the generated command. Use `PodmanArgs` for additional `podman run` flags, and prefer dedicated Quadlet directives when they exist for options like memory limits, capabilities, ulimits, sysctls, DNS, hostnames, and entrypoints. Use `GlobalArgs` for Podman-level flags like log level and storage driver. Check the generated unit with `systemctl cat` to verify the arguments are applied correctly.

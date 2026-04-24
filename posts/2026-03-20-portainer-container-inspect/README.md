# How to View Container Details and Inspect JSON in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Debugging, DevOps

Description: Learn how to view detailed container information and raw inspect JSON in Portainer for debugging, auditing, and understanding container configuration.

## Introduction

Portainer's container inspection view gives you a comprehensive look at a container's configuration, state, and runtime details. Whether you're debugging a networking issue, verifying environment variables, or auditing container settings, the inspect feature provides complete visibility into the container's current state.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running or stopped container to inspect

## Step 1: Open Container Details

1. Navigate to **Containers** in Portainer.
2. Click on any container name.
3. You'll land on the container details page.

## Step 2: Container Details Page

The container details page shows a human-friendly summary. Depending on your container and environment, it can include:

- **Status**: Running, Stopped, Paused
- **Image**: Image name and ID
- **Created**: Creation timestamp
- **Started**: Last start time
- **Finished**: Last stop time (if stopped)
- **IP Address**: Container's IP on Docker networks
- **MAC Address**: Container's MAC address
- **Restart count**: How many times the container has restarted

## Step 3: Navigate to the Inspect Tab

Click the **Inspect** tab to open Portainer's tree view, then click **Text** to view the raw JSON representation.

This is equivalent to:

```bash
# Docker CLI:

docker inspect my-container

# Pretty-printed with jq:
docker inspect my-container | jq .
```

## Step 4: Key Sections in the Inspect JSON

### Container State

```json
{
  "State": {
    "Status": "running",
    "Running": true,
    "Paused": false,
    "Restarting": false,
    "OOMKilled": false,
    "Dead": false,
    "Pid": 1234,
    "ExitCode": 0,
    "Error": "",
    "StartedAt": "2026-03-20T10:00:00Z",
    "FinishedAt": "0001-01-01T00:00:00Z"
  }
}
```

Key fields to check:
- `OOMKilled: true` → Container was killed due to out-of-memory.
- `ExitCode: 137` → The container was terminated with `SIGKILL`; common causes include an OOM kill, `docker kill`, or a Docker daemon restart.
- `Restarting: true` → Container is in a restart loop.

### Network Settings

```json
{
  "NetworkSettings": {
    "Networks": {
      "bridge": {
        "IPAddress": "172.17.0.2",
        "Gateway": "172.17.0.1",
        "MacAddress": "02:42:ac:11:00:02"
      },
      "myapp-network": {
        "IPAddress": "10.0.1.5",
        "Gateway": "10.0.1.1"
      }
    },
    "Ports": {
      "80/tcp": [{"HostIp": "0.0.0.0", "HostPort": "8080"}]
    }
  }
}
```

Useful for: verifying network connectivity, finding the correct per-network IP address for inter-container communication.

### Mounts (Volumes)

```json
{
  "Mounts": [
    {
      "Type": "volume",
      "Name": "myapp_data",
      "Source": "/var/lib/docker/volumes/myapp_data/_data",
      "Destination": "/app/data",
      "Mode": "",
      "RW": true
    },
    {
      "Type": "bind",
      "Source": "/etc/myapp/config.yaml",
      "Destination": "/app/config.yaml",
      "Mode": "ro",
      "RW": false
    }
  ]
}
```

Useful for: verifying volume mounts, finding actual data paths on the host.

### Config

```json
{
  "Config": {
    "Image": "myorg/myapp:2.1.0",
    "Cmd": ["node", "server.js"],
    "Entrypoint": null,
    "WorkingDir": "/app",
    "User": "1000",
    "Env": [
      "NODE_ENV=production",
      "PORT=8080",
      "DB_HOST=postgres"
    ],
    "Labels": {
      "com.example.version": "2.1.0",
      "traefik.enable": "true"
    }
  }
}
```

Useful for: verifying environment variables are set correctly, checking the running command.

### Host Config (Runtime Settings)

```json
{
  "HostConfig": {
    "Binds": ["/host/data:/app/data:ro"],
    "PortBindings": {
      "8080/tcp": [{"HostIp": "", "HostPort": "8080"}]
    },
    "RestartPolicy": {
      "Name": "unless-stopped",
      "MaximumRetryCount": 0
    },
    "Memory": 536870912,
    "NanoCpus": 500000000,
    "Privileged": false,
    "CapAdd": null,
    "CapDrop": ["ALL"],
    "Sysctls": {
      "net.core.somaxconn": "65535"
    }
  }
}
```

Useful for: verifying resource limits, security settings, restart policy.

## Step 5: Extracting Specific Information with jq

When working via CLI for automation:

```bash
# Get container IP addresses by network:
docker inspect my-container | jq '.[].NetworkSettings.Networks | map_values(.IPAddress)'

# Get all environment variables:
docker inspect my-container | jq '.[].Config.Env[]'

# Check if container is OOM killed:
docker inspect my-container | jq '.[].State.OOMKilled'

# Get all mounted volumes:
docker inspect my-container | jq '.[].Mounts[]'

# Get memory limit:
docker inspect my-container | jq '.[].HostConfig.Memory'

# Get restart policy:
docker inspect my-container | jq '.[].HostConfig.RestartPolicy'

# Get image manifest digest(s), if available:
docker image inspect "$(docker inspect --format='{{.Image}}' my-container)" | jq '.[].RepoDigests[]?'
```

## Step 6: Common Debugging Scenarios

### "Why can't my container reach service X?"

Check the network configuration:
```text
Inspect → NetworkSettings → Networks
Verify both containers are on the same Docker network
```

### "Is my environment variable set correctly?"

```text
Inspect → Config → Env
Look for your variable in the list
```

### "Why is my container restarting?"

```text
Inspect → State → ExitCode and Error
Check OOMKilled field
Review logs for the crash reason
```

### "What volumes are mounted?"

```text
Inspect → Mounts
Verify Source paths exist on the host
Check RW field for read/write vs read-only
```

## Conclusion

Portainer's container inspection view puts the full `docker inspect` output at your fingertips in a readable web interface. By understanding the key sections - State, NetworkSettings, Mounts, Config, and HostConfig - you can quickly diagnose issues, audit container configurations, and verify that your deployments are running exactly as intended.

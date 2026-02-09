# How to Use docker context for Multi-Host Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Context, Remote Management, Multi-Host, SSH, DevOps, Infrastructure

Description: Manage multiple Docker hosts from a single machine using docker context to switch between local and remote environments.

---

If you manage Docker on more than one machine, you have probably been SSH-ing into servers to run Docker commands. That works, but it is tedious. Docker contexts let you manage multiple Docker hosts from your local machine. One command switches your entire Docker CLI to target a different server. No SSH sessions, no config file editing, no mistakes from running commands on the wrong host.

## What Is a Docker Context?

A Docker context is a named configuration that tells the Docker CLI where to send commands. By default, you have one context called `default` that points to your local Docker daemon. You can create additional contexts that point to remote Docker hosts over SSH or TCP.

```bash
# List all contexts
docker context ls

# Output:
# NAME       DESCRIPTION                               DOCKER ENDPOINT
# default *  Current DOCKER_HOST based config           unix:///var/run/docker.sock
```

The asterisk marks the currently active context.

## Creating a Context for a Remote Host

The most common setup uses SSH to connect to a remote Docker host.

### SSH Context

```bash
# Create a context that connects to a remote server over SSH
docker context create production \
  --docker "host=ssh://deploy@production-server.example.com"

# Create a context with a specific SSH key
docker context create staging \
  --docker "host=ssh://deploy@staging-server.example.com" \
  --description "Staging environment"
```

This requires:
- SSH access to the remote server
- Docker installed on the remote server
- Your user being in the `docker` group on the remote server (or using sudo)

```bash
# Verify the connection works
docker context use production
docker info
```

### TCP Context

For Docker daemons exposed over TCP (with TLS), create a TCP context.

```bash
# Create a TCP context with TLS
docker context create secure-remote \
  --docker "host=tcp://docker-host.example.com:2376,ca=/path/to/ca.pem,cert=/path/to/cert.pem,key=/path/to/key.pem"
```

TCP connections should always use TLS. An unencrypted TCP connection to the Docker daemon is a serious security risk since anyone with network access can control your containers.

## Switching Between Contexts

There are two ways to switch contexts: persistently or per-command.

### Persistent Switch

```bash
# Switch to the production context (persists across commands)
docker context use production

# Now all docker commands target the production server
docker ps
docker images
docker compose up -d

# Switch back to local
docker context use default
```

### Per-Command Override

Use the `--context` flag to target a specific host for a single command without switching.

```bash
# Run a command against production without switching context
docker --context production ps

# Check images on staging
docker --context staging images

# Deploy to production while staying in local context
docker --context production compose up -d
```

### Environment Variable Override

The `DOCKER_CONTEXT` environment variable overrides the active context.

```bash
# Set context via environment variable
export DOCKER_CONTEXT=production
docker ps  # Runs against production

# Unset to go back to the active context
unset DOCKER_CONTEXT
```

You can also use the classic `DOCKER_HOST` variable, which takes precedence over everything.

```bash
# Direct host override (highest priority)
DOCKER_HOST=ssh://deploy@prod-server docker ps
```

## Managing Multiple Environments

Here is a typical setup for managing development, staging, and production environments.

```bash
# Create contexts for each environment
docker context create dev \
  --docker "host=unix:///var/run/docker.sock" \
  --description "Local development"

docker context create staging \
  --docker "host=ssh://deploy@staging.example.com" \
  --description "Staging environment"

docker context create production \
  --docker "host=ssh://deploy@prod.example.com" \
  --description "Production environment"

docker context create monitoring \
  --docker "host=ssh://admin@monitoring.example.com" \
  --description "Monitoring infrastructure"
```

```bash
# List all contexts with descriptions
docker context ls

# Output:
# NAME          DESCRIPTION                 DOCKER ENDPOINT
# default *     Current DOCKER_HOST         unix:///var/run/docker.sock
# dev           Local development           unix:///var/run/docker.sock
# staging       Staging environment         ssh://deploy@staging.example.com
# production    Production environment      ssh://deploy@prod.example.com
# monitoring    Monitoring infrastructure   ssh://admin@monitoring.example.com
```

## Practical Workflows

### Deploying Across Environments

```bash
# Deploy to staging first
docker --context staging compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Verify staging is working
docker --context staging compose ps
docker --context staging compose logs --tail 20 api

# Deploy to production
docker --context production compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Verify production
docker --context production compose ps
```

### Comparing Environments

```bash
# Compare running containers across environments
echo "=== STAGING ==="
docker --context staging ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo "=== PRODUCTION ==="
docker --context production ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

### Quick Health Check Across All Hosts

```bash
#!/bin/bash
# multi-host-check.sh - Check Docker health across all contexts

for ctx in $(docker context ls --format '{{.Name}}'); do
  echo "=== $ctx ==="
  docker --context "$ctx" info --format 'Version: {{.ServerVersion}} | Containers: {{.Containers}} (Running: {{.ContainersRunning}})' 2>/dev/null || echo "  UNREACHABLE"
  echo ""
done
```

### Pulling Logs from Remote Services

```bash
# View logs from a production service
docker --context production logs --tail 100 -f myapp-api-1

# View logs from multiple environments simultaneously (in separate terminals)
docker --context staging logs -f api &
docker --context production logs -f api &
```

## SSH Configuration for Contexts

SSH contexts use your local SSH configuration. Optimize it for Docker context usage.

```
# ~/.ssh/config - Optimized for Docker contexts

Host staging.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_key
    StrictHostKeyChecking no
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 600

Host prod.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_key
    StrictHostKeyChecking no
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 600
```

The `ControlMaster` and `ControlPersist` settings are important. They keep SSH connections open and reuse them for subsequent Docker commands, which dramatically reduces latency. Without connection multiplexing, every Docker command opens a new SSH connection.

```bash
# Create the sockets directory
mkdir -p ~/.ssh/sockets
```

## Updating and Removing Contexts

```bash
# Update an existing context
docker context update production \
  --docker "host=ssh://deploy@new-prod-server.example.com" \
  --description "Production (new server)"

# Remove a context you no longer need
docker context rm old-staging

# You cannot remove the currently active context
docker context use default
docker context rm production
```

## Context with Docker Compose

Docker Compose respects the active context. You can deploy the same Compose file to different environments.

```bash
# Deploy to staging
docker context use staging
docker compose up -d

# Deploy to production
docker context use production
docker compose up -d

# Or use per-command context
docker --context staging compose up -d
docker --context production compose up -d
```

## Exporting and Sharing Contexts

You can export a context to share it with team members.

```bash
# Export a context to a file
docker context export production production-context.dockercontext

# Import on another machine
docker context import production production-context.dockercontext
```

Note that SSH contexts do not include SSH keys. The importing machine still needs its own SSH key configured for access to the remote host.

## Security Considerations

**SSH contexts are the safest option.** They use your existing SSH infrastructure with all its authentication and encryption.

**TCP contexts require TLS.** Never expose the Docker daemon on an unencrypted TCP port. Anyone with network access to that port has full root access to the host.

**Context files contain connection details.** Do not commit context export files to version control if they contain sensitive endpoint information.

```bash
# Verify your contexts are using secure connections
docker context ls --format '{{.Name}}: {{.DockerEndpoint}}'
```

**Limit remote user permissions.** The SSH user for Docker contexts should only have Docker group membership, not full sudo access.

## Troubleshooting

```bash
# Test SSH connectivity to a context's host
ssh deploy@production-server.example.com docker version

# Check if the Docker socket is accessible to your user
ssh deploy@production-server.example.com ls -la /var/run/docker.sock

# Debug SSH connection issues
ssh -v deploy@production-server.example.com

# Verify context configuration
docker context inspect production
```

Common issues:
- **Permission denied** - User is not in the docker group on the remote host
- **Connection refused** - Docker is not running on the remote host, or SSH is not accessible
- **Timeout** - Firewall blocking SSH, or server is unreachable

Docker contexts transform how you manage multi-host environments. Instead of juggling SSH sessions and remembering which terminal is connected to which server, you switch contexts with a single command and operate every host from your local machine. Set up contexts for each environment, configure SSH multiplexing for speed, and your multi-host Docker management becomes as simple as working locally.

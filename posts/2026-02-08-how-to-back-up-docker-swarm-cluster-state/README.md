# How to Back Up Docker Swarm Cluster State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Backup, Cluster State, Disaster Recovery, Raft, DevOps

Description: Back up and restore Docker Swarm cluster state including Raft logs, service definitions, secrets, configs, and network configurations.

---

Docker Swarm stores its cluster state in a distributed Raft log replicated across all manager nodes. This state includes service definitions, secrets, configs, network configurations, and node membership. Losing this state means losing your entire orchestration layer. You would have to recreate every service, secret, and config from scratch.

Backing up Swarm state is different from backing up application data. This guide covers the specific procedures for protecting your Swarm cluster state and recovering from various failure scenarios.

## What Swarm State Contains

The Swarm state stored in the Raft log includes:

- Service definitions (image, replicas, constraints, environment variables)
- Docker secrets (encrypted at rest)
- Docker configs
- Overlay network definitions
- Node membership and roles
- Task assignments
- Certificate authority data for mTLS between nodes

This state lives at `/var/lib/docker/swarm/` on every manager node. The Raft consensus protocol keeps it synchronized across managers.

## Backing Up the Raft State

The most reliable way to back up Swarm state is to copy the Raft data directory from a manager node.

Back up the Swarm Raft state from a manager node:

```bash
#!/bin/bash
# backup-swarm-state.sh
# Backs up the Docker Swarm Raft state directory

BACKUP_DIR="/backups/swarm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Stop Docker to ensure a consistent snapshot of the Raft state
echo "Stopping Docker daemon for consistent backup..."
sudo systemctl stop docker

# Back up the entire Swarm directory
sudo tar czf "${BACKUP_DIR}/swarm_state_${TIMESTAMP}.tar.gz" \
  -C /var/lib/docker swarm

# Restart Docker
echo "Restarting Docker daemon..."
sudo systemctl start docker

# Wait for the node to rejoin the cluster
echo "Waiting for node to rejoin cluster..."
sleep 15

# Verify the node is healthy
docker node ls

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/swarm_state_${TIMESTAMP}.tar.gz" | cut -f1)
echo "Backup complete: ${BACKUP_DIR}/swarm_state_${TIMESTAMP}.tar.gz ($BACKUP_SIZE)"
```

Stopping Docker is important because the Raft database can be inconsistent if backed up while Docker is writing to it. On a multi-manager cluster, the other managers maintain quorum during the brief downtime.

## Non-Disruptive Backup Method

If you cannot tolerate stopping Docker, drain the manager node first so it stops accepting work, then back up.

Back up Swarm state without stopping Docker using a drain approach:

```bash
#!/bin/bash
# backup-swarm-nondisruptive.sh
# Backs up Swarm state without stopping Docker by draining the node first

BACKUP_DIR="/backups/swarm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
NODE_ID=$(docker info --format '{{.Swarm.NodeID}}')
HOSTNAME=$(hostname)

mkdir -p "$BACKUP_DIR"

echo "Draining node $HOSTNAME to minimize write activity..."
docker node update --availability drain "$NODE_ID"

# Wait for tasks to migrate
sleep 30

# Lock the Swarm to create a consistent snapshot
echo "Creating backup..."
sudo tar czf "${BACKUP_DIR}/swarm_state_${TIMESTAMP}.tar.gz" \
  -C /var/lib/docker swarm

# Restore node availability
echo "Restoring node availability..."
docker node update --availability active "$NODE_ID"

echo "Backup saved to ${BACKUP_DIR}/swarm_state_${TIMESTAMP}.tar.gz"
```

## Exporting Service Definitions

Beyond the Raft state, export human-readable service definitions for quick manual recovery.

Export all Swarm service definitions in a recoverable format:

```bash
#!/bin/bash
# export-swarm-services.sh
# Exports all service definitions as docker service create commands

BACKUP_DIR="/backups/swarm/services"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

echo "Exporting service definitions..."

for SERVICE in $(docker service ls --format '{{.Name}}'); do
  echo "  Exporting: $SERVICE"

  # Save full service inspection
  docker service inspect "$SERVICE" > \
    "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.json"

  # Generate a recreate script
  IMAGE=$(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$SERVICE")
  REPLICAS=$(docker service inspect --format '{{.Spec.Mode.Replicated.Replicas}}' "$SERVICE" 2>/dev/null || echo "global")

  echo "# Recreate service: $SERVICE" > "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh"
  echo "docker service create \\" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh"
  echo "  --name $SERVICE \\" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh"

  if [ "$REPLICAS" != "global" ] && [ -n "$REPLICAS" ]; then
    echo "  --replicas $REPLICAS \\" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh"
  fi

  # Export published ports
  docker service inspect --format '{{range .Endpoint.Spec.Ports}}  --publish {{.PublishedPort}}:{{.TargetPort}} \\
{{end}}' "$SERVICE" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh" 2>/dev/null

  # Export environment variables
  docker service inspect --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}  -e {{.}} \\
{{end}}' "$SERVICE" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh" 2>/dev/null

  # Export mounts
  docker service inspect --format '{{range .Spec.TaskTemplate.ContainerSpec.Mounts}}  --mount type={{.Type}},source={{.Source}},target={{.Target}} \\
{{end}}' "$SERVICE" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh" 2>/dev/null

  # Export networks
  docker service inspect --format '{{range .Spec.TaskTemplate.Networks}}  --network {{.Target}} \\
{{end}}' "$SERVICE" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh" 2>/dev/null

  echo "  $IMAGE" >> "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh"

  chmod +x "${BACKUP_DIR}/${TIMESTAMP}/${SERVICE}.sh"
done

echo "Service definitions exported to ${BACKUP_DIR}/${TIMESTAMP}"
```

## Backing Up Secrets and Configs

Docker secrets and configs are part of the Raft state, so they are included in the Raft backup. However, you should also maintain separate records of them since secrets cannot be read back from the Swarm.

Export the list of secrets and configs (names only - values are encrypted):

```bash
#!/bin/bash
# export-swarm-secrets-list.sh
# Exports the names and metadata of all Swarm secrets and configs

BACKUP_DIR="/backups/swarm/secrets"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

echo "Exporting secret metadata..."
docker secret ls --format '{{.Name}}' > "${BACKUP_DIR}/${TIMESTAMP}/secret_names.txt"

for SECRET in $(docker secret ls --format '{{.Name}}'); do
  docker secret inspect "$SECRET" > "${BACKUP_DIR}/${TIMESTAMP}/secret_${SECRET}.json"
done

echo "Exporting config metadata..."
docker config ls --format '{{.Name}}' > "${BACKUP_DIR}/${TIMESTAMP}/config_names.txt"

for CONFIG in $(docker config ls --format '{{.Name}}'); do
  docker config inspect "$CONFIG" > "${BACKUP_DIR}/${TIMESTAMP}/config_${CONFIG}.json"
done

echo "Metadata exported to ${BACKUP_DIR}/${TIMESTAMP}"
echo ""
echo "IMPORTANT: Secret values are NOT exported (they are encrypted in the Raft state)."
echo "Maintain a separate secure vault with the actual secret values."
```

Keep a copy of your actual secret values in a secure vault (like HashiCorp Vault, AWS Secrets Manager, or an encrypted file). The Swarm backup contains the encrypted secrets, but having a separate copy makes manual recovery easier.

## Backing Up Network Configurations

Export overlay network definitions for manual recreation if needed:

```bash
#!/bin/bash
# export-swarm-networks.sh
# Exports Swarm overlay network configurations

BACKUP_DIR="/backups/swarm/networks"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

for NETWORK in $(docker network ls --filter driver=overlay --format '{{.Name}}'); do
  # Skip built-in networks
  if [ "$NETWORK" = "ingress" ] || [ "$NETWORK" = "docker_gwbridge" ]; then
    continue
  fi

  echo "Exporting network: $NETWORK"
  docker network inspect "$NETWORK" > "${BACKUP_DIR}/${TIMESTAMP}/${NETWORK}.json"

  # Generate recreate command
  SUBNET=$(docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' "$NETWORK")
  ENCRYPTED=$(docker network inspect --format '{{index .Options "encrypted"}}' "$NETWORK")

  CMD="docker network create --driver overlay"
  [ "$ENCRYPTED" = "true" ] && CMD="$CMD --opt encrypted"
  [ -n "$SUBNET" ] && CMD="$CMD --subnet $SUBNET"
  CMD="$CMD $NETWORK"

  echo "$CMD" > "${BACKUP_DIR}/${TIMESTAMP}/${NETWORK}_recreate.sh"
  chmod +x "${BACKUP_DIR}/${TIMESTAMP}/${NETWORK}_recreate.sh"
done

echo "Network configurations exported to ${BACKUP_DIR}/${TIMESTAMP}"
```

## Complete Swarm Backup Script

Combine all backup procedures into a single comprehensive script:

```bash
#!/bin/bash
# full-swarm-backup.sh
# Complete backup of Docker Swarm cluster state

set -euo pipefail

BACKUP_ROOT="/backups/swarm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "=============================="
echo "Docker Swarm Full Backup"
echo "Started: $(date)"
echo "=============================="

# 1. Verify this is a manager node
ROLE=$(docker info --format '{{.Swarm.ControlAvailable}}')
if [ "$ROLE" != "true" ]; then
  echo "ERROR: This script must run on a Swarm manager node"
  exit 1
fi

# 2. Export service definitions
echo ""
echo "--- Exporting service definitions ---"
mkdir -p "${BACKUP_DIR}/services"
for SERVICE in $(docker service ls --format '{{.Name}}'); do
  docker service inspect "$SERVICE" > "${BACKUP_DIR}/services/${SERVICE}.json"
  echo "  Exported: $SERVICE"
done

# 3. Export secrets and configs metadata
echo ""
echo "--- Exporting secrets and configs ---"
mkdir -p "${BACKUP_DIR}/secrets"
docker secret ls --format json > "${BACKUP_DIR}/secrets/list.json" 2>/dev/null || true
docker config ls --format json > "${BACKUP_DIR}/secrets/configs.json" 2>/dev/null || true

# 4. Export network definitions
echo ""
echo "--- Exporting network definitions ---"
mkdir -p "${BACKUP_DIR}/networks"
for NETWORK in $(docker network ls --filter driver=overlay --format '{{.Name}}'); do
  docker network inspect "$NETWORK" > "${BACKUP_DIR}/networks/${NETWORK}.json"
  echo "  Exported: $NETWORK"
done

# 5. Export node information
echo ""
echo "--- Exporting node information ---"
mkdir -p "${BACKUP_DIR}/nodes"
docker node ls --format json > "${BACKUP_DIR}/nodes/list.json"
for NODE in $(docker node ls --format '{{.ID}}'); do
  docker node inspect "$NODE" > "${BACKUP_DIR}/nodes/${NODE}.json"
done

# 6. Back up Raft state
echo ""
echo "--- Backing up Raft state ---"
NODE_ID=$(docker info --format '{{.Swarm.NodeID}}')

# Drain node to reduce write activity
docker node update --availability drain "$NODE_ID"
sleep 15

# Create the backup
sudo tar czf "${BACKUP_DIR}/raft_state.tar.gz" -C /var/lib/docker swarm

# Restore node
docker node update --availability active "$NODE_ID"

# 7. Create final archive
echo ""
echo "--- Creating final archive ---"
ARCHIVE="${BACKUP_ROOT}/swarm_backup_${TIMESTAMP}.tar.gz"
tar czf "$ARCHIVE" -C "$BACKUP_ROOT" "$TIMESTAMP"
rm -rf "$BACKUP_DIR"

# 8. Clean up old backups
find "$BACKUP_ROOT" -name "swarm_backup_*.tar.gz" -mtime +14 -delete

ARCHIVE_SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo ""
echo "=============================="
echo "Backup complete: $ARCHIVE ($ARCHIVE_SIZE)"
echo "Finished: $(date)"
echo "=============================="
```

## Restoring from Backup

### Scenario 1: Restoring a Single Manager

If one manager fails but others are healthy, simply add a new manager to the cluster.

```bash
# On a new machine, join the existing cluster
docker swarm join --token <manager-token> <existing-manager-ip>:2377
```

### Scenario 2: Catastrophic Failure - All Managers Lost

When all managers fail, restore from the Raft state backup.

Restore Swarm cluster state from a Raft backup:

```bash
#!/bin/bash
# restore-swarm.sh
# Restores Swarm cluster state from a Raft backup

ARCHIVE="$1"

if [ -z "$ARCHIVE" ]; then
  echo "Usage: ./restore-swarm.sh <swarm_backup.tar.gz>"
  exit 1
fi

echo "Restoring Swarm state from $ARCHIVE"

# Stop Docker
sudo systemctl stop docker

# Extract the backup
TEMP_DIR=$(mktemp -d)
tar xzf "$ARCHIVE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR" | head -1)

# Remove existing Swarm state
sudo rm -rf /var/lib/docker/swarm

# Restore the Raft state
sudo tar xzf "${TEMP_DIR}/${BACKUP_DIR}/raft_state.tar.gz" -C /var/lib/docker

# Start Docker with force-new-cluster to initialize from the backup
sudo dockerd --force-new-cluster &
sleep 15

# Verify services are restored
docker service ls

echo "Swarm state restored. Re-join worker nodes using the new join token."
docker swarm join-token worker

# Stop the manual dockerd and restart normally
kill %1
sudo systemctl start docker
```

The `--force-new-cluster` flag tells Docker to create a new single-node cluster from the existing Raft state. After this, re-join your worker and manager nodes using the new join tokens.

### Scenario 3: Manual Recreation

If the Raft backup is corrupted, use the exported service definitions to manually recreate services.

```bash
#!/bin/bash
# recreate-services.sh
# Recreates Swarm services from exported JSON definitions

SERVICE_DIR="/backups/swarm/services"

# Initialize a new Swarm
docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')

# Recreate networks first
for NETWORK_FILE in /backups/swarm/networks/*.sh; do
  if [ -f "$NETWORK_FILE" ]; then
    echo "Recreating network from $NETWORK_FILE"
    bash "$NETWORK_FILE"
  fi
done

# Recreate services
for SERVICE_FILE in "${SERVICE_DIR}"/*.sh; do
  if [ -f "$SERVICE_FILE" ]; then
    echo "Recreating service from $SERVICE_FILE"
    bash "$SERVICE_FILE"
  fi
done
```

## Backup Schedule Recommendations

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| Raft state | Daily | 14 days |
| Service definitions | After every deployment | 30 days |
| Secrets metadata | Weekly | 30 days |
| Network definitions | Weekly | 30 days |
| Full backup | Daily | 14 days |

## Conclusion

Docker Swarm cluster state is the blueprint for your entire orchestration layer. Back up the Raft state directory regularly, export human-readable service definitions after every deployment, and keep your secrets stored in a separate vault. Test your restoration procedure at least quarterly. The combination of Raft backups for fast recovery and exported definitions for manual recreation gives you multiple paths to recover from any failure scenario. Remember that worker nodes are stateless from the Swarm perspective, so focus your backup efforts on the manager nodes.

# How to deploy Vault on Kubernetes with HA architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Kubernetes, High Availability, Secrets Management, Raft

Description: Learn how to deploy HashiCorp Vault on Kubernetes with high availability architecture using Raft storage backend for production-grade secret management.

---

HashiCorp Vault provides secure storage and access to secrets, but running it in production requires high availability to eliminate single points of failure. This guide walks through deploying Vault on Kubernetes with HA configuration, ensuring your secrets remain accessible even when nodes fail.

## Understanding Vault HA Architecture

Vault HA uses a cluster of Vault servers with one active node and multiple standby nodes. The active node handles all requests while standbys replicate data and stand ready to take over. When the active node fails, a standby automatically becomes active through leader election.

Vault supports multiple storage backends for HA, but Raft integrated storage is the recommended approach as it eliminates external dependencies like Consul or etcd.

## Prerequisites and Planning

Before deploying, plan your architecture:

```bash
# Create namespace for Vault
kubectl create namespace vault

# Decide on:
# - Number of Vault replicas (3 or 5 recommended)
# - Storage class for persistent volumes
# - TLS certificate strategy
# - Auto-unsealing method (covered in another guide)

# Check available storage classes
kubectl get storageclass
```

## Deploying Vault with Helm

Use the official Vault Helm chart for HA deployment:

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Create values file for HA configuration
cat > vault-values.yaml <<EOF
server:
  # Enable HA mode
  ha:
    enabled: true
    replicas: 3

    # Use Raft for integrated storage
    raft:
      enabled: true
      setNodeId: true

      config: |
        ui = true

        listener "tcp" {
          tls_disable = 1
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }

        storage "raft" {
          path = "/vault/data"

          retry_join {
            leader_api_addr = "http://vault-0.vault-internal:8200"
          }

          retry_join {
            leader_api_addr = "http://vault-1.vault-internal:8200"
          }

          retry_join {
            leader_api_addr = "http://vault-2.vault-internal:8200"
          }
        }

        service_registration "kubernetes" {}

  # Resource requests and limits
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

  # Data storage
  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: standard
    accessMode: ReadWriteOnce

  # Audit storage
  auditStorage:
    enabled: true
    size: 10Gi
    storageClass: standard
    accessMode: ReadWriteOnce

# UI service
ui:
  enabled: true
  serviceType: ClusterIP

# Injector for sidecar injection
injector:
  enabled: true
  replicas: 1
EOF

# Install Vault
helm install vault hashicorp/vault \
  --namespace vault \
  --values vault-values.yaml

# Wait for pods to be ready
kubectl -n vault get pods -w
```

## Initializing the Vault Cluster

After deployment, initialize the Vault cluster:

```bash
# Initialize Vault on the first pod
kubectl -n vault exec -it vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json

# CRITICAL: Save this output securely!
# It contains unseal keys and root token

# Extract unseal keys and root token
UNSEAL_KEY_1=$(cat vault-init.json | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(cat vault-init.json | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(cat vault-init.json | jq -r '.unseal_keys_b64[2]')
ROOT_TOKEN=$(cat vault-init.json | jq -r '.root_token')

# Store these in a secure location (not in version control!)
echo "Store unseal keys and root token in secure vault/password manager"
```

## Unsealing Vault Nodes

Each Vault node must be unsealed after initialization or restart:

```bash
# Unseal vault-0
kubectl -n vault exec -it vault-0 -- vault operator unseal $UNSEAL_KEY_1
kubectl -n vault exec -it vault-0 -- vault operator unseal $UNSEAL_KEY_2
kubectl -n vault exec -it vault-0 -- vault operator unseal $UNSEAL_KEY_3

# Check status
kubectl -n vault exec -it vault-0 -- vault status

# Unseal remaining nodes
for pod in vault-1 vault-2; do
  echo "Unsealing $pod"
  kubectl -n vault exec -it $pod -- vault operator unseal $UNSEAL_KEY_1
  kubectl -n vault exec -it $pod -- vault operator unseal $UNSEAL_KEY_2
  kubectl -n vault exec -it $pod -- vault operator unseal $UNSEAL_KEY_3
done
```

## Joining Nodes to Raft Cluster

After unsealing, join standby nodes to the cluster:

```bash
# vault-1 and vault-2 should auto-join via retry_join
# Verify cluster status
kubectl -n vault exec -it vault-0 -- vault operator raft list-peers

# Output should show all three nodes:
# Node       Address               State       Voter
# ----       -------               -----       -----
# vault-0    vault-0.vault-internal:8201    leader      true
# vault-1    vault-1.vault-internal:8201    follower    true
# vault-2    vault-2.vault-internal:8201    follower    true
```

If nodes don't auto-join:

```bash
# Manually join from each standby
kubectl -n vault exec -it vault-1 -- \
  vault operator raft join http://vault-0.vault-internal:8200

kubectl -n vault exec -it vault-2 -- \
  vault operator raft join http://vault-0.vault-internal:8200
```

## Configuring Services for HA Access

Create services for accessing Vault:

```yaml
# vault-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: vault
  namespace: vault
  labels:
    app.kubernetes.io/name: vault
spec:
  selector:
    app.kubernetes.io/name: vault
    component: server
  ports:
  - name: http
    port: 8200
    targetPort: 8200
  - name: internal
    port: 8201
    targetPort: 8201
  publishNotReadyAddresses: true
---
apiVersion: v1
kind: Service
metadata:
  name: vault-internal
  namespace: vault
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: vault
    component: server
  ports:
  - name: http
    port: 8200
    targetPort: 8200
  - name: internal
    port: 8201
    targetPort: 8201
  publishNotReadyAddresses: true
---
apiVersion: v1
kind: Service
metadata:
  name: vault-active
  namespace: vault
spec:
  selector:
    app.kubernetes.io/name: vault
    component: server
    vault-active: "true"
  ports:
  - name: http
    port: 8200
    targetPort: 8200
  - name: internal
    port: 8201
    targetPort: 8201
```

```bash
kubectl apply -f vault-services.yaml
```

The vault-active service automatically routes to the active Vault node.

## Testing HA Functionality

Verify failover works correctly:

```bash
# Identify the active node
for pod in vault-0 vault-1 vault-2; do
  echo -n "$pod: "
  kubectl -n vault exec $pod -- vault status -format=json 2>/dev/null | \
    jq -r '.ha_enabled, .is_self'
done

# Write a test secret to active node
kubectl -n vault exec -it vault-0 -- vault login $ROOT_TOKEN
kubectl -n vault exec -it vault-0 -- \
  vault kv put secret/test-ha value=testing

# Read from standby (should work)
kubectl -n vault exec -it vault-1 -- vault login $ROOT_TOKEN
kubectl -n vault exec -it vault-1 -- vault kv get secret/test-ha

# Simulate active node failure
kubectl -n vault delete pod vault-0

# Watch for new leader election
kubectl -n vault exec -it vault-1 -- vault status

# Verify data is still accessible
kubectl -n vault exec -it vault-1 -- vault kv get secret/test-ha
```

## Monitoring Vault HA Status

Create a monitoring script:

```bash
#!/bin/bash
# vault-ha-status.sh

echo "=== Vault HA Cluster Status ==="
echo "Timestamp: $(date)"
echo

for pod in vault-0 vault-1 vault-2; do
  echo "--- $pod ---"

  # Check if pod exists and is running
  if ! kubectl -n vault get pod $pod &>/dev/null; then
    echo "Pod not found"
    continue
  fi

  # Get Vault status
  STATUS=$(kubectl -n vault exec $pod -- vault status -format=json 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "Cannot get status (likely sealed)"
    continue
  fi

  SEALED=$(echo $STATUS | jq -r '.sealed')
  HA_ENABLED=$(echo $STATUS | jq -r '.ha_enabled')
  IS_LEADER=$(echo $STATUS | jq -r '.is_self')

  echo "Sealed: $SEALED"
  echo "HA Enabled: $HA_ENABLED"

  if [ "$HA_ENABLED" = "true" ]; then
    echo "Leader: $IS_LEADER"
  fi

  echo
done

# Show Raft peers
echo "=== Raft Cluster Members ==="
kubectl -n vault exec vault-0 -- vault operator raft list-peers 2>/dev/null || \
  echo "Unable to list peers (check if cluster is unsealed)"
```

Make it executable and run:

```bash
chmod +x vault-ha-status.sh
./vault-ha-status.sh
```

## Configuring Health Checks

Add liveness and readiness probes:

```yaml
# Already included in Helm chart, but for reference:
livenessProbe:
  httpGet:
    path: /v1/sys/health?standbyok=true&sealedcode=204&uninitcode=204
    port: 8200
  initialDelaySeconds: 60
  periodSeconds: 5
  successThreshold: 1
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /v1/sys/health?standbyok=true&sealedcode=204&uninitcode=204
    port: 8200
  initialDelaySeconds: 10
  periodSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

## Backing Up Vault Data

Create regular backups of Raft storage:

```bash
#!/bin/bash
# vault-backup.sh

BACKUP_DIR="/backups/vault"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vault-snapshot-$TIMESTAMP.snap"

mkdir -p $BACKUP_DIR

# Take snapshot from active node
kubectl -n vault exec vault-0 -- vault operator raft snapshot save /tmp/snapshot.snap

# Copy snapshot from pod
kubectl -n vault cp vault-0:/tmp/snapshot.snap $BACKUP_FILE

# Clean up
kubectl -n vault exec vault-0 -- rm /tmp/snapshot.snap

# Verify snapshot
if [ -f "$BACKUP_FILE" ]; then
  echo "Backup successful: $BACKUP_FILE"
  ls -lh $BACKUP_FILE
else
  echo "Backup failed!"
  exit 1
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "vault-snapshot-*.snap" -mtime +7 -delete
```

Schedule with CronJob:

```yaml
# vault-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-backup
  namespace: vault
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: hashicorp/vault:latest
            env:
            - name: VAULT_ADDR
              value: "http://vault:8200"
            - name: VAULT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: vault-backup-token
                  key: token
            command:
            - /bin/sh
            - -c
            - |
              vault operator raft snapshot save /backup/snapshot-$(date +%Y%m%d-%H%M%S).snap
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: vault-backup-pvc
          restartPolicy: OnFailure
```

## Scaling the Cluster

To add more nodes:

```bash
# Update replica count
helm upgrade vault hashicorp/vault \
  --namespace vault \
  --reuse-values \
  --set server.ha.replicas=5

# Unseal new nodes
kubectl -n vault exec -it vault-3 -- vault operator unseal $UNSEAL_KEY_1
kubectl -n vault exec -it vault-3 -- vault operator unseal $UNSEAL_KEY_2
kubectl -n vault exec -it vault-3 -- vault operator unseal $UNSEAL_KEY_3

# Verify they joined the cluster
kubectl -n vault exec vault-0 -- vault operator raft list-peers
```

## Performance Tuning

Optimize Vault performance for HA:

```yaml
# In vault-values.yaml
server:
  ha:
    raft:
      config: |
        # ... previous config ...

        # Performance tuning
        max_entry_size = 1048576
        autopilot {
          cleanup_dead_servers = true
          last_contact_threshold = "10s"
          max_trailing_logs = 1000
        }
```

Deploying Vault with high availability on Kubernetes ensures your secrets management system remains operational during node failures, maintenance, and scaling events. The Raft integrated storage eliminates external dependencies while providing strong consistency and automatic leader election. Combined with proper monitoring and backup procedures, this setup provides production-grade secret management for your Kubernetes workloads.

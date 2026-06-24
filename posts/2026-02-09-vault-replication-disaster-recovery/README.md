# How to configure Vault replication for disaster recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Disaster Recovery, Replication, High Availability, Business Continuity

Description: Learn how to implement Vault disaster recovery replication to ensure business continuity and protect against data center failures in Kubernetes environments.

---

Disaster recovery protects against catastrophic data center failures. Vault Enterprise provides disaster recovery replication, maintaining a standby cluster that can take over if the primary cluster fails. This guide shows you how to configure and manage DR replication for Vault on Kubernetes.

## Understanding Vault DR Replication

DR replication maintains a read-only standby Vault cluster that can be promoted to primary during disasters. Unlike HA which operates within a cluster, DR replication works across geographically separated clusters. The standby cluster receives all data from primary but serves no requests until promoted.

Key concepts include primary cluster (serves all requests), secondary cluster (receives replication stream), promotion (making secondary the new primary), and demotion (reverting primary to standby).

Note that DR replication is a Vault Enterprise feature.

## Prerequisites and Planning

Before implementing DR replication:

```bash
# Verify Vault Enterprise is installed

vault version
# Should show: Vault v1.x.x+ent

# Ensure both clusters are accessible
kubectl --context=primary -n vault get pods
kubectl --context=secondary -n vault get pods

# Network connectivity from secondary to the primary cluster port
kubectl --context=secondary -n vault exec vault-0 -- \
  nc -zv vault.primary-cluster.com 8201

# Both clusters should run the same Vault version
```

## Enabling DR Replication on Primary

Configure the primary cluster:

```bash
# Set context to primary cluster
export VAULT_ADDR='https://vault.primary.company.com:8200'
vault login

# Enable DR primary
vault write -f sys/replication/dr/primary/enable

# Verify replication status
vault read sys/replication/dr/status

# Output shows:
# mode: primary
# state: running
```

## Generating Secondary Token

Create activation token for secondary:

```bash
# On primary, generate secondary token
vault write sys/replication/dr/primary/secondary-token \
  id="secondary-cluster" \
  ttl="24h"

# Output provides a wrapped activation token:
# Key                              Value
# ---                              -----
# wrapping_token:                  eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Store this wrapping_token securely for secondary activation
```

## Activating Secondary Cluster

Configure the secondary cluster:

```bash
# Set context to secondary cluster
export VAULT_ADDR='https://vault.secondary.company.com:8200'
vault login

# Enable DR secondary with the wrapping_token from primary
vault write sys/replication/dr/secondary/enable \
  primary_api_addr="https://vault.primary.company.com:8200" \
  token="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Wait for initial sync
vault read sys/replication/dr/status

# When ready, output shows:
# mode: secondary
# state: stream-wals
```

## Monitoring Replication Health

Track replication status:

```bash
# On primary, check replication metrics
vault read sys/replication/dr/status

# Key fields:
# - last_wal: last WAL index written locally
# - last_dr_wal: last DR WAL shipped to a secondary
# - merkle_root: data consistency hash
# - secondaries[].connection_status: connected (healthy)

# On secondary, verify sync state
vault read sys/replication/dr/status

# Check lag time. Run the first command against the primary and the second
# command against the secondary.
PRIMARY_DR_WAL=$(VAULT_ADDR='https://vault.primary.company.com:8200' \
  vault read -field=last_dr_wal sys/replication/dr/status)
SECONDARY_REMOTE_WAL=$(VAULT_ADDR='https://vault.secondary.company.com:8200' \
  vault read -field=last_remote_wal sys/replication/dr/status)
REPLICATION_LAG=$((PRIMARY_DR_WAL - SECONDARY_REMOTE_WAL))
echo "Replication lag: $REPLICATION_LAG WAL entries"
```

## Configuring Automated Monitoring

Set up Prometheus alerts:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vault-dr-alerts
  namespace: vault
spec:
  groups:
  - name: vault-dr-replication
    interval: 30s
    rules:
    - alert: VaultDRReplicationWalBacklog
      expr: vault_replication_wal_last_dr_wal - vault_replication_fsm_last_remote_wal > 1000
      for: 5m
      annotations:
        summary: "Vault DR replication WAL backlog is high"
        description: "Secondary is more than 1000 WAL entries behind the primary"

    - alert: VaultDRWalPersistenceSlow
      expr: vault_wal_persistWALs_sum / vault_wal_persistWALs_count > 1000
      for: 10m
      annotations:
        summary: "Vault WAL persistence is slow"
        description: "Average WAL persistence latency is above 1000 ms"

    - alert: VaultDRMerkleSyncRunning
      expr: rate(vault_replication_merkleSync_count[10m]) > 0
      for: 5m
      annotations:
        summary: "Vault DR replication is using Merkle sync"
        description: "Merkle sync activity can indicate a secondary is catching up or unhealthy"
```

## Testing DR Failover

Practice failover procedures:

```bash
# 1. Verify secondary is synced
export VAULT_ADDR='https://vault.secondary.company.com:8200'
vault read sys/replication/dr/status

# 2. Promote secondary to primary
# WARNING: This makes secondary active
vault write sys/replication/dr/secondary/promote \
  dr_operation_token="<DR_OPERATION_TOKEN>"

# 3. Verify promotion
vault read sys/replication/dr/status
# mode: primary
# state: running

# 4. Update DNS/Load balancer to point to new primary

# 5. Applications reconnect to new primary

# 6. To revert (demote current primary back to secondary)
vault write -f sys/replication/dr/primary/demote

# 7. Generate a new secondary activation token on the new primary, then
# update the demoted secondary's assigned primary
```

## Automating Failover Detection

Create failover automation:

```yaml
# dr-failover-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: vault-dr-failover
  namespace: vault
spec:
  template:
    spec:
      serviceAccountName: vault-admin
      containers:
      - name: failover
        image: hashicorp/vault:latest
        env:
        - name: PRIMARY_ADDR
          value: "https://vault.primary.company.com:8200"
        - name: SECONDARY_ADDR
          value: "https://vault.secondary.company.com:8200"
        - name: DR_OPERATION_TOKEN
          valueFrom:
            secretKeyRef:
              name: vault-dr-operation-token
              key: token
        command:
        - /bin/sh
        - -c
        - |
          #!/bin/sh
          set -e

          # Check primary health
          if ! curl -sf "$PRIMARY_ADDR/v1/sys/health?standbyok=true&perfstandbyok=true"; then
            echo "Primary cluster is down, initiating failover"

            # Promote secondary with a pre-generated DR operation token
            VAULT_ADDR=$SECONDARY_ADDR vault write sys/replication/dr/secondary/promote \
              dr_operation_token="$DR_OPERATION_TOKEN"

            # Update load balancer/DNS (implementation specific)
            ./update-dns.sh

            echo "Failover complete, secondary promoted to primary"
          else
            echo "Primary cluster is healthy, no action needed"
          fi
      restartPolicy: Never
```

## Implementing Graceful Demotion

Safely demote primary for maintenance:

```bash
# 1. Stop new requests to primary (update load balancer)

# 2. Wait for inflight requests to complete
sleep 30

# 3. Demote primary to secondary
export VAULT_ADDR='https://vault.primary.company.com:8200'
vault write -f sys/replication/dr/primary/demote

# 4. Promote secondary to primary
export VAULT_ADDR='https://vault.secondary.company.com:8200'
vault write sys/replication/dr/secondary/promote \
  dr_operation_token="<DR_OPERATION_TOKEN>"

# 5. Update DNS to point to new primary

# 6. Perform maintenance on old primary

# 7. Generate a new secondary activation token on the new primary
vault write sys/replication/dr/primary/secondary-token id="original-primary"

# 8. Update the demoted cluster to follow the new primary
export VAULT_ADDR='https://vault.primary.company.com:8200'
vault write sys/replication/dr/secondary/update-primary \
  dr_operation_token="<DR_OPERATION_TOKEN>" \
  primary_api_addr="https://vault.secondary.company.com:8200" \
  token="<new-secondary-activation-token>"
```

## Handling Split-Brain Scenarios

Prevent split-brain issues:

```yaml
# vault-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: vault-replication-only
  namespace: vault
spec:
  podSelector:
    matchLabels:
      app: vault
  policyTypes:
  - Ingress
  ingress:
  # Allow replication from secondary cluster
  - from:
    - ipBlock:
        cidr: 10.100.0.0/16  # Secondary cluster CIDR
    ports:
    - protocol: TCP
      port: 8201  # Cluster port
```

Implement fencing:

```bash
# Fence old primary after failover
# This prevents split-brain if old primary comes back
vault write sys/replication/dr/primary/revoke-secondary \
  id="secondary-cluster"

# Or disable replication entirely on old primary
vault write -f sys/replication/dr/primary/disable
```

## Creating DR Runbooks

Document disaster recovery procedures:

```markdown
# Vault DR Failover Runbook

## Pre-requisites
- Access to both primary and secondary clusters
- Vault admin credentials and a DR operation token
- DNS/Load balancer access

## Detection
1. Monitor alerts for primary cluster failure
2. Verify primary is truly unavailable (not transient)
3. Check replication status on secondary

## Failover Steps
1. **Promote Secondary**
   ```
   export VAULT_ADDR='https://vault.secondary.company.com:8200'
   vault write sys/replication/dr/secondary/promote \
     dr_operation_token="<DR_OPERATION_TOKEN>"
   ```text

2. **Update DNS**
   - Change vault.company.com to point to secondary cluster
   - Wait for DNS propagation (typically 60 seconds)

3. **Verify Applications**
   - Check application logs for successful reconnection
   - Test secret access from sample application

4. **Notify Stakeholders**
   - Alert team that failover completed
   - Update status page

## Recovery Steps
1. **Bring Primary Back Online**
   - Fix issues causing primary failure
   - Verify cluster is healthy

2. **Decide on Failback**
   - Option A: Keep secondary as primary
   - Option B: Fail back to original primary

3. **If Failing Back**
   - Demote current primary (former secondary)
   - Promote original primary with a DR operation token
   - Update the assigned primary for any remaining secondaries
   - Update DNS back to original
```

## Testing DR Procedures

Regular DR testing schedule:

```bash
#!/bin/bash
# dr-test.sh

echo "=== Vault DR Test $(date) ==="

# 1. Verify replication health
echo "Checking replication status..."
PRIMARY_DR_WAL=$(VAULT_ADDR='https://vault.primary.company.com:8200' \
  vault read -field=last_dr_wal sys/replication/dr/status)
SECONDARY_REMOTE_WAL=$(VAULT_ADDR='https://vault.secondary.company.com:8200' \
  vault read -field=last_remote_wal sys/replication/dr/status)
echo "Replication lag: $((PRIMARY_DR_WAL - SECONDARY_REMOTE_WAL)) WAL entries"

# 2. Verify secondary streaming state
echo "Checking secondary streaming state..."
SECONDARY_STATE=$(VAULT_ADDR='https://vault.secondary.company.com:8200' \
  vault read -field=state sys/replication/dr/status)
echo "Secondary state: $SECONDARY_STATE"

# 3. Verify secondary connection to primary
CONNECTION_STATE=$(VAULT_ADDR='https://vault.secondary.company.com:8200' \
  vault read -field=connection_state sys/replication/dr/status)
echo "Connection state: $CONNECTION_STATE"

# 4. Test secondary health endpoint
echo "Testing secondary health endpoint..."
curl -sf "https://vault.secondary.company.com:8200/v1/sys/health?drsecondarycode=200"

# 5. Document results
echo "DR test completed successfully"
```

## Best Practices

Test DR failover procedures quarterly in non-production environments. Monitor replication lag continuously and alert on significant delays. Automate failover decision-making with strict health checks. Document runbooks with step-by-step procedures and emergency contacts. Implement circuit breakers to prevent split-brain scenarios. Keep both clusters at same Vault version. Use dedicated network links for replication traffic when possible. Store DR activation tokens securely with restricted access. Practice graceful demotion procedures during maintenance windows.

Vault DR replication ensures business continuity by maintaining a standby cluster ready to take over during disasters. By implementing automated monitoring, practicing failover procedures, and maintaining clear runbooks, you ensure your secret management infrastructure remains available even during major outages. This level of resilience is essential for production systems that depend on Vault for critical secret access.

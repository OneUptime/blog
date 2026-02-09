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

# Network connectivity between clusters
kubectl --context=primary -n vault exec vault-0 -- \
  nc -zv vault.secondary-cluster.com 8201

# Both clusters should have similar configuration
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
vault read sys/replication/status

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

# Output provides token:
# Key     Value
# ---     -----
# token   eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Store this token securely for secondary activation
```

## Activating Secondary Cluster

Configure the secondary cluster:

```bash
# Set context to secondary cluster
export VAULT_ADDR='https://vault.secondary.company.com:8200'
vault login

# Enable DR secondary with token from primary
vault write sys/replication/dr/secondary/enable \
  primary_api_addr="https://vault.primary.company.com:8200" \
  token="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Wait for initial sync
vault read sys/replication/status

# When ready, output shows:
# mode: secondary
# state: stream-wals
```

## Monitoring Replication Health

Track replication status:

```bash
# On primary, check replication metrics
vault read sys/replication/dr/status

# Key metrics:
# - last_wal: last WAL index replicated
# - merkle_root: data consistency hash
# - connection_state: stream-wals (healthy)

# On secondary, verify sync state
vault read sys/replication/dr/status

# Check lag time
# - last_remote_wal: primary's latest WAL
# - last_wal: secondary's latest received WAL

# Monitor replication lag
REPLICATION_LAG=$(($(vault read -field=last_remote_wal sys/replication/dr/status) - \
                    $(vault read -field=last_wal sys/replication/dr/status)))
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
    - alert: VaultDRReplicationDown
      expr: vault_replication_dr_primary_secondary_connections == 0
      for: 5m
      annotations:
        summary: "Vault DR replication connection lost"
        description: "No DR secondaries connected to primary"

    - alert: VaultDRReplicationLagging
      expr: vault_replication_dr_primary_wal_index - vault_replication_dr_secondary_wal_index > 1000
      for: 10m
      annotations:
        summary: "DR replication lagging behind primary"
        description: "Secondary is more than 1000 WAL entries behind"

    - alert: VaultDRSecondaryNotStreaming
      expr: vault_replication_dr_secondary_state != 2
      for: 5m
      annotations:
        summary: "DR secondary not in streaming state"
```

## Testing DR Failover

Practice failover procedures:

```bash
# 1. Verify secondary is synced
export VAULT_ADDR='https://vault.secondary.company.com:8200'
vault read sys/replication/dr/status

# 2. Promote secondary to primary
# WARNING: This makes secondary active
vault write -f sys/replication/dr/secondary/promote

# 3. Verify promotion
vault read sys/replication/dr/status
# mode: primary
# state: running

# 4. Update DNS/Load balancer to point to new primary

# 5. Applications reconnect to new primary

# 6. To revert (demote current primary back to secondary)
vault write sys/replication/dr/primary/demote

# 7. Re-enable replication in correct direction
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
        command:
        - /bin/sh
        - -c
        - |
          #!/bin/sh
          set -e

          # Check primary health
          if ! curl -sf $PRIMARY_ADDR/v1/sys/health; then
            echo "Primary cluster is down, initiating failover"

            # Authenticate to secondary
            VAULT_ADDR=$SECONDARY_ADDR
            VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
              role=admin jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token))
            export VAULT_TOKEN

            # Promote secondary
            vault write -f sys/replication/dr/secondary/promote

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
vault write sys/replication/dr/primary/demote

# 4. Promote secondary to primary
export VAULT_ADDR='https://vault.secondary.company.com:8200'
vault write -f sys/replication/dr/secondary/promote

# 5. Update DNS to point to new primary

# 6. Perform maintenance on old primary

# 7. Re-enable as secondary when maintenance complete
export VAULT_ADDR='https://vault.primary.company.com:8200'
vault write sys/replication/dr/secondary/enable \
  primary_api_addr="https://vault.secondary.company.com:8200" \
  token="<new-secondary-token>"
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
vault write sys/replication/dr/primary/secondary-token/revoke \
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
- Vault admin credentials
- DNS/Load balancer access

## Detection
1. Monitor alerts for primary cluster failure
2. Verify primary is truly unavailable (not transient)
3. Check replication status on secondary

## Failover Steps
1. **Promote Secondary**
   ```
   export VAULT_ADDR='https://vault.secondary.company.com:8200'
   vault write -f sys/replication/dr/secondary/promote
   ```

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
   - Promote original primary
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
SECONDARY_LAG=$(vault read -field=last_remote_wal sys/replication/dr/status)
echo "Replication lag: $SECONDARY_LAG"

# 2. Perform test promotion (don't actually change anything)
echo "Simulating promotion..."
# In test environment only!
# vault write -f sys/replication/dr/secondary/promote -dry-run

# 3. Verify secondary can be promoted
PROMOTION_STATUS=$(vault read -format=json sys/replication/dr/status | \
  jq -r '.data.primaries[0].connection_status')
echo "Promotion readiness: $PROMOTION_STATUS"

# 4. Test application connectivity
echo "Testing application access to secondary..."
curl -sf https://vault.secondary.company.com:8200/v1/sys/health

# 5. Document results
echo "DR test completed successfully"
```

## Best Practices

Test DR failover procedures quarterly in non-production environments. Monitor replication lag continuously and alert on significant delays. Automate failover decision-making with strict health checks. Document runbooks with step-by-step procedures and emergency contacts. Implement circuit breakers to prevent split-brain scenarios. Keep both clusters at same Vault version. Use dedicated network links for replication traffic when possible. Store DR activation tokens securely with restricted access. Practice graceful demotion procedures during maintenance windows.

Vault DR replication ensures business continuity by maintaining a standby cluster ready to take over during disasters. By implementing automated monitoring, practicing failover procedures, and maintaining clear runbooks, you ensure your secret management infrastructure remains available even during major outages. This level of resilience is essential for production systems that depend on Vault for critical secret access.

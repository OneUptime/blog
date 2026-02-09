# How to Build RPO and RTO Strategies for Kubernetes Workloads Using Velero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Disaster Recovery, Business Continuity

Description: Learn how to build effective RPO and RTO strategies for Kubernetes workloads using Velero, balancing recovery objectives with operational costs and complexity to meet your business requirements.

---

Recovery Point Objective (RPO) and Recovery Time Objective (RTO) define how much data you can afford to lose and how quickly you must recover after a disaster. These business requirements directly influence your Velero backup strategy, affecting backup frequency, retention policies, and restore procedures.

Understanding how to translate business requirements into technical Velero configurations is essential for effective disaster recovery planning.

## Understanding RPO and RTO

RPO measures the maximum acceptable data loss. An RPO of 1 hour means you can tolerate losing up to 1 hour of data during a disaster. This directly determines your backup frequency.

RTO measures the maximum acceptable downtime. An RTO of 30 minutes means your application must be restored and operational within 30 minutes of a disaster. This influences your restore strategy and infrastructure design.

## Calculating Required Backup Frequency

Your backup frequency must match or exceed your RPO requirement:

```
Backup Frequency <= RPO
```

For an RPO of 4 hours, backups must run at least every 4 hours:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: rpo-4hour-backup
  namespace: velero
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  template:
    ttl: 168h0m0s  # 7 days retention
    includedNamespaces:
    - production
    storageLocation: default
```

For tighter RPO requirements, increase frequency:

```yaml
# RPO 1 hour - hourly backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: rpo-1hour-backup
  namespace: velero
spec:
  schedule: "0 * * * *"  # Every hour
  template:
    ttl: 72h0m0s  # 3 days retention
    includedNamespaces:
    - production
```

## Tiered Backup Strategy

Different workloads have different RPO requirements. Implement tiered backups:

```yaml
# Critical workloads - RPO 15 minutes
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: critical-backup
  namespace: velero
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  template:
    ttl: 48h0m0s
    labelSelector:
      matchLabels:
        backup-tier: critical
---
# Standard workloads - RPO 4 hours
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: standard-backup
  namespace: velero
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  template:
    ttl: 168h0m0s
    labelSelector:
      matchLabels:
        backup-tier: standard
---
# Non-critical workloads - RPO 24 hours
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    ttl: 720h0m0s
    labelSelector:
      matchLabels:
        backup-tier: low
```

## Optimizing RTO Through Restore Speed

RTO depends on how quickly you can execute restores. Optimize restore speed through several techniques.

**Pre-staged infrastructure**: Keep standby clusters ready:

```bash
# Maintain a warm standby cluster
kubectl config use-context standby-cluster

# Install Velero with same configuration
velero install \
  --provider aws \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --use-volume-snapshots=false

# Test restore speed regularly
velero restore create warmup-test \
  --from-backup latest-backup
```

**Parallel restore operations**: Configure Velero for faster restores:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: velero-server-config
  namespace: velero
data:
  restore-resource-priorities: |
    namespaces,
    customresourcedefinitions,
    storageclasses,
    volumesnapshotclass.snapshot.storage.k8s.io,
    volumesnapshotcontents.snapshot.storage.k8s.io,
    volumesnapshots.snapshot.storage.k8s.io,
    persistentvolumes,
    persistentvolumeclaims,
    secrets,
    configmaps,
    serviceaccounts,
    services,
    deployments,
    statefulsets,
    daemonsets
  restore-item-action-timeout: 10m
```

**Selective restore for faster RTO**:

```bash
# Restore only critical components first
velero restore create critical-first \
  --from-backup production-backup \
  --include-namespaces production \
  --include-resources deployments,services,configmaps \
  --selector app=critical-service

# Once critical services are up, restore everything else
velero restore create remainder \
  --from-backup production-backup \
  --exclude-resources deployments,services,configmaps
```

## Measuring Actual RPO and RTO

Track actual recovery metrics to ensure you meet objectives:

```bash
#!/bin/bash
# measure-rto.sh

START_TIME=$(date +%s)

# Trigger restore
velero restore create rto-test \
  --from-backup latest-backup \
  --wait

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod \
  --all \
  --namespace production \
  --timeout=30m

END_TIME=$(date +%s)
RTO_ACTUAL=$((END_TIME - START_TIME))

echo "Actual RTO: ${RTO_ACTUAL} seconds"

# Send to monitoring
curl -X POST http://prometheus-pushgateway:9091/metrics/job/velero-rto \
  --data-binary "velero_actual_rto_seconds ${RTO_ACTUAL}"
```

Measure RPO by checking last backup age:

```bash
#!/bin/bash
# measure-rpo.sh

LAST_BACKUP=$(velero backup get --output json | \
  jq -r '.items | sort_by(.status.completionTimestamp) | last | .metadata.name')

BACKUP_TIME=$(velero backup describe $LAST_BACKUP --output json | \
  jq -r '.status.completionTimestamp')

CURRENT_TIME=$(date -u +%s)
BACKUP_EPOCH=$(date -d "$BACKUP_TIME" +%s)
RPO_ACTUAL=$((CURRENT_TIME - BACKUP_EPOCH))

echo "Actual RPO: ${RPO_ACTUAL} seconds"

# Alert if RPO exceeds target
if [ $RPO_ACTUAL -gt 14400 ]; then  # 4 hours
  echo "RPO VIOLATION: Last backup is ${RPO_ACTUAL}s old"
fi
```

## Cost vs RPO/RTO Trade-offs

Tighter RPO and RTO increase costs. Calculate the cost of your DR strategy:

```
Backup Cost = Storage Cost + Transfer Cost + Snapshot Cost
Storage Cost = Backup Size * Retention Days * Storage Price/GB/Day
Transfer Cost = Backup Size * Backup Frequency * Transfer Price/GB
```

Example calculation:

```python
#!/usr/bin/env python3
# dr-cost-calculator.py

def calculate_dr_cost(backup_size_gb, rpo_hours, retention_days, storage_price, transfer_price):
    """Calculate monthly DR costs based on RPO requirements."""

    # Number of backups per month
    backups_per_day = 24 / rpo_hours
    backups_per_month = backups_per_day * 30

    # Storage cost
    total_backups = backups_per_day * retention_days
    storage_cost = backup_size_gb * total_backups * storage_price * 30

    # Transfer cost
    transfer_cost = backup_size_gb * backups_per_month * transfer_price

    # Total
    total_cost = storage_cost + transfer_cost

    return {
        "storage_cost": storage_cost,
        "transfer_cost": transfer_cost,
        "total_monthly_cost": total_cost,
        "backups_per_month": backups_per_month
    }

# Example: 100GB backup, 4 hour RPO, 7 day retention
# S3 standard: $0.023/GB/month, transfer: $0.09/GB
result = calculate_dr_cost(
    backup_size_gb=100,
    rpo_hours=4,
    retention_days=7,
    storage_price=0.023 / 30,  # Daily price
    transfer_price=0.09
)

print(f"Monthly DR cost: ${result['total_monthly_cost']:.2f}")
print(f"Storage: ${result['storage_cost']:.2f}")
print(f"Transfer: ${result['transfer_cost']:.2f}")
print(f"Backups per month: {result['backups_per_month']}")
```

## Application-Specific RPO Strategies

Different application types need different approaches:

**Stateless applications** (low RPO concern):

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: stateless-apps
  namespace: velero
spec:
  schedule: "0 4 * * *"  # Daily
  template:
    ttl: 168h0m0s
    labelSelector:
      matchLabels:
        app-type: stateless
    includedResources:
    - deployments
    - services
    - configmaps
```

**Databases** (critical RPO):

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: database-backup
  namespace: velero
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  template:
    ttl: 48h0m0s
    labelSelector:
      matchLabels:
        app-type: database
    hooks:
      resources:
      - name: database-consistent-backup
        includedNamespaces:
        - database
        labelSelector:
          matchLabels:
            app: postgres
        pre:
        - exec:
            container: postgres
            command:
            - /bin/bash
            - -c
            - "pg_dump -Fc > /backup/dump.pgdump"
```

## Testing RTO Compliance

Regularly test that you can meet RTO objectives:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rto-test
  namespace: velero
spec:
  schedule: "0 3 * * 0"  # Weekly on Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
          - name: rto-test
            image: velero/velero:latest
            command:
            - /bin/bash
            - -c
            - |
              # Create test namespace
              kubectl create namespace rto-test-$(date +%s)

              # Start timer
              START=$(date +%s)

              # Restore to test namespace
              velero restore create rto-test-restore-$(date +%s) \
                --from-backup latest-production-backup \
                --namespace-mappings production:rto-test-$(date +%s) \
                --wait

              # Calculate RTO
              END=$(date +%s)
              RTO=$((END - START))

              # Report
              echo "RTO Test: ${RTO}s"

              # Cleanup
              kubectl delete namespace rto-test-$(date +%s)
          restartPolicy: OnFailure
```

## Documentation and Runbooks

Document your RPO/RTO strategy in runbooks:

```markdown
# Disaster Recovery Runbook

## RPO/RTO Objectives
- Critical Services: RPO 15min, RTO 30min
- Standard Services: RPO 4hrs, RTO 2hrs
- Development: RPO 24hrs, RTO 4hrs

## Recovery Procedures

### Critical Service Recovery (RTO: 30min)
1. Verify standby cluster is available
2. Execute: velero restore create critical-recovery --from-backup latest-critical
3. Monitor: kubectl get pods -n production -w
4. Validate: curl https://healthcheck.example.com
5. Update DNS if needed

### Verification
- [ ] All pods running
- [ ] Health checks passing
- [ ] Database connections working
- [ ] External integrations functional
```

## Conclusion

Building effective RPO and RTO strategies requires balancing business requirements against operational costs and complexity. Start by clearly defining your recovery objectives for different workload tiers, then implement Velero schedules and restore procedures that meet those objectives.

Regularly test your actual RPO and RTO to ensure your strategy works when disaster strikes. Measure the costs of your DR strategy and optimize by adjusting retention policies and backup frequencies for different workload tiers.

Remember that RPO and RTO are business requirements, not technical ones. Work with stakeholders to understand acceptable data loss and downtime, then design your Velero backup strategy to meet those needs.

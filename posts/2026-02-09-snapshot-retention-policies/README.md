# How to Implement Volume Snapshot Retention Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Lifecycle Management, Cost Optimization

Description: Learn how to implement effective retention policies for Kubernetes volume snapshots to balance data protection requirements with storage costs through automated lifecycle management.

---

Retention policies determine how long snapshots are kept before deletion. Well-designed policies balance recovery needs, compliance requirements, and storage costs by automatically managing snapshot lifecycle.

## Understanding Retention Strategies

Common retention strategies include:

1. **Grandfather-Father-Son (GFS)** - Hourly, daily, weekly, monthly tiers
2. **Time-Based** - Delete snapshots older than X days
3. **Count-Based** - Keep last N snapshots per application
4. **Tiered** - Different policies by environment or criticality
5. **Compliance-Driven** - Based on regulatory requirements

Choose strategies based on RPO, compliance needs, and budget constraints.

## Implementing GFS Retention Policy

Create a multi-tier retention system:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gfs-snapshot-management
spec:
  schedule: "0 * * * *"  # Hourly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-manager
          restartPolicy: OnFailure
          containers:
          - name: gfs-manager
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== GFS Snapshot Management ==="

              PVC_NAME="postgres-pvc"
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)

              # Determine snapshot type based on time
              HOUR=$(date +%H)
              DAY=$(date +%u)
              MDAY=$(date +%d)

              if [ "$MDAY" = "01" ]; then
                # First day of month - monthly snapshot
                SNAPSHOT_TYPE="monthly"
                RETENTION_LABEL="90"  # 90 days
              elif [ "$DAY" = "7" ]; then
                # Sunday - weekly snapshot
                SNAPSHOT_TYPE="weekly"
                RETENTION_LABEL="28"  # 4 weeks
              elif [ "$HOUR" = "02" ]; then
                # 2 AM - daily snapshot
                SNAPSHOT_TYPE="daily"
                RETENTION_LABEL="7"  # 7 days
              else
                # Hourly snapshot
                SNAPSHOT_TYPE="hourly"
                RETENTION_LABEL="1"  # 24 hours
              fi

              echo "Creating $SNAPSHOT_TYPE snapshot..."

              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: ${PVC_NAME}-${SNAPSHOT_TYPE}-${TIMESTAMP}
                labels:
                  pvc-name: $PVC_NAME
                  snapshot-type: $SNAPSHOT_TYPE
                  retention-days: "$RETENTION_LABEL"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: $PVC_NAME
              EOF

              echo "✓ Snapshot created"

              # Cleanup old snapshots by type
              echo "Cleaning up old $SNAPSHOT_TYPE snapshots..."

              CUTOFF_DATE=$(date -d "$RETENTION_LABEL days ago" +%s)

              kubectl get volumesnapshot \
                -l pvc-name=$PVC_NAME,snapshot-type=$SNAPSHOT_TYPE \
                -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < '$CUTOFF_DATE') |
                  .metadata.name' | \
                while read snapshot; do
                  echo "Deleting old snapshot: $snapshot"
                  kubectl delete volumesnapshot $snapshot
                done

              echo "✓ Cleanup complete"
```

## Time-Based Retention Policy

Implement simple time-based retention:

```bash
#!/bin/bash
# apply-time-based-retention.sh

set -e

RETENTION_DAYS="${1:-30}"

echo "=== Applying Time-Based Retention Policy ==="
echo "Retention period: $RETENTION_DAYS days"

CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%s)

# Find and delete old snapshots
kubectl get volumesnapshot -o json | \
  jq -r '.items[] |
    {
      name: .metadata.name,
      created: .metadata.creationTimestamp,
      created_ts: (.metadata.creationTimestamp | fromdateiso8601)
    } |
    select(.created_ts < '$CUTOFF_DATE') |
    .name' | \
  while read snapshot; do
    AGE_DAYS=$(( ($(date +%s) - \
      $(date -d "$(kubectl get volumesnapshot $snapshot \
        -o jsonpath='{.metadata.creationTimestamp}')" +%s)) / 86400 ))

    echo "Deleting snapshot: $snapshot (age: $AGE_DAYS days)"
    kubectl delete volumesnapshot $snapshot
  done

echo "✓ Retention policy applied"
```

## Count-Based Retention Policy

Keep only the N most recent snapshots:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: count-based-retention
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-manager
          restartPolicy: OnFailure
          containers:
          - name: retention-manager
            image: bitnami/kubectl:latest
            env:
            - name: KEEP_COUNT
              value: "10"  # Keep last 10 snapshots
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Count-Based Retention Policy ==="
              echo "Keeping last $KEEP_COUNT snapshots per PVC"

              # Get all unique PVC names from snapshots
              kubectl get volumesnapshot -o json | \
                jq -r '[.items[].metadata.labels."pvc-name"] | unique | .[]' | \
                while read PVC; do

                echo "Processing snapshots for PVC: $PVC"

                # Get snapshot count
                TOTAL=$(kubectl get volumesnapshot -l pvc-name=$PVC --no-headers | wc -l)

                if [ $TOTAL -le $KEEP_COUNT ]; then
                  echo "  Total snapshots ($TOTAL) within limit ($KEEP_COUNT)"
                  continue
                fi

                DELETE_COUNT=$(( TOTAL - KEEP_COUNT ))
                echo "  Deleting $DELETE_COUNT old snapshots"

                # Delete oldest snapshots
                kubectl get volumesnapshot -l pvc-name=$PVC \
                  --sort-by=.metadata.creationTimestamp \
                  -o jsonpath='{.items[*].metadata.name}' | \
                  tr ' ' '\n' | \
                  head -n $DELETE_COUNT | \
                  while read snapshot; do
                    echo "    Deleting: $snapshot"
                    kubectl delete volumesnapshot $snapshot
                  done
              done

              echo "✓ Count-based retention applied"
```

## Tiered Retention by Environment

Different policies for different environments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: retention-policies
data:
  policies.json: |
    {
      "production": {
        "hourly": 24,
        "daily": 7,
        "weekly": 4,
        "monthly": 12
      },
      "staging": {
        "daily": 3,
        "weekly": 2
      },
      "development": {
        "daily": 1
      }
    }
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tiered-retention
spec:
  schedule: "0 4 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-manager
          restartPolicy: OnFailure
          containers:
          - name: retention-manager
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Tiered Retention Policy ==="

              # Process each environment
              for ENV in production staging development; do
                echo "Processing environment: $ENV"

                # Get retention rules from ConfigMap
                POLICY=$(kubectl get configmap retention-policies \
                  -o jsonpath="{.data.policies\.json}" | \
                  jq -r ".$ENV")

                # Apply retention for each snapshot type
                echo "$POLICY" | jq -r 'to_entries[]' | \
                  while read -r entry; do
                    TYPE=$(echo $entry | jq -r '.key')
                    RETENTION=$(echo $entry | jq -r '.value')

                    echo "  $TYPE: keep last $RETENTION"

                    CUTOFF_DATE=$(date -d "$RETENTION days ago" +%s)

                    kubectl get volumesnapshot \
                      -l environment=$ENV,snapshot-type=$TYPE \
                      -o json | \
                      jq -r '.items[] |
                        select(.metadata.creationTimestamp |
                          fromdateiso8601 < '$CUTOFF_DATE') |
                        .metadata.name' | \
                      while read snapshot; do
                        echo "    Deleting: $snapshot"
                        kubectl delete volumesnapshot $snapshot
                      done
                  done
              done

              echo "✓ Tiered retention applied"
```

## Compliance-Driven Retention

Implement retention for regulatory compliance:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: compliance-retention
spec:
  schedule: "0 5 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-manager
          restartPolicy: OnFailure
          containers:
          - name: compliance-manager
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Compliance-Driven Retention ==="

              # GDPR: 7 years for financial data
              echo "Applying GDPR retention..."
              kubectl get volumesnapshot -l compliance-policy=gdpr -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - (7 * 365 * 86400))) |
                  .metadata.name' | \
                while read snapshot; do
                  echo "Deleting GDPR snapshot: $snapshot (>7 years)"
                  kubectl delete volumesnapshot $snapshot
                done

              # HIPAA: 6 years for healthcare data
              echo "Applying HIPAA retention..."
              kubectl get volumesnapshot -l compliance-policy=hipaa -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - (6 * 365 * 86400))) |
                  .metadata.name' | \
                while read snapshot; do
                  echo "Deleting HIPAA snapshot: $snapshot (>6 years)"
                  kubectl delete volumesnapshot $snapshot
                done

              # SOX: 7 years for audit records
              echo "Applying SOX retention..."
              kubectl get volumesnapshot -l compliance-policy=sox -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - (7 * 365 * 86400))) |
                  .metadata.name' | \
                while read snapshot; do
                  echo "Deleting SOX snapshot: $snapshot (>7 years)"
                  kubectl delete volumesnapshot $snapshot
                done

              echo "✓ Compliance retention applied"
```

## Retention Policy Monitoring

Monitor retention policy effectiveness:

```bash
#!/bin/bash
# retention-report.sh

echo "=== Snapshot Retention Report ==="
echo "Generated: $(date)"
echo

# Total snapshot count and storage
TOTAL_SNAPSHOTS=$(kubectl get volumesnapshot --no-headers | wc -l)
TOTAL_STORAGE=$(kubectl get volumesnapshot -o json | \
  jq '[.items[].status.restoreSize | rtrimstr("Gi") | tonumber] | add')

echo "Total Snapshots: $TOTAL_SNAPSHOTS"
echo "Total Storage: ${TOTAL_STORAGE}Gi"
echo

# Breakdown by retention period
echo "By Retention Period:"
for DAYS in 1 7 28 90 365; do
  COUNT=$(kubectl get volumesnapshot -l retention-days=$DAYS --no-headers | wc -l)
  echo "  $DAYS days: $COUNT snapshots"
done

echo
echo "By Snapshot Type:"
for TYPE in hourly daily weekly monthly; do
  COUNT=$(kubectl get volumesnapshot -l snapshot-type=$TYPE --no-headers | wc -l)
  echo "  $TYPE: $COUNT snapshots"
done

echo
echo "By Environment:"
for ENV in production staging development; do
  COUNT=$(kubectl get volumesnapshot -l environment=$ENV --no-headers | wc -l)
  STORAGE=$(kubectl get volumesnapshot -l environment=$ENV -o json | \
    jq '[.items[].status.restoreSize | rtrimstr("Gi") | tonumber] | add // 0')
  echo "  $ENV: $COUNT snapshots (${STORAGE}Gi)"
done

echo
echo "Snapshots Expiring Soon (7 days):"
EXPIRY_DATE=$(date -d "7 days ago" +%s)

kubectl get volumesnapshot -o json | \
  jq -r '.items[] |
    {
      name: .metadata.name,
      created: .metadata.creationTimestamp,
      retention: (.metadata.labels."retention-days" | tonumber),
      expires: ((.metadata.creationTimestamp | fromdateiso8601) +
                ((.metadata.labels."retention-days" | tonumber) * 86400))
    } |
    select(.expires < (now + (7 * 86400))) |
    "\(.name)\t\(.created)\t\(.retention) days"' | \
  column -t -s $'\t'
```

## Cost Impact Analysis

Analyze cost impact of retention policies:

```bash
#!/bin/bash
# retention-cost-analysis.sh

COST_PER_GB_MONTH=0.05  # AWS EBS snapshot cost

echo "=== Retention Policy Cost Analysis ==="
echo "Cost assumption: \$${COST_PER_GB_MONTH}/GB-month"
echo

# Current cost
CURRENT_GB=$(kubectl get volumesnapshot -o json | \
  jq '[.items[].status.restoreSize | rtrimstr("Gi") | tonumber] | add')
CURRENT_COST=$(echo "scale=2; $CURRENT_GB * $COST_PER_GB_MONTH" | bc)

echo "Current Snapshot Storage: ${CURRENT_GB}Gi"
echo "Current Monthly Cost: \$${CURRENT_COST}"
echo

# Simulate more aggressive retention
echo "Cost Simulation - Aggressive Retention (50% reduction):"
SIMULATED_GB=$(echo "scale=2; $CURRENT_GB * 0.5" | bc)
SIMULATED_COST=$(echo "scale=2; $SIMULATED_GB * $COST_PER_GB_MONTH" | bc)
SAVINGS=$(echo "scale=2; $CURRENT_COST - $SIMULATED_COST" | bc)

echo "  Storage: ${SIMULATED_GB}Gi"
echo "  Monthly Cost: \$${SIMULATED_COST}"
echo "  Monthly Savings: \$${SAVINGS}"
echo "  Annual Savings: \$$(echo "scale=2; $SAVINGS * 12" | bc)"
```

## Best Practices

1. **Implement GFS strategy** for balanced retention
2. **Use labels** to track retention requirements
3. **Automate cleanup** with CronJobs
4. **Monitor retention compliance** regularly
5. **Document policies** for compliance audits
6. **Test restores** before deleting old snapshots
7. **Review costs** monthly and adjust policies
8. **Align with RPO/RTO** requirements

Effective retention policies balance data protection needs with storage costs. Regular review and adjustment ensure policies remain aligned with business requirements and budget constraints.

# How to Create Backup Policies for Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Backup, Policy, Kubernetes, Disaster Recovery, Compliance

Description: Design and implement comprehensive backup policies for Talos Linux clusters covering retention, scheduling, and compliance requirements.

---

A backup without a policy is just a file sitting somewhere. Backup policies define what gets backed up, how often, how long backups are kept, and who is responsible for verifying them. For Talos Linux clusters running production workloads, well-defined backup policies are not just a nice-to-have - they are a requirement for operational maturity and regulatory compliance.

This guide walks through designing and implementing backup policies that cover the full spectrum of needs for Talos Linux environments.

## Defining Your Backup Requirements

Before writing any configuration, answer these questions for each workload:

1. What is the Recovery Point Objective (RPO)? How much data can you afford to lose?
2. What is the Recovery Time Objective (RTO)? How fast do you need to be back online?
3. What are your compliance requirements? Do regulations mandate specific retention periods?
4. What is the blast radius? If this workload is lost, what else breaks?

Different workloads will have different answers. A stateless web frontend has very different backup needs than a transactional database.

## Tiered Backup Strategy

Organize your workloads into tiers based on their criticality:

```yaml
# backup-policy.yaml
# This is a reference document, not a Kubernetes resource
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-policy
  namespace: backup-system
data:
  policy: |
    tiers:
      critical:
        description: "Production databases, payment systems"
        rpo: "1 hour"
        rto: "15 minutes"
        frequency: "every 1 hour"
        retention: "90 days"
        replication: "cross-region"
        testing: "weekly"

      standard:
        description: "Production application workloads"
        rpo: "6 hours"
        rto: "1 hour"
        frequency: "every 6 hours"
        retention: "30 days"
        replication: "same-region"
        testing: "monthly"

      development:
        description: "Dev/staging environments"
        rpo: "24 hours"
        rto: "4 hours"
        frequency: "daily"
        retention: "7 days"
        replication: "none"
        testing: "quarterly"
```

## Implementing Policies with Velero

Translate your policy tiers into Velero schedules. Each tier gets its own schedule with appropriate settings:

```bash
# Critical tier - hourly backups, 90-day retention
velero schedule create critical-hourly \
    --schedule="0 * * * *" \
    --include-namespaces production-db,payments \
    --snapshot-move-data \
    --ttl 2160h \
    --labels tier=critical

# Standard tier - every 6 hours, 30-day retention
velero schedule create standard-6h \
    --schedule="0 */6 * * *" \
    --include-namespaces production,api,frontend \
    --snapshot-move-data \
    --ttl 720h \
    --labels tier=standard

# Development tier - daily, 7-day retention
velero schedule create dev-daily \
    --schedule="0 2 * * *" \
    --include-namespaces development,staging \
    --ttl 168h \
    --labels tier=development
```

## Namespace-Level Backup Annotations

Use Kubernetes labels and annotations to drive backup behavior at the namespace level:

```yaml
# Annotate namespaces with their backup tier
apiVersion: v1
kind: Namespace
metadata:
  name: production-db
  labels:
    backup-tier: critical
    backup-enabled: "true"
  annotations:
    backup.policy/rpo: "1h"
    backup.policy/retention: "90d"
    backup.policy/owner: "database-team"
    backup.policy/contact: "dba@example.com"
```

Then use a script to dynamically create backup schedules based on these annotations:

```bash
#!/bin/bash
# sync-backup-policies.sh
# Creates Velero schedules based on namespace annotations

# Get all namespaces with backup enabled
kubectl get namespaces -l backup-enabled=true -o json | jq -r '.items[] | {
    name: .metadata.name,
    tier: .metadata.labels["backup-tier"],
    rpo: .metadata.annotations["backup.policy/rpo"],
    retention: .metadata.annotations["backup.policy/retention"]
}' | jq -c '.' | while read ns_info; do
    NAME=$(echo "$ns_info" | jq -r '.name')
    TIER=$(echo "$ns_info" | jq -r '.tier')
    RPO=$(echo "$ns_info" | jq -r '.rpo')
    RETENTION=$(echo "$ns_info" | jq -r '.retention')

    # Convert RPO to cron schedule
    case "$RPO" in
        "1h") SCHEDULE="0 * * * *" ;;
        "6h") SCHEDULE="0 */6 * * *" ;;
        "24h") SCHEDULE="0 2 * * *" ;;
        *) SCHEDULE="0 2 * * *" ;;
    esac

    SCHEDULE_NAME="backup-${NAME}"

    echo "Creating schedule $SCHEDULE_NAME for namespace $NAME (tier: $TIER)"

    velero schedule create "$SCHEDULE_NAME" \
        --schedule="$SCHEDULE" \
        --include-namespaces "$NAME" \
        --ttl "$RETENTION" \
        --labels "tier=$TIER,managed-by=backup-policy" \
        2>/dev/null || echo "Schedule $SCHEDULE_NAME already exists"
done
```

## Retention Policies

Different data types need different retention periods. Here is how to implement a grandfather-father-son rotation:

```bash
# Hourly backups - keep for 24 hours (for critical workloads)
velero schedule create critical-hourly \
    --schedule="0 * * * *" \
    --include-namespaces production-db \
    --ttl 24h \
    --labels retention=hourly

# Daily backups - keep for 30 days
velero schedule create critical-daily \
    --schedule="0 0 * * *" \
    --include-namespaces production-db \
    --ttl 720h \
    --labels retention=daily

# Weekly backups - keep for 90 days
velero schedule create critical-weekly \
    --schedule="0 0 * * 0" \
    --include-namespaces production-db \
    --ttl 2160h \
    --labels retention=weekly

# Monthly backups - keep for 1 year
velero schedule create critical-monthly \
    --schedule="0 0 1 * *" \
    --include-namespaces production-db \
    --ttl 8760h \
    --labels retention=monthly
```

## Backup Policy Enforcement

Use a Kubernetes admission controller or OPA/Gatekeeper to enforce that all production namespaces have backup policies defined:

```yaml
# Gatekeeper constraint template
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requiredbackuppolicy
spec:
  crd:
    spec:
      names:
        kind: RequiredBackupPolicy
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package requiredbackuppolicy

      violation[{"msg": msg}] {
          input.review.object.kind == "Namespace"
          labels := input.review.object.metadata.labels
          not labels["backup-tier"]
          msg := sprintf("Namespace %v must have a backup-tier label", [input.review.object.metadata.name])
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequiredBackupPolicy
metadata:
  name: require-backup-tier
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Namespace"]
    namespaceSelector:
      matchLabels:
        environment: production
```

## Talos Machine Configuration Backup Policy

Do not forget about the Talos nodes themselves. Machine configurations should be backed up whenever they change:

```bash
#!/bin/bash
# backup-talos-configs.sh
# Backs up Talos machine configurations for all nodes

BACKUP_DIR="/backups/talos-configs/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Get all node IPs
NODES=$(talosctl get members -o json | jq -r '.[].spec.addresses[0]')

for node in $NODES; do
    echo "Backing up config for node: $node"
    talosctl get machineconfig -o yaml --nodes "$node" > "$BACKUP_DIR/$node.yaml"

    # Validate the backup
    talosctl validate --config "$BACKUP_DIR/$node.yaml" --mode metal
    if [ $? -eq 0 ]; then
        echo "OK: Config for $node is valid"
    else
        echo "ERROR: Config for $node failed validation"
    fi
done

# Store a checksum for integrity verification
sha256sum "$BACKUP_DIR"/*.yaml > "$BACKUP_DIR/checksums.sha256"
```

## Monitoring and Alerting on Policy Compliance

Set up alerts that fire when backup policies are not being met:

```yaml
# PrometheusRule for backup policy compliance
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backup-policy-alerts
  namespace: monitoring
spec:
  groups:
  - name: backup-policy
    rules:
    # Alert if critical tier misses its 1-hour RPO
    - alert: CriticalBackupRPOBreach
      expr: |
        (time() - velero_backup_last_successful_timestamp{schedule=~"critical.*"}) > 3600
      for: 15m
      labels:
        severity: critical
        tier: critical
      annotations:
        summary: "Critical backup RPO breached"
        description: "No successful critical backup in over 1 hour"

    # Alert if standard tier misses its 6-hour RPO
    - alert: StandardBackupRPOBreach
      expr: |
        (time() - velero_backup_last_successful_timestamp{schedule=~"standard.*"}) > 21600
      for: 30m
      labels:
        severity: warning
        tier: standard
      annotations:
        summary: "Standard backup RPO breached"

    # Alert if backup storage is running low
    - alert: BackupStorageHigh
      expr: |
        s3_bucket_size_bytes{bucket="talos-backups"} > 500e9
      labels:
        severity: warning
      annotations:
        summary: "Backup storage exceeding 500GB"
```

## Documenting Your Backup Policy

Keep a living document that describes your backup policy. Here is a template:

```bash
#!/bin/bash
# generate-policy-report.sh
# Generates a backup policy report from cluster state

echo "# Backup Policy Report"
echo "## Generated: $(date)"
echo ""

echo "## Active Backup Schedules"
velero schedule get -o json | jq -r '.items[] | "- **\(.metadata.name)**: Schedule=\(.spec.schedule), TTL=\(.spec.ttl)"'

echo ""
echo "## Recent Backup Status"
velero backup get --sort-by=.status.completionTimestamp -o json | \
    jq -r '.items[-10:] | .[] | "- \(.metadata.name): \(.status.phase) (\(.status.completionTimestamp))"'

echo ""
echo "## Namespace Coverage"
ALL_NS=$(kubectl get ns --no-headers -o custom-columns=":metadata.name" | wc -l | tr -d ' ')
COVERED_NS=$(kubectl get ns -l backup-enabled=true --no-headers | wc -l | tr -d ' ')
echo "- Total namespaces: $ALL_NS"
echo "- Namespaces with backup policy: $COVERED_NS"
echo "- Coverage: $(( COVERED_NS * 100 / ALL_NS ))%"
```

## Wrapping Up

Creating backup policies for Talos Linux clusters is about turning ad hoc backups into a systematic, auditable process. Start by understanding your RPO and RTO requirements, tier your workloads by criticality, automate everything with Velero schedules, and monitor compliance continuously. A written policy that nobody follows is worthless, so invest in automation and alerting to make policy adherence the path of least resistance.

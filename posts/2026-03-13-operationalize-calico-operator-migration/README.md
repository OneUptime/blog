# How to Operationalize Calico Operator Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Operator, Migration, Operations

Description: Build a repeatable, documented operational process for migrating multiple Calico clusters from manifest to operator-based installation.

---

## Introduction

Operationalizing the Calico operator migration means turning a one-time technical procedure into a repeatable, documented, and team-executable process. If you have multiple clusters to migrate, or need to migrate during different maintenance windows, having a standardized process reduces risk and improves confidence.

The operational framework covers: pre-migration cluster assessment, staging validation requirements, maintenance window planning, communication templates, rollback decision criteria, and post-migration documentation. Each element ensures the migration is consistent across clusters and teams.

## Migration Wave Planning

```mermaid
flowchart LR
    A[Wave 1: Dev clusters] --> B[Wave 1 Validation]
    B --> C[Wave 2: Staging clusters]
    C --> D[Wave 2 Validation]
    D --> E[Wave 3: Production non-critical]
    E --> F[Wave 3 Validation]
    F --> G[Wave 4: Production critical]
```

## Pre-Migration Cluster Assessment Checklist

```bash
#!/bin/bash
# assess-cluster-for-migration.sh
CLUSTER="${1:-$(kubectl config current-context)}"
REPORT_FILE="migration-assessment-${CLUSTER}-$(date +%Y%m%d).txt"

{
  echo "CALICO MIGRATION ASSESSMENT: ${CLUSTER}"
  echo "Date: $(date)"
  echo ""

  echo "=== Kubernetes Version ==="
  kubectl version --short

  echo ""
  echo "=== Current Calico Version ==="
  kubectl get ds calico-node -n kube-system \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || \
    echo "Not found in kube-system"

  echo ""
  echo "=== Node Count ==="
  kubectl get nodes --no-headers | wc -l

  echo ""
  echo "=== Calico Custom Resources ==="
  calicoctl get ippools --no-headers | wc -l && echo " IP Pools"
  calicoctl get gnp --no-headers | wc -l && echo " Global Network Policies"
  calicoctl get np --all-namespaces --no-headers | wc -l && echo " Network Policies"

  echo ""
  echo "=== Custom FelixConfiguration ==="
  calicoctl get felixconfiguration default -o yaml | \
    grep -v "^  creationTimestamp\|^  uid\|^  resourceVersion" | \
    head -20

} | tee "${REPORT_FILE}"

echo "Assessment saved to: ${REPORT_FILE}"
```

## Maintenance Window Communication Template

```markdown
Subject: Scheduled Maintenance - Calico Kubernetes Network Plugin Upgrade

Team,

We will be migrating Kubernetes cluster [CLUSTER_NAME] from manifest-based
Calico to the Tigera Operator on [DATE] during [TIME_WINDOW].

Impact:
- Brief network interruption possible per node during migration (10-30 seconds)
- All pods will be restarted on each node as the new calico-node takes over
- Network policies will remain enforced throughout

Duration: Estimated 45-60 minutes

Rollback: Automated rollback available if migration fails validation

Contact: [TEAM] via [CHANNEL] during the window

Post-migration validation will confirm all services are healthy before
maintenance window is closed.
```

## Rollback Decision Matrix

| Scenario | Action | Urgency |
|----------|--------|---------|
| TigeraStatus Degraded >5min | Investigate operator logs | High |
| Any production pod unreachable | Initiate rollback | Critical |
| >10% pods not running | Initiate rollback | Critical |
| Network latency >200% baseline | Investigate and consider rollback | High |
| 1-2 non-critical pods failing | Monitor and resolve post-migration | Medium |

## Rollback Procedure

```bash
#!/bin/bash
# rollback-operator-migration.sh
set -euo pipefail

BACKUP_DIR="${1:?Usage: rollback-operator-migration.sh <backup-dir>}"

echo "Starting rollback to manifest-based installation..."
echo "Using backup from: ${BACKUP_DIR}"

# Delete operator Installation to stop operator managing resources
kubectl delete installation default --ignore-not-found

# Delete operator
kubectl delete -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Restore original manifest
kubectl apply -f "${BACKUP_DIR}/calico-node-ds.yaml"

# Restore configuration
calicoctl apply -f "${BACKUP_DIR}/ippools.yaml"
calicoctl apply -f "${BACKUP_DIR}/felixconfig.yaml"
calicoctl apply -f "${BACKUP_DIR}/gnps.yaml"

echo "Rollback complete. Monitoring pod recovery..."
kubectl rollout status ds/calico-node -n kube-system --timeout=300s
```

## Post-Migration Documentation Template

```markdown
## Calico Operator Migration - [CLUSTER] - [DATE]

Migration Status: SUCCESS / FAILED
Migration Duration: X minutes

Pre-Migration State:
- Calico version: vX.Y.Z (manifest install)
- Node count: N
- IP pools: N
- Network policies: N

Post-Migration State:
- Calico version: vX.Y.Z (operator managed)
- All pods in calico-system: RUNNING
- Network connectivity: VERIFIED
- Policy enforcement: VERIFIED

Issues Encountered:
- [List any issues and resolutions]

Next Steps:
- [Any follow-up actions]
```

## Conclusion

Operationalizing Calico operator migration transforms a stressful one-time event into a predictable, repeatable process. By doing wave-based migrations (dev first, production last), using standardized assessment scripts, having clear communication templates, defining explicit rollback criteria, and documenting each migration outcome, your team builds confidence and expertise with each successive cluster migration. The investment in operational infrastructure pays dividends when migrating dozens of clusters or when the process needs to be handed off to another team member.

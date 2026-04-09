# How to Document Ceph Architecture for Compliance Audits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compliance, Documentation, Audit, Architecture

Description: Learn how to document your Ceph storage architecture to satisfy compliance auditors with network diagrams, data flow maps, and configuration evidence.

---

Compliance auditors require clear, accurate documentation of your storage infrastructure. For Ceph, this means capturing cluster topology, data flows, security controls, and configuration details in formats that auditors can review.

## Capturing Cluster Topology

Generate a current snapshot of your Ceph cluster structure:

```bash
# Export cluster status
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph status --format json > cluster-status.json

# Export OSD tree
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd tree --format json > osd-tree.json

# Export pool configuration
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd dump --format json > osd-dump.json
```

## Generating Architecture Diagrams

Use the cluster output to build a machine-readable architecture description:

```yaml
# architecture.yaml - kept in version control
cluster:
  name: production-ceph
  version: "18.2.0"
  deployment: rook-operator
  kubernetes_version: "1.28"

topology:
  nodes:
    - name: node-1
      role: [mon, mgr, osd]
      zone: us-east-1a
    - name: node-2
      role: [mon, osd]
      zone: us-east-1b
    - name: node-3
      role: [mon, osd]
      zone: us-east-1c

security_controls:
  encryption_at_rest: luks-dmcrypt
  encryption_in_transit: msgr2-secure
  key_management: hashicorp-vault
  tls_version: "1.3"
  access_control: iam-rbac
```

## Documenting Data Flows

Create a data flow diagram document for auditors:

```markdown
## Data Flow: Application to Ceph Object Storage

1. Application sends HTTPS PUT request to RGW endpoint (TLS 1.3)
2. RGW authenticates request using SigV4 signature
3. RGW logs access event to ops log
4. Data encrypted at application layer (AES-256)
5. RGW stores object - data passed to RADOS
6. RADOS distributes data across OSDs using CRUSH
7. OSDs write to dmcrypt-encrypted block devices
8. Replication: 3 copies across 3 failure domains
```

## Exporting Configuration Evidence

Auditors need evidence that controls are configured correctly:

```bash
#!/bin/bash
# generate-audit-evidence.sh

OUTPUT_DIR="./audit-evidence-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

# Encryption status
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph health detail > "$OUTPUT_DIR/health-detail.txt"

# Configuration values
for key in ms_cluster_mode ms_service_mode rgw_enable_ops_log; do
  val=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config dump | grep "$key")
  echo "$key: $val" >> "$OUTPUT_DIR/security-config.txt"
done

# User and access listing
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user list > "$OUTPUT_DIR/rgw-users.txt"

echo "Audit evidence collected in $OUTPUT_DIR"
```

## Version-Controlled Compliance Documentation

Store all compliance documentation in Git alongside your Rook manifests:

```text
rook-infra/
  manifests/
    ceph-cluster.yaml
    ceph-object-store.yaml
  compliance/
    architecture.yaml
    security-controls.md
    data-flow-diagram.md
    audit-evidence/
      2026-Q1/
        health-detail.txt
        security-config.txt
```

## Automated Compliance Reports

Generate periodic compliance status reports:

```bash
#!/bin/bash
# weekly-compliance-report.sh

DATE=$(date +%Y-%m-%d)
REPORT="compliance-report-$DATE.md"

echo "# Ceph Compliance Report - $DATE" > "$REPORT"
echo "" >> "$REPORT"
echo "## Cluster Health" >> "$REPORT"
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph health >> "$REPORT"

echo "" >> "$REPORT"
echo "## Encryption Status" >> "$REPORT"
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config dump | grep -E "ms_.*mode|encrypt" >> "$REPORT"

echo "Report generated: $REPORT"
```

## Summary

Effective Ceph compliance documentation includes cluster topology exports, security control configurations, data flow descriptions, and automated evidence collection scripts. Storing all documentation in version control alongside your Rook manifests creates a traceable history of your compliance posture that satisfies auditors and simplifies future reviews.

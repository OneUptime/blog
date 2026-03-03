# How to Set Up Evidence Collection for Audits with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Audit, Compliance, Evidence Collection, Kubernetes, Security

Description: How to systematically collect, store, and organize audit evidence from Istio for compliance audits like SOC 2, PCI DSS, and HIPAA.

---

When an auditor comes knocking, they want evidence. Not just a description of what your controls are supposed to do, but proof that they're actually working. Istio generates tons of useful data for this purpose: access logs, metrics, configuration snapshots, policy definitions, and security events. The challenge is collecting it all in an organized way so you can hand it to an auditor without scrambling.

This post walks through setting up systematic evidence collection from your Istio mesh.

## Types of Evidence Auditors Need

Depending on the framework (SOC 2, PCI DSS, HIPAA, ISO 27001), auditors typically ask for:

1. **Configuration evidence**: What controls are in place right now
2. **Operational evidence**: Proof that controls have been working over the audit period
3. **Change evidence**: History of changes to security controls
4. **Incident evidence**: How security events were detected and handled
5. **Access evidence**: Who accessed what systems and data

## Collecting Configuration Evidence

Snapshot your Istio security configuration regularly and store it somewhere immutable.

Create a script that exports all relevant configuration:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
EVIDENCE_DIR="/evidence/config-snapshots/$DATE"
mkdir -p "$EVIDENCE_DIR"

# mTLS configuration
kubectl get peerauthentication --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/peer-authentication.yaml"

# Authorization policies
kubectl get authorizationpolicies --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/authorization-policies.yaml"

# Request authentication policies
kubectl get requestauthentication --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/request-authentication.yaml"

# Destination rules (TLS settings, circuit breaking)
kubectl get destinationrules --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/destination-rules.yaml"

# Virtual services (traffic routing)
kubectl get virtualservices --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/virtual-services.yaml"

# Gateway configurations
kubectl get gateways --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/gateways.yaml"

# Sidecar configurations
kubectl get sidecars --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/sidecars.yaml"

# Telemetry configuration
kubectl get telemetry --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/telemetry.yaml"

# Istio mesh configuration
kubectl get configmap istio -n istio-system -o yaml \
  > "$EVIDENCE_DIR/mesh-config.yaml"

# Network policies (Kubernetes level)
kubectl get networkpolicies --all-namespaces -o yaml \
  > "$EVIDENCE_DIR/network-policies.yaml"

# Generate a summary
echo "Configuration Evidence Summary - $DATE" > "$EVIDENCE_DIR/summary.txt"
echo "" >> "$EVIDENCE_DIR/summary.txt"
echo "PeerAuthentication policies: $(kubectl get peerauthentication --all-namespaces --no-headers | wc -l)" >> "$EVIDENCE_DIR/summary.txt"
echo "AuthorizationPolicies: $(kubectl get authorizationpolicies --all-namespaces --no-headers | wc -l)" >> "$EVIDENCE_DIR/summary.txt"
echo "RequestAuthentication: $(kubectl get requestauthentication --all-namespaces --no-headers | wc -l)" >> "$EVIDENCE_DIR/summary.txt"
echo "DestinationRules: $(kubectl get destinationrules --all-namespaces --no-headers | wc -l)" >> "$EVIDENCE_DIR/summary.txt"

echo "Snapshot completed: $EVIDENCE_DIR"
```

Schedule this as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: config-evidence-collector
  namespace: compliance
spec:
  schedule: "0 0 * * *"  # Daily at midnight
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: evidence-collector
          containers:
            - name: collector
              image: bitnami/kubectl:latest
              command: ["/bin/bash", "/scripts/collect-config.sh"]
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
                - name: evidence
                  mountPath: /evidence
          volumes:
            - name: scripts
              configMap:
                name: evidence-collection-scripts
                defaultMode: 0755
            - name: evidence
              persistentVolumeClaim:
                claimName: evidence-storage
          restartPolicy: OnFailure
```

## Collecting Operational Evidence

Operational evidence proves that controls worked throughout the audit period. This comes from metrics and logs.

### mTLS Enforcement Evidence

Show that encryption was maintained continuously:

```bash
#!/bin/bash
# Query: Daily mTLS compliance rate for the past 30 days
for i in $(seq 0 29); do
  DATE=$(date -d "$i days ago" +%Y-%m-%d)
  RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
    --data-urlencode "query=
      sum(increase(istio_requests_total{connection_security_policy=\"mutual_tls\"}[24h] offset ${i}d))
      /
      sum(increase(istio_requests_total[24h] offset ${i}d))
      * 100" | jq -r '.data.result[0].value[1]')
  echo "$DATE: $RATE% mTLS"
done
```

### Access Control Enforcement Evidence

Show that authorization policies were enforced:

```bash
# Daily denied request counts
curl -s "http://prometheus:9090/api/v1/query_range" \
  --data-urlencode 'query=sum(increase(istio_requests_total{response_code="403"}[24h])) by (destination_service_namespace)' \
  --data-urlencode 'start=2026-01-01T00:00:00Z' \
  --data-urlencode 'end=2026-02-24T00:00:00Z' \
  --data-urlencode 'step=86400' | jq '.data.result'
```

### Certificate Health Evidence

Show that certificates were valid throughout the period:

```bash
# Check CA certificate expiry
kubectl get secret cacerts -n istio-system \
  -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | \
  openssl x509 -noout -dates

# Check root certificate expiry
kubectl get secret cacerts -n istio-system \
  -o jsonpath='{.data.root-cert\.pem}' | base64 -d | \
  openssl x509 -noout -dates
```

## Collecting Change Evidence

Change evidence shows what was modified, when, and by whom. The best approach is GitOps, where all Istio configurations are stored in Git.

If you're using GitOps:

```bash
# Generate change report from Git history
git log --since="2025-01-01" --until="2026-01-01" \
  --pretty=format:"%h %ad %an - %s" --date=short \
  -- 'k8s/istio/' 'policies/' | while read line; do
  echo "| $line |"
done
```

If you're not using GitOps, pull change events from Kubernetes:

```bash
# Recent changes to security resources
kubectl get events --all-namespaces \
  --field-selector reason=Updated \
  -o json | jq '.items[] |
  select(.involvedObject.kind |
    IN("AuthorizationPolicy", "PeerAuthentication", "RequestAuthentication")) | {
      time: .lastTimestamp,
      kind: .involvedObject.kind,
      name: .involvedObject.name,
      namespace: .involvedObject.namespace
  }'
```

## Collecting Access Evidence

Access evidence shows who accessed sensitive systems. Istio access logs provide this:

```bash
# Extract access records for sensitive namespaces
kubectl logs -n payment-processing -l app=payment-api -c istio-proxy \
  --since=720h | jq '{
    timestamp: .start_time,
    source: .downstream_peer_uri_san,
    method: .method,
    path: .path,
    response_code: .response_code,
    duration_ms: .duration
  }' > /evidence/access-logs/payment-api-$(date +%Y-%m-%d).json
```

For long-term retention, ship logs to a dedicated evidence store:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: evidence-log-collector
  namespace: logging
data:
  output.conf: |
    [OUTPUT]
        Name              s3
        Match             evidence.*
        bucket            audit-evidence-bucket
        region            us-west-2
        total_file_size   100M
        upload_timeout    5m
        s3_key_format     /access-logs/%Y/%m/%d/$TAG_%H%M%S
        store_dir         /tmp/fluent-bit-buffer
```

## Evidence Integrity

Auditors want assurance that evidence hasn't been tampered with. Use checksums and immutable storage:

```bash
#!/bin/bash
EVIDENCE_DIR="/evidence/config-snapshots/$(date +%Y-%m-%d)"

# Generate checksums for all evidence files
find "$EVIDENCE_DIR" -type f | while read file; do
  sha256sum "$file"
done > "$EVIDENCE_DIR/checksums.sha256"

# Sign the checksum file (if you have GPG set up)
gpg --armor --detach-sign "$EVIDENCE_DIR/checksums.sha256"
```

Upload to immutable storage:

```bash
aws s3 cp "$EVIDENCE_DIR" "s3://audit-evidence/config/$(date +%Y-%m-%d)/" \
  --recursive --storage-class GLACIER_IR
```

## Building an Evidence Collection Dashboard

Create a Grafana dashboard that tracks evidence collection status:

```json
{
  "panels": [
    {
      "title": "Last Config Snapshot",
      "type": "stat",
      "description": "Time since last configuration evidence snapshot"
    },
    {
      "title": "mTLS Compliance Trend",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(istio_requests_total{connection_security_policy='mutual_tls'}) / sum(istio_requests_total) * 100"
        }
      ]
    },
    {
      "title": "Policy Change Count (Last 30d)",
      "type": "stat"
    },
    {
      "title": "Access Log Volume (GB/day)",
      "type": "timeseries"
    }
  ]
}
```

## Evidence Organization for Auditors

Organize your evidence in a structure that makes sense to auditors. Map it to the compliance framework:

```text
evidence/
  soc2/
    CC6.1-encryption/
      config-snapshots/
      mtls-compliance-reports/
    CC6.3-access-control/
      authorization-policies/
      denied-access-reports/
    CC7.1-monitoring/
      alert-configurations/
      alert-history/
    CC7.2-audit-logging/
      access-log-samples/
      log-retention-proof/
  change-management/
    policy-change-history/
    git-commit-logs/
```

Provide an index document that tells auditors where to find evidence for each control. This saves them time and makes the audit go much smoother.

## Automation is Key

Manual evidence collection doesn't scale and is error-prone. Automate everything:

- Daily configuration snapshots
- Weekly operational metric reports
- Continuous access log shipping
- Automated change tracking through GitOps
- Scheduled evidence integrity checks

The goal is that when an auditor asks for evidence of a specific control, you can produce it in minutes, not days. That level of readiness comes from building the collection pipeline once and letting it run continuously.

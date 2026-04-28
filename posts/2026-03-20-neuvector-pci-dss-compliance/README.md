# How to Set Up NeuVector for PCI DSS Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, PCI DSS, Compliance, Container Security, Payment Security

Description: Configure NeuVector to meet PCI DSS requirements for containerized applications handling payment card data, with specific controls for requirements 1, 2, 6, 10, and 11.

## Introduction

PCI DSS (Payment Card Industry Data Security Standard) applies to any organization that stores, processes, or transmits cardholder data. For containerized applications, NeuVector provides security controls that address multiple PCI DSS requirements. This guide maps PCI DSS requirements to specific NeuVector configurations.

## PCI DSS Requirements Addressed by NeuVector

| PCI Requirement | NeuVector Capability |
|---|---|
| 1: Network Controls | Network rules and segmentation |
| 2: Secure Configurations | CIS Benchmarks, admission control |
| 6: Secure Software | Vulnerability scanning |
| 7: Access Control | RBAC, admission control |
| 8: Strong Authentication | SAML/LDAP SSO |
| 10: Logging and Monitoring | Audit logs, security events |
| 11: Regular Testing | Compliance scans, penetration testing support |

## Prerequisites

- NeuVector installed and running
- Cardholder Data Environment (CDE) workloads identified
- NeuVector Manager access
- Understanding of your payment data flows

## Step 1: Segment the Cardholder Data Environment

PCI Requirement 1.3: Prohibit direct public access to the CDE.

```bash
# Create a group for CDE workloads

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "cde-workloads",
      "comment": "Cardholder Data Environment",
      "criteria": [
        {
          "key": "namespace",
          "value": "payment-processing",
          "op": "="
        }
      ]
    }
  }'

# Set CDE to Protect mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/cde-workloads" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"mode": "Protect"}}'
```

Network segmentation rules:

```yaml
# pci-network-segmentation.yaml
apiVersion: neuvector.com/v1
kind: NvClusterSecurityRule
metadata:
  name: cde-segmentation
  namespace: neuvector
spec:
  target:
    policymode: Protect
    selector:
      matchLabels:
        pci-scope: cde
  ingress:
    # Only allow ingress from the payment gateway proxy
    - action: allow
      name: allow-payment-proxy
      selector:
        matchLabels:
          app: payment-gateway-proxy
      ports:
        - protocol: TCP
          port: 443
  egress:
    # Allow egress to card networks only
    - action: allow
      name: allow-visa-mastercard
      selector:
        matchLabels:
          nv.ip.ext: ""
      ports:
        - protocol: TCP
          port: 443
    # Allow database access
    - action: allow
      name: allow-payment-db
      selector:
        matchLabels:
          app: payment-database
      ports:
        - protocol: TCP
          port: 5432
    # Deny all other egress
    - action: deny
      name: deny-all-other
      selector: {}
```

## Step 2: Enforce Secure Configurations (PCI Req 2)

PCI Requirement 2.2: Develop configuration standards for all system components.

```bash
# Run CIS Benchmark scans (replace ${HOST_ID} with each host ID from /v1/host)
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
  -H "X-Auth-Token: ${TOKEN}"

# Block containers running as root in CDE
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "PCI 2.2: Block root containers in payment namespace",
      "criteria": [
        {"name": "runAsRoot", "op": "=", "value": "true"},
        {"name": "namespace", "op": "containsAny", "value": "payment-processing"}
      ],
      "rule_type": "deny"
    }
  }'

# Block privileged containers in CDE
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "PCI 2.2: Block privileged containers in CDE",
      "criteria": [
        {"name": "runAsPrivileged", "op": "=", "value": "true"},
        {"name": "namespace", "op": "containsAny", "value": "payment-processing"}
      ],
      "rule_type": "deny"
    }
  }'
```

## Step 3: Vulnerability Scanning for CDE (PCI Req 6)

PCI Requirement 6.3: Protect web-facing applications against known vulnerabilities.

```bash
# Set up registry scanning for CDE images
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "cde-registry",
      "registry": "https://registry.company.com",
      "username": "scanner",
      "password": "scanner-token",
      "filters": ["payment/*"],
      "scan_layers": true,
      "rescan_after_db_update": true,
      "schedule": {"schedule": "daily"}
    }
  }'

# Block high/critical CVEs in CDE via admission control
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "PCI 6.3: Block images with critical CVEs in CDE",
      "criteria": [
        {"name": "cveCriticalCount", "op": ">=", "value": "1"},
        {"name": "namespace", "op": "containsAny", "value": "payment-processing"}
      ],
      "rule_type": "deny"
    }
  }'
```

## Step 4: Configure DLP for Cardholder Data (PCI Req 3, 4)

PCI Requirements 3 and 4 require protecting cardholder data at rest and in transit.

```bash
# Create DLP sensor for cardholder data
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/dlp/sensor" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "pci-cardholder-data",
      "comment": "PCI DSS cardholder data detection",
      "rules": [
        {
          "name": "primary-account-number",
          "patterns": [
            {
              "key": "packet",
              "op": "regex",
              "value": "\\b4[0-9]{12}(?:[0-9]{3})?\\b|\\b5[1-5][0-9]{14}\\b|\\b3[47][0-9]{13}\\b|\\b6(?:011|5[0-9]{2})[0-9]{12}\\b",
              "context": "packet",
              "name": "credit-card-number"
            }
          ]
        },
        {
          "name": "cvv-detection",
          "patterns": [
            {
              "key": "packet",
              "op": "regex",
              "value": "(?i)cvv[\\s:=]+[0-9]{3,4}|cvc[\\s:=]+[0-9]{3,4}",
              "context": "packet",
              "name": "cvv-pattern"
            }
          ]
        }
      ]
    }
  }'

# Apply DLP to CDE workloads
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/cde-workloads" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "dlp_sensors": [
        {"name": "pci-cardholder-data", "action": "alert"}
      ]
    }
  }'
```

## Step 5: Configure Audit Logging (PCI Req 10)

PCI Requirement 10.2: Audit log specific events.

```bash
# Configure syslog for audit trail
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "syslog_ip": "siem.company.com",
      "syslog_port": 1514,
      "syslog_ip_proto": "tcp",
      "syslog_level": "Info",
      "syslog_status": true,
      "syslog_categories": ["event", "security-event", "audit"]
    }
  }'
```

## Step 6: Generate PCI Compliance Report

```bash
#!/bin/bash
# pci-compliance-report.sh

DATE=$(date +%Y-%m-%d)

cat > pci-report-${DATE}.txt << EOF
PCI DSS Compliance Report
Date: ${DATE}

=== Requirement 1: Network Controls ===
EOF

# Network rules count
RULE_COUNT=$(curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.rules | length')
echo "Active network rules: ${RULE_COUNT}" >> pci-report-${DATE}.txt

echo "" >> pci-report-${DATE}.txt
echo "=== Requirement 6: Vulnerability Management ===" >> pci-report-${DATE}.txt

# Vulnerability summary (NeuVector folds critical CVEs into the high count)
curl -sk \
  "https://neuvector-manager:8443/v1/workload" \
  -H "X-Auth-Token: ${TOKEN}" | jq -r '"
Scanned containers: \(.workloads | length)
High CVEs: \([.workloads[].scan_summary.high] | add)
Medium CVEs: \([.workloads[].scan_summary.medium] | add)
"' >> pci-report-${DATE}.txt

echo "PCI report generated: pci-report-${DATE}.txt"
```

## Conclusion

NeuVector provides the technical controls needed to address multiple PCI DSS requirements for containerized applications. By configuring network segmentation, vulnerability scanning, DLP for cardholder data, and comprehensive audit logging, you build a defensible PCI DSS compliance posture. Remember that PCI DSS compliance requires not just technical controls but also documented policies, regular testing, and ongoing monitoring - NeuVector supports all of these operational requirements.

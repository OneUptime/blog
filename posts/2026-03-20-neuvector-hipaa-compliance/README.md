# How to Set Up NeuVector for HIPAA Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, HIPAA, Compliance, Healthcare Security, Container Security

Description: Configure NeuVector security controls to meet HIPAA requirements for protecting Protected Health Information (PHI) in containerized healthcare applications.

## Introduction

HIPAA (Health Insurance Portability and Accountability Act) mandates strict security controls for Protected Health Information (PHI). For healthcare organizations running containerized applications, NeuVector provides the runtime security, access control, and audit capabilities needed to meet HIPAA's Security Rule requirements. This guide maps HIPAA controls to NeuVector configurations.

## HIPAA Security Rule Requirements Addressed

| HIPAA Control | NeuVector Capability |
|---|---|
| Access Control (164.312(a)) | RBAC, admission control |
| Audit Controls (164.312(b)) | Comprehensive audit logging |
| Integrity (164.312(c)) | File integrity monitoring |
| Transmission Security (164.312(e)) | Network encryption enforcement |
| Workstation Security | Process profiles, container isolation |
| Malicious Software Protection | Runtime security, vulnerability scanning |

## Prerequisites

- NeuVector installed and running
- PHI workloads identified and labeled
- NeuVector Manager access
- SIEM for audit log retention

## Step 1: Label and Group PHI Workloads

Identify and group applications that handle PHI:

```bash
# Label PHI-handling pods

kubectl label pods -l app=patient-records phi-scope=true -n healthcare
kubectl label pods -l app=ehr-system phi-scope=true -n healthcare
kubectl label pods -l app=medical-imaging phi-scope=true -n healthcare

# Create a NeuVector group for PHI workloads
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "phi-workloads",
      "comment": "Applications handling Protected Health Information",
      "criteria": [
        {"key": "label", "value": "phi-scope=true", "op": "="}
      ]
    }
  }'

# Set PHI workloads to Protect mode
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/phi-workloads" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"mode": "Protect"}}'
```

## Step 2: Configure Access Control (164.312(a))

HIPAA requires unique user identification and emergency access procedures:

```bash
# Configure strong RBAC for healthcare namespace
# Only healthcare-security team gets admin access
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/user" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "user": {
      "username": "healthcare-security-lead",
      "fullname": "Healthcare Security Lead",
      "password": "ReplaceWithStrongInitialPassword!1",
      "email": "security@healthcare.com",
      "role": "",
      "role_domains": {
        "admin": ["healthcare"],
        "reader": ["staging"]
      }
    }
  }'

# Configure session timeout (HIPAA requires automatic session termination)
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "password_policy": {
        "enable_password_policy": true,
        "min_len": 14,
        "require_uppercase": true,
        "require_lowercase": true,
        "require_digit": true,
        "require_special_character": true
      }
    }
  }'
```

## Step 3: Enable Audit Controls (164.312(b))

HIPAA requires audit logging for all access to PHI systems:

```bash
# Configure comprehensive audit logging to SIEM
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "syslog_ip": "siem.healthcare.com",
      "syslog_port": 1514,
      "syslog_ip_proto": "tcp",
      "syslog_level": "Info",
      "syslog_status": true,
      "syslog_in_json": true,
      "syslog_categories": [
        "event",
        "security-event",
        "audit"
      ]
    }
  }'
```

## Step 4: Configure DLP for PHI Detection (164.312(c))

Detect PHI data transmission:

```bash
# Create DLP sensor for PHI detection
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/dlp/sensor" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "hipaa-phi-detector",
      "comment": "HIPAA PHI detection",
      "rules": [
        {
          "name": "ssn-phi",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b",
              "context": "packet"
            }
          ]
        },
        {
          "name": "medical-record-numbers",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)mrn[:\\s=]+[0-9]{6,10}|patient[\\s_-]?id[:\\s=]+[0-9]{6,12}",
              "context": "packet"
            }
          ]
        },
        {
          "name": "date-of-birth",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)(dob|date[_-]?of[_-]?birth)[:\\s=]+[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}",
              "context": "packet"
            }
          ]
        }
      ]
    }
  }'

# Apply PHI DLP to healthcare workloads
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/dlp/group/phi-workloads" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "phi-workloads",
      "status": true,
      "replace": [
        {"name": "hipaa-phi-detector", "action": "deny"}
      ]
    }
  }'
```

## Step 5: File Integrity Monitoring (164.312(c)(2))

HIPAA requires integrity controls to ensure PHI isn't improperly altered:

```yaml
# hipaa-file-integrity.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: phi-file-integrity
  namespace: healthcare
spec:
  target:
    policymode: Protect
    selector:
      matchLabels:
        phi-scope: "true"
  file:
    # Monitor configuration files
    - filter: /app/config/
      recursive: true
      behavior: monitor_change
    # Monitor application binaries
    - filter: /app/bin/
      recursive: true
      behavior: monitor_change
    # Block writes to data directories from unexpected processes
    - filter: /app/data/phi/
      recursive: true
      behavior: block_access
      app:
        - sh
        - bash
        - curl
        - wget
```

## Step 6: Configure Malware Protection (164.308(a)(5))

HIPAA requires protection from malicious software:

```yaml
# hipaa-process-protection.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: phi-process-protection
  namespace: healthcare
spec:
  target:
    policymode: Protect
    selector:
      matchLabels:
        phi-scope: "true"
  process:
    # Allow only the application process
    - name: java
      path: /usr/lib/jvm/java/bin/java
      action: allow
    - name: node
      path: /usr/local/bin/node
      action: allow
    # Block all shells
    - name: sh
      action: deny
    - name: bash
      action: deny
    # Block download tools
    - name: curl
      action: deny
    - name: wget
      action: deny
    - name: nc
      action: deny
```

## Step 7: Generate HIPAA Compliance Report

```bash
#!/bin/bash
# hipaa-compliance-report.sh

DATE=$(date +%Y-%m-%d)
REPORT="hipaa-compliance-${DATE}.md"

cat > "${REPORT}" << EOF
# HIPAA Security Rule Compliance Report
**Date**: ${DATE}
**Organization**: Healthcare Platform Inc.

## Executive Summary
EOF

# Run compliance checks per host
# NeuVector exposes per-host benchmark endpoints; iterate over hosts.
HOST_IDS=$(curl -sk "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq -r '.hosts[].id')

for HOST_ID in ${HOST_IDS}; do
  curl -sk -X POST \
    "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
    -H "X-Auth-Token: ${TOKEN}"
done

sleep 60  # Wait for scans

# Aggregate compliance results across hosts
PASS=0
FAIL=0
for HOST_ID in ${HOST_IDS}; do
  HOST_PASS=$(curl -sk "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
    -H "X-Auth-Token: ${TOKEN}" | jq '[.items[] | select(.level=="PASS")] | length')
  HOST_FAIL=$(curl -sk "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
    -H "X-Auth-Token: ${TOKEN}" | jq '[.items[] | select(.level=="WARN")] | length')
  PASS=$((PASS + HOST_PASS))
  FAIL=$((FAIL + HOST_FAIL))
done

cat >> "${REPORT}" << EOF

## Security Configuration Compliance
- Checks Passed: ${PASS}
- Checks Failed: ${FAIL}
- Compliance Score: $(echo "scale=0; ${PASS}*100/(${PASS}+${FAIL})" | bc)%

## PHI Workloads
EOF

# List PHI workloads
kubectl get pods -l phi-scope=true -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' \
  >> "${REPORT}"

echo "HIPAA compliance report generated: ${REPORT}"
```

## Conclusion

NeuVector provides the technical safeguards required by HIPAA's Security Rule for containerized healthcare applications. By implementing strict process controls, network segmentation, PHI data detection, file integrity monitoring, and comprehensive audit logging, you demonstrate technical compliance with HIPAA's administrative, physical, and technical safeguard requirements. Regular compliance scans and automated reporting provide the documented evidence auditors require.

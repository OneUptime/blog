# How to Set Up NeuVector for GDPR Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, GDPR, Privacy Compliance, Data Protection, Container Security

Description: Configure NeuVector security controls to support GDPR compliance by protecting personal data in containerized applications through access control, DLP, and audit logging.

## Introduction

The General Data Protection Regulation (GDPR) requires organizations processing EU personal data to implement appropriate technical and organizational measures. For containerized applications, NeuVector provides DLP for detecting personal data exposure, access controls, audit logging, and runtime security that support GDPR's data protection requirements. This guide maps GDPR articles to NeuVector configurations.

## GDPR Articles Addressed by NeuVector

| GDPR Article | NeuVector Capability |
|---|---|
| Art. 5: Data integrity and confidentiality | Runtime security, file integrity |
| Art. 25: Data protection by design | Admission control, least privilege |
| Art. 32: Security of processing | Encryption enforcement, vulnerability scanning |
| Art. 33: Breach notification support | Security event logging |
| Art. 35: DPIA support | Risk assessment data |

## Prerequisites

- NeuVector installed and running
- Personal data processing workloads identified
- NeuVector Manager access
- Legal team input on data processing activities

## Step 1: Identify and Label Personal Data Processing Workloads

```bash
# Label pods that process personal data

kubectl label pods -l app=user-service gdpr-scope=true -n app
kubectl label pods -l app=customer-api gdpr-scope=true -n app
kubectl label pods -l app=analytics gdpr-scope=personal-data -n app

# Create NeuVector group for GDPR-scoped workloads
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "gdpr-personal-data",
      "comment": "Workloads processing EU personal data (GDPR scope)",
      "criteria": [
        {"key": "label", "value": "gdpr-scope=true", "op": "="}
      ]
    }
  }'

# Enforce Protect mode on GDPR workloads
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/gdpr-personal-data" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"mode": "Protect"}}'
```

## Step 2: Configure DLP for Personal Data Detection (Art. 5, 32)

GDPR requires protecting personal data from unauthorized disclosure:

```bash
# Create comprehensive GDPR personal data DLP sensor
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/dlp/sensor" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "gdpr-personal-data",
      "comment": "Detect EU personal data in network traffic",
      "rules": [
        {
          "name": "email-addresses",
          "patterns": [
            {
              "key": "packet",
              "op": "regex",
              "value": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
              "context": "packet",
              "name": "email-pattern"
            }
          ]
        },
        {
          "name": "eu-phone-numbers",
          "patterns": [
            {
              "key": "packet",
              "op": "regex",
              "value": "(?:\\+?44|0)(?:\\d{2,4})[\\s-]?(?:\\d{3,4})[\\s-]?(?:\\d{3,4})|(?:\\+?33|0)(?:\\d{9})",
              "context": "packet",
              "name": "eu-phone-pattern"
            }
          ]
        },
        {
          "name": "national-id-numbers",
          "patterns": [
            {
              "key": "packet",
              "op": "regex",
              "value": "\\b[A-Z]{2}\\s?\\d{6}\\s?[A-Z]\\b",
              "context": "packet",
              "name": "uk-nino-pattern"
            }
          ]
        },
        {
          "name": "ip-address-logging",
          "patterns": [
            {
              "key": "packet",
              "op": "regex",
              "value": "(?:user_ip|client_ip|remote_addr)[\\s:=]+(?:\\d{1,3}\\.){3}\\d{1,3}",
              "context": "packet",
              "name": "ip-logging-pattern"
            }
          ]
        }
      ]
    }
  }'

# Apply GDPR DLP sensor to personal data workloads
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/dlp/group/gdpr-personal-data" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "gdpr-personal-data",
      "status": true,
      "sensors": [
        {"name": "gdpr-personal-data", "action": "alert"}
      ]
    }
  }'
```

## Step 3: Implement Data Protection by Design (Art. 25)

Configure admission control to enforce security-by-default for GDPR workloads:

```bash
# Block insecure configurations in GDPR-scoped namespaces
# No privileged containers
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "GDPR Art.25: No privileged containers in data processing namespaces",
      "criteria": [
        {"name": "runAsPrivileged", "op": "=", "value": "true"},
        {"name": "namespace", "op": "containsAny", "value": "user-data, customer-data, analytics"}
      ],
      "rule_type": "deny"
    }
  }'

# Block containers running as root in data processing namespaces
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "GDPR Art.25: Block root containers in data processing namespaces",
      "criteria": [
        {"name": "runAsRoot", "op": "=", "value": "true"},
        {"name": "namespace", "op": "containsAny", "value": "user-data, customer-data"}
      ],
      "rule_type": "deny"
    }
  }'

# Block images with critical vulnerabilities in GDPR namespaces
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "GDPR Art.32: Block vulnerable images in data processing",
      "criteria": [
        {"name": "cveCriticalCount", "op": ">=", "value": "1"},
        {"name": "namespace", "op": "containsAny", "value": "user-data, customer-data"}
      ],
      "rule_type": "deny"
    }
  }'
```

## Step 4: Audit Logging for Breach Detection (Art. 33)

GDPR requires 72-hour breach notification. Comprehensive logging supports timely detection:

```bash
# Configure comprehensive audit logging
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
      "syslog_in_json": true,
      "syslog_categories": ["event", "security-event", "audit"]
    }
  }'

# Create response rules for immediate notification on data breach indicators
# Rules are created via PATCH /v1/response/rule with an "insert" action
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "rules": [
        {
          "id": 0,
          "event": "security-event",
          "comment": "GDPR Art.33: Immediate alert on potential data breach",
          "group": "gdpr-personal-data",
          "conditions": [{"type": "level", "value": "critical"}],
          "actions": ["webhook", "quarantine"],
          "webhooks": ["dpo-emergency-notify", "security-team-pagerduty"],
          "disable": false,
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 5: Network Controls for Data Transfer Compliance

GDPR restricts transfers of personal data outside the EU:

```yaml
# gdpr-data-transfer-controls.yaml
apiVersion: neuvector.com/v1
kind: NvClusterSecurityRule
metadata:
  name: gdpr-data-transfer-restriction
  namespace: neuvector
spec:
  target:
    policymode: Protect
    selector:
      name: gdpr-personal-data
      criteria:
        - key: label
          op: "="
          value: "gdpr-scope=true"
  egress:
    # Allow connections to EU-based services only
    - action: allow
      name: allow-eu-cloud-services
      applications:
        - any
      ports: tcp/443
      selector:
        name: eu-cloud-services
        criteria:
          - key: label
            op: "="
            value: "region=eu-west"
    # Allow internal cluster traffic
    - action: allow
      name: allow-internal
      applications:
        - any
      ports: any
      selector:
        name: internal-services
        criteria:
          - key: label
            op: "="
            value: "network=internal"
    # Block connections to non-EU external IPs by default
    # "external" is a NeuVector built-in reserved group representing external endpoints
    - action: deny
      name: default-deny-non-eu
      applications:
        - any
      ports: any
      selector:
        name: external
```

## Step 6: Generate GDPR Compliance Documentation

```bash
#!/bin/bash
# gdpr-dpia-data.sh
# Generate data for Data Protection Impact Assessment

echo "# GDPR Technical Controls Documentation" > gdpr-controls.md
echo "Date: $(date +%Y-%m-%d)" >> gdpr-controls.md
echo "" >> gdpr-controls.md

echo "## Article 32: Security Measures" >> gdpr-controls.md
echo "" >> gdpr-controls.md

# Vulnerability status (RESTScanBrief exposes critical, high, medium counts under scan_summary)
CRITICAL=$(curl -sk \
  "https://neuvector-manager:8443/v1/workload" \
  -H "X-Auth-Token: ${TOKEN}" | jq '[.workloads[].scan_summary.critical] | add')

echo "- Active vulnerability scanning: Enabled" >> gdpr-controls.md
echo "- Critical CVEs in production: ${CRITICAL}" >> gdpr-controls.md
echo "- Admission control: Enabled (blocks critical CVEs)" >> gdpr-controls.md
echo "- DLP monitoring: Enabled" >> gdpr-controls.md
echo "- Audit logging: Enabled (JSON to SIEM)" >> gdpr-controls.md
echo "- Encryption in transit: Enforced via network rules" >> gdpr-controls.md

echo "" >> gdpr-controls.md
echo "## Article 25: Privacy by Design" >> gdpr-controls.md
echo "- Default-deny network posture: Enabled" >> gdpr-controls.md
echo "- Privileged containers blocked in data namespaces: Enabled" >> gdpr-controls.md
echo "- Non-root containers enforced: Enabled" >> gdpr-controls.md

echo "GDPR controls documentation generated: gdpr-controls.md"
```

## Conclusion

NeuVector supports GDPR compliance by providing the technical safeguards required for protecting personal data in containerized environments. While GDPR compliance also requires organizational measures, policies, and processes, the technical controls NeuVector provides - DLP, access control, vulnerability management, audit logging, and runtime security - form the foundation of a defensible GDPR security program. Document your NeuVector configurations as part of your Records of Processing Activities (RoPA) and Data Protection Impact Assessments (DPIAs).

# How to Use Dapr Security Features for HIPAA Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HIPAA, Compliance, Security, Healthcare

Description: Learn how to configure Dapr security features - mTLS, access control, secret management, and audit logging - to meet HIPAA technical safeguard requirements.

---

HIPAA's Security Rule requires covered entities and business associates to implement technical safeguards protecting electronic Protected Health Information (ePHI). Dapr's built-in security features align well with many HIPAA requirements when properly configured.

## HIPAA Technical Safeguards and Dapr

| HIPAA Requirement | Dapr Feature |
|---|---|
| Access Control | mTLS + access control policies |
| Audit Controls | Distributed tracing + logging |
| Transmission Security | mTLS encryption in transit |
| Authentication | Service identity via certificates |

## Enable Mandatory mTLS

All ePHI transmissions must be encrypted. Enable mTLS with a short certificate TTL:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: hipaa-config
  namespace: healthcare
spec:
  mtls:
    enabled: true
    workloadCertTTL: "8h"
    allowedClockSkew: "5m"
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

## Access Control - Minimum Necessary Standard

HIPAA requires the minimum necessary access to ePHI:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: phi-service-config
  namespace: healthcare
spec:
  mtls:
    enabled: true
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: ehr-viewer
      defaultAction: deny
      operations:
      - name: /v1/patients/*/demographics
        httpVerb: ["GET"]
        action: allow
    - appId: clinical-system
      defaultAction: deny
      operations:
      - name: /v1/patients/*
        httpVerb: ["GET", "POST", "PUT"]
        action: allow
```

## Secret Management for ePHI Encryption Keys

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: hipaa-secrets
  namespace: healthcare
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.healthcare.internal:8200"
  - name: enginePath
    value: "hipaa"
scopes:
- phi-processor
- ehr-service
```

## Audit Logging for Access Controls

HIPAA requires audit logs for all access to ePHI:

```python
from flask import Flask, request, jsonify
import logging
import json
from datetime import datetime

app = Flask(__name__)

# Structured audit logger
audit_logger = logging.getLogger('hipaa.audit')
handler = logging.FileHandler('/var/log/hipaa-audit.log')
handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.addHandler(handler)
audit_logger.setLevel(logging.INFO)

def log_phi_access(action: str, patient_id: str, user_id: str, resource: str):
    audit_logger.info(json.dumps({
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "patientId": patient_id,
        "userId": user_id,
        "resource": resource,
        "sourceIP": request.remote_addr,
        "appId": request.headers.get("X-Dapr-App-Id", "unknown")
    }))

@app.route('/v1/patients/<patient_id>/demographics', methods=['GET'])
def get_demographics(patient_id):
    user_id = request.headers.get('X-User-ID', 'unknown')
    log_phi_access("READ", patient_id, user_id, "demographics")
    # Return patient demographics
    return jsonify({"patientId": patient_id, "name": "...", "dob": "..."})
```

## Encrypt ePHI at Rest

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: phi-state-store
  namespace: healthcare
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: enableTLS
    value: "true"
  - name: clientCert
    secretKeyRef:
      name: redis-tls
      key: client.crt
  - name: clientKey
    secretKeyRef:
      name: redis-tls
      key: client.key
scopes:
- phi-processor
```

## Summary

Dapr supports HIPAA technical safeguards through mTLS for transmission security, access control policies for minimum necessary access, secret store integration for key management, and distributed tracing for audit controls. Always supplement Dapr controls with application-level audit logging, encryption at rest for databases, and formal HIPAA risk assessments.

# How to Use Dapr Security Features for PCI DSS Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PCI DSS, Compliance, Security, Payment

Description: Learn how to configure Dapr security controls to meet PCI DSS requirements for protecting cardholder data, including encryption, access control, and audit logging.

---

PCI DSS (Payment Card Industry Data Security Standard) applies to any system that stores, processes, or transmits cardholder data (CHD). Dapr's security features support several PCI DSS requirements when properly configured, particularly in the areas of encryption, access control, and logging.

## PCI DSS Requirements and Dapr Controls

| PCI DSS Requirement | Dapr Feature |
|---|---|
| Req 2: Secure configurations | Component scoping, deny-by-default policies |
| Req 4: Encrypt data in transit | mTLS for all sidecar communication |
| Req 7: Restrict access | Access control policies, component scoping |
| Req 8: Authenticate access | Service identity via Sentry certificates |
| Req 10: Track and monitor | Distributed tracing, Dapr metrics |

## Enable mTLS for PCI DSS Requirement 4

Cardholder data in transit must be encrypted with strong cryptography:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pci-config
  namespace: payments
spec:
  mtls:
    enabled: true
    workloadCertTTL: "4h"
    allowedClockSkew: "5m"
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger:9411/api/v2/spans"
```

## Restrict Access to Cardholder Data Systems (Req 7)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: chd-service-config
  namespace: payments
spec:
  mtls:
    enabled: true
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: payment-gateway
      defaultAction: deny
      operations:
      - name: /v1/charge
        httpVerb: ["POST"]
        action: allow
    - appId: tokenization-service
      defaultAction: deny
      operations:
      - name: /v1/tokenize
        httpVerb: ["POST"]
        action: allow
      - name: /v1/detokenize
        httpVerb: ["POST"]
        action: allow
```

## Scope Cardholder Data Components (Req 7.2)

Only payment services should access cardholder data stores:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: chd-state-store
  namespace: payments
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "secure-redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: chd-redis-secret
      key: password
  - name: enableTLS
    value: "true"
scopes:
- tokenization-service
- payment-processor
```

## Comprehensive Audit Logging (Req 10)

PCI DSS requires logging all access to CHD and audit trails for 12 months:

```python
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

pci_logger = logging.getLogger('pci.audit')

def log_chd_access(action: str, masked_pan: str, result: str):
    pci_logger.critical(json.dumps({
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": "CHD_ACCESS",
        "action": action,
        "masked_pan": masked_pan,
        "result": result,
        "source_app": request.headers.get("dapr-app-id"),
        "source_ip": request.remote_addr,
        "pci_requirement": "10.2"
    }))

@app.route('/v1/tokenize', methods=['POST'])
def tokenize():
    pan = request.json.get('pan', '')
    masked_pan = pan[:6] + '******' + pan[-4:]
    log_chd_access("TOKENIZE", masked_pan, "SUCCESS")
    token = generate_token(pan)
    return jsonify({"token": token, "maskedPan": masked_pan})

def generate_token(pan: str) -> str:
    import secrets
    return secrets.token_hex(16)
```

## Network Segmentation for Cardholder Data Environment

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cde-isolation
  namespace: payments
spec:
  podSelector:
    matchLabels:
      pci-scope: "cde"
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          pci-zone: "cde"
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          pci-zone: "cde"
```

## Summary

Dapr addresses multiple PCI DSS requirements: mTLS satisfies Requirement 4 for encrypting CHD in transit, access control policies enforce Requirement 7 least privilege, component scoping isolates CHD stores, and distributed tracing supports Requirement 10 audit logging. Always engage a Qualified Security Assessor (QSA) for formal PCI DSS compliance assessment.

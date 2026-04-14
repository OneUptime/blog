# How to Use Dapr for Government Digital Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Microservice, Government, Kubernetes, Security

Description: Learn how to use Dapr to build secure, interoperable government digital services with service invocation, secret management, and audit logging.

---

## Why Dapr Fits Government Workloads

Government digital services must meet strict requirements: data sovereignty, audit trails, zero-trust security, and integration with legacy systems. Dapr's building blocks address these needs without locking agencies into a single cloud provider or framework.

Typical government workloads include citizen portals, benefits processing, identity verification, and inter-agency data sharing. Dapr's sidecar model means each microservice gets consistent security and observability without custom code.

## Setting Up a Government Service with Dapr

Deploy Dapr on a Kubernetes cluster with strict namespace isolation and mTLS enabled:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: gov-dapr-config
  namespace: citizen-services
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://otel-collector:9411/api/v2/spans"
```

## Secret Management for Sensitive Data

Government services handle PII and classified data. Use Dapr's secrets API backed by HashiCorp Vault or Azure Key Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gov-secrets
  namespace: citizen-services
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.agency.gov:8200"
  - name: caCert
    value: "/certs/ca.crt"
  - name: skipVerify
    value: "false"
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault"
```

Retrieve secrets in your service:

```python
import dapr.clients as dapr_client

with dapr_client.DaprClient() as client:
    secret = client.get_secret(
        store_name="gov-secrets",
        key="db-connection-string"
    )
    conn_str = secret.secret["db-connection-string"]
```

## Audit Logging with Pub/Sub

All citizen-facing operations must be auditable. Publish audit events to a durable topic:

```python
import json
from dapr.clients import DaprClient

def record_audit_event(user_id: str, action: str, resource: str):
    with DaprClient() as client:
        event = {
            "userId": user_id,
            "action": action,
            "resource": resource,
            "timestamp": "2026-03-31T12:00:00Z",
            "serviceId": "benefits-api"
        }
        client.publish_event(
            pubsub_name="gov-pubsub",
            topic_name="audit-events",
            data=json.dumps(event),
            data_content_type="application/json"
        )
```

## Access Control with Dapr Policies

Restrict which services can call which endpoints using Dapr access control policies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: benefits-api-config
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "agency.gov"
    policies:
    - appId: identity-service
      defaultAction: deny
      trustDomain: "agency.gov"
      namespace: "citizen-services"
      operations:
      - name: /verify
        httpVerb: ["POST"]
        action: allow
```

## Summary

Dapr simplifies government digital service development by providing built-in mTLS, secret management, and pub/sub audit logging without proprietary cloud dependencies. Access control policies enforce zero-trust between microservices, while distributed tracing satisfies compliance requirements. Agencies can migrate legacy systems incrementally by wrapping them as Dapr-enabled services.

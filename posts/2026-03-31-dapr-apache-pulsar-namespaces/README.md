# How to Configure Apache Pulsar Namespaces for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pulsar, Namespace, Pub/Sub, Multi-Tenant

Description: Configure Apache Pulsar namespaces for Dapr pub/sub, including tenant and namespace setup, retention policies, message TTL, and authentication with JWT tokens.

---

## Apache Pulsar Namespace Concepts

In Pulsar, topics live within a namespace: `{tenant}/{namespace}/{topic}`. Namespaces group topics by team or application and apply shared configuration like retention, TTL, replication, and authentication policies. Dapr's Pulsar component maps directly to this hierarchy.

## Create Tenant and Namespace

```bash
# Create tenant
bin/pulsar-admin tenants create mycompany \
  --admin-roles admin \
  --allowed-clusters standalone

# Create namespace with policies
bin/pulsar-admin namespaces create mycompany/orders \
  --clusters standalone

# Set retention - keep messages for 7 days or up to 10GB
bin/pulsar-admin namespaces set-retention mycompany/orders \
  --time 7d \
  --size 10G

# Set message TTL - messages expire after 24 hours
bin/pulsar-admin namespaces set-message-ttl mycompany/orders \
  --messageTTL 86400

# Set replication factor
bin/pulsar-admin namespaces set-persistence mycompany/orders \
  --bookkeeper-ensemble 3 \
  --bookkeeper-write-quorum 2 \
  --bookkeeper-ack-quorum 2
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pulsar-pubsub
  namespace: default
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
    - name: host
      value: "pulsar://pulsar-broker:6650"
    - name: consumerID
      value: "dapr-consumer"
    - name: tenant
      value: "mycompany"
    - name: namespace
      value: "orders"
    - name: persistent
      value: "true"
    - name: disableBatching
      value: "false"
    - name: maxConcurrentHandlers
      value: "10"
    - name: subscribeType
      value: "shared"
    - name: redeliveryDelay
      value: "10"
```

## JWT Authentication

```yaml
metadata:
  - name: host
    value: "pulsar+ssl://pulsar-broker:6651"
  - name: token
    secretKeyRef:
      name: pulsar-secret
      key: jwt-token
```

Create the secret:

```bash
# Generate JWT token for the Dapr service account
bin/pulsar tokens create --secret-key my-secret-key \
  --subject dapr-service > dapr-token.txt

kubectl create secret generic pulsar-secret \
  --from-file=jwt-token=dapr-token.txt
```

## TLS Configuration

```yaml
metadata:
  - name: host
    value: "pulsar+ssl://pulsar-broker:6651"
  - name: enableTLS
    value: "true"
```

Using the `pulsar+ssl://` scheme in the host URL enables TLS. The `enableTLS` field can also be set explicitly. The Dapr sidecar uses the system trust store for CA certificates, so mount any custom CA certs into the container's system trust store via a ConfigMap volume.

## Publishing to a Namespaced Topic

Dapr automatically prepends the namespace when the component has `namespace` set:

```python
from dapr.clients import DaprClient
import json

with DaprClient() as client:
    # Topic resolves to: persistent://mycompany/orders/payments
    client.publish_event(
        pubsub_name="pulsar-pubsub",
        topic_name="payments",
        data=json.dumps({"paymentId": "p1", "amount": 99.99}),
        data_content_type="application/json"
    )
```

## Namespace-Level Policies via REST API

```bash
# View all policies for a namespace
curl -s http://pulsar-admin:8080/admin/v2/namespaces/mycompany/orders \
  | jq '{retention, messageTtlInSeconds, persistence}'

# Update max consumers per subscription
curl -X POST \
  http://pulsar-admin:8080/admin/v2/namespaces/mycompany/orders/maxConsumersPerSubscription \
  -H "Content-Type: application/json" \
  -d '50'
```

## Summary

Configuring Apache Pulsar namespaces for Dapr requires creating the tenant and namespace in Pulsar first, then setting the `tenant` and `namespace` metadata fields in the Dapr component. Namespace-level retention, TTL, and persistence policies apply to all Dapr topics in that namespace automatically. Use JWT tokens for authentication in production, storing the token in a Kubernetes secret referenced by the component.

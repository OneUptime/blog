# How to Configure Dapr with Apache Pulsar Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Apache Pulsar, Pub/Sub, Messaging, Microservice

Description: Learn how to configure Dapr with Apache Pulsar as a pub/sub broker, using Pulsar's multi-tenancy, tiered storage, and geo-replication for enterprise messaging.

---

## Overview

Apache Pulsar is a cloud-native, distributed messaging and streaming platform. It separates storage from compute using Apache BookKeeper, supports multi-tenancy out of the box, and provides tiered storage for cost-effective long-term message retention. Dapr's Pulsar pub/sub component enables microservices to leverage these capabilities through Dapr's standard publish-subscribe API.

## Prerequisites

- A running Apache Pulsar cluster (version 3.x recommended)
- Dapr CLI and runtime installed
- pulsar-admin CLI for cluster management

## Deploying Pulsar on Kubernetes

Use the DataStax Luna Streaming or official Pulsar Helm chart:

```bash
helm repo add apache https://pulsar.apache.org/charts
helm repo update

helm install pulsar apache/pulsar \
  --set initialize=true \
  --set components.functions=false \
  --set components.proxy=true \
  --set broker.replicaCount=3 \
  --set bookkeeper.replicaCount=3 \
  --set zookeeper.replicaCount=3 \
  --namespace pulsar \
  --create-namespace \
  --timeout 600s
```

Get the broker service URL:

```bash
kubectl get svc -n pulsar pulsar-broker -o jsonpath='{.spec.clusterIP}'
```

## Configuring the Dapr Pulsar Pub/Sub Component

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
    value: "pulsar://pulsar-broker.pulsar.svc.cluster.local:6650"
  - name: enableTLS
    value: "false"
  - name: tenant
    value: "public"
  - name: namespace
    value: "default"
  - name: persistent
    value: "true"
  - name: disableBatching
    value: "false"
  - name: maxConcurrentHandlers
    value: "10"
  - name: subscribeType
    value: "shared"
```

For TLS-secured clusters:

```yaml
  - name: enableTLS
    value: "true"
```

Apply the component:

```bash
kubectl apply -f pulsar-pubsub.yaml
```

## Publishing Events

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Publish a shipment tracking event
await client.pubsub.publish("pulsar-pubsub", "shipments", {
  shipmentId: "SHIP-2026-00992",
  orderId: "ORD-2026-00310",
  status: "in-transit",
  carrier: "FedEx",
  trackingNumber: "7489275921839201",
  estimatedDelivery: "2026-04-02",
  currentLocation: "Chicago, IL"
});
```

## Subscribing to Events

```javascript
import { DaprServer } from "@dapr/dapr";

const server = new DaprServer({ serverHost: "127.0.0.1", serverPort: "3001" });

await server.pubsub.subscribe("pulsar-pubsub", "shipments", async (shipment) => {
  console.log(`Shipment ${shipment.shipmentId}: ${shipment.status}`);
  await updateDeliveryTracking(shipment);
  await notifyCustomer(shipment.orderId, shipment.status);
});

await server.start();
```

## Pulsar Multi-Tenancy

Pulsar's multi-tenancy allows you to isolate topics per team or environment:

```bash
# Create a tenant and namespace for your team
pulsar-admin tenants create my-team \
  --admin-roles my-team-admin \
  --allowed-clusters standalone

pulsar-admin namespaces create my-team/production
```

Update the component for the new namespace:

```yaml
  - name: tenant
    value: "my-team"
  - name: namespace
    value: "production"
```

## Monitoring Pulsar Topics

```bash
# View topic stats
pulsar-admin topics stats persistent://public/default/shipments

# Check subscription backlog
pulsar-admin topics stats persistent://public/default/shipments \
  | jq '.subscriptions[] | {name: .name, backlog: .msgBacklog}'
```

## Summary

Apache Pulsar as a Dapr pub/sub backend combines multi-tenancy, tiered storage, and geo-replication in a single platform. The `tenant` and `namespace` settings in the Dapr component enable fine-grained topic isolation, making Pulsar an excellent choice for enterprise deployments where multiple teams share messaging infrastructure.

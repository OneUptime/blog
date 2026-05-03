# How to Deploy ActiveMQ on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, ActiveMQ, Kubernetes, JMS, Message Broker, Helm

Description: Deploy Apache ActiveMQ Artemis on Rancher with persistent storage, management console access, and JMS queue configuration.

## Introduction

Apache ActiveMQ Artemis is the next-generation ActiveMQ broker supporting JMS, AMQP, STOMP, and MQTT. It's commonly used in Java enterprise environments. This guide deploys Artemis on Rancher using the official Helm chart.

## Prerequisites

- Rancher cluster with `kubectl` and `helm`
- StorageClass for message persistence

## Step 1: Install the Operator

The arkmq-org broker operator is published as an OCI Helm chart on Quay, so no `helm repo add` is required:

```bash
kubectl create namespace messaging

helm install artemis-operator \
  oci://quay.io/arkmq-org/helm-charts/arkmq-org-broker-operator \
  --namespace messaging
```

## Step 2: Define the Broker Custom Resource

The operator deploys brokers from an `ActiveMQArtemis` custom resource. Write the spec to a file:

```yaml
# artemis-broker.yaml
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemis
metadata:
  name: artemis-broker
  namespace: messaging
spec:
  deploymentPlan:
    size: 2                 # Active-passive HA pair
    persistenceEnabled: true
    messageMigration: true
    storage:
      size: 20Gi
      storageClassName: longhorn
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "2Gi"
        cpu: "1"
  adminUser: admin
  adminPassword: securepassword
```

## Step 3: Deploy ActiveMQ Artemis

```bash
kubectl apply -f artemis-broker.yaml
```

The operator reconciles the CR into a StatefulSet named `artemis-broker-ss` with two broker pods.

## Step 4: Verify Deployment

```bash
kubectl get pods -n messaging
kubectl logs -n messaging artemis-broker-ss-0 -f
```

## Step 5: Access Management Console

The operator creates a per-pod web console service named `<broker>-wconsj-0-svc`:

```bash
# Port-forward to the web console
kubectl port-forward svc/artemis-broker-wconsj-0-svc -n messaging 8161:8161

# Open http://localhost:8161/console
# Login with admin/securepassword
```

## Step 6: Create Queues via the Address CR

With the operator, queues and topics are provisioned through `ActiveMQArtemisAddress` custom resources rather than by editing `broker.xml` directly:

```yaml
# artemis-addresses.yaml
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemisAddress
metadata:
  name: order-queue
  namespace: messaging
spec:
  addressName: order.queue
  queueName: order.queue
  routingType: anycast
  removeFromBrokerOnDelete: true
---
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemisAddress
metadata:
  name: notification-topic
  namespace: messaging
spec:
  addressName: notification.topic
  routingType: multicast   # Pub/Sub topic
```

## Step 7: Connect Java Applications

The operator exposes brokers through a headless service named `<broker>-hdls-svc`. The CORE protocol listens on port 61616:

```java
// Java JMS connection example
ConnectionFactory factory = new ActiveMQConnectionFactory(
    "tcp://artemis-broker-hdls-svc.messaging.svc.cluster.local:61616"
);
Connection connection = factory.createConnection("admin", "securepassword");
connection.start();

Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
Queue queue = session.createQueue("order.queue");
MessageProducer producer = session.createProducer(queue);
```

## Conclusion

ActiveMQ Artemis is running on Rancher with persistent storage and a management console. The multi-protocol support (JMS, AMQP, STOMP, MQTT) makes it versatile for polyglot microservice environments.

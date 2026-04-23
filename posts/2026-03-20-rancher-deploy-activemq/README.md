# How to Deploy ActiveMQ on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, ActiveMQ, Message Queue, JMS

Description: Deploy Apache ActiveMQ Artemis on Rancher for JMS-compliant messaging with support for AMQP, STOMP, and MQTT protocols.

## Introduction

Apache ActiveMQ Artemis is the next-generation ActiveMQ broker that supports multiple messaging protocols including JMS, AMQP, STOMP, and MQTT. It's widely used in enterprise Java applications. This guide covers deploying ActiveMQ Artemis on Rancher using the ArkMQ Broker Operator, the current home of the ArtemisCloud operator project, for Kubernetes-native management.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.8+ installed
- kubectl access
- A StorageClass for persistent volumes

## Step 1: Install the ArkMQ Broker Operator

```bash
# Install ArkMQ Broker Operator
helm install activemq-operator oci://quay.io/arkmq-org/helm-charts/arkmq-org-broker-operator \
  --namespace activemq-operator \
  --create-namespace \
  --wait

# Verify operator
kubectl get pods -n activemq-operator
```

## Step 2: Deploy an ActiveMQ Artemis Broker

```yaml
# activemq-cluster.yaml - ActiveMQ Artemis cluster
apiVersion: broker.arkmq.org/v1beta2
kind: Broker
metadata:
  name: activemq-prod
  namespace: messaging
spec:
  deploymentPlan:
    # Number of broker instances
    size: 2

    # Enable authentication and persistence
    requireLogin: true
    persistenceEnabled: true
    enableMetricsPlugin: true

    # Storage configuration
    storage:
      storageClassName: standard
      size: 20Gi

    # Resource limits
    resources:
      limits:
        cpu: "2"
        memory: 2Gi
      requests:
        cpu: 500m
        memory: 1Gi

  console:
    expose: true

  # Acceptors (protocols)
  acceptors:
    - name: amqp
      port: 5672
      protocols: AMQP
      sslEnabled: false
    - name: stomp
      port: 61613
      protocols: STOMP
    - name: mqtt
      port: 1883
      protocols: MQTT

  # Address settings for queues
  brokerProperties:
    - addressSettings."#".deadLetterAddress=DLQ
    - addressSettings."#".autoCreateDeadLetterResources=true
    - addressSettings."#".expiryAddress=ExpiryQueue
    - addressSettings."#".autoCreateExpiryResources=true
    - addressSettings."#".maxDeliveryAttempts=5
    - addressSettings."#".redeliveryDelay=5000
    - addressSettings."#".maxRedeliveryDelay=60000
    - addressSettings."#".redeliveryMultiplier=2.0
    - addressSettings."#".messageCounterHistoryDayLimit=10

  # Admin user
  adminUser: admin
  adminPassword: AdminP@ss
```

```bash
# Create namespace and apply
kubectl create namespace messaging
kubectl apply -f activemq-cluster.yaml

# Check status
kubectl wait Broker activemq-prod --for=condition=Ready --namespace=messaging --timeout=240s
kubectl get pods -n messaging -l ActiveMQArtemis=activemq-prod
```

## Step 3: Configure Security

```yaml
# activemq-security.yaml - ActiveMQ security configuration
apiVersion: v1
kind: Secret
metadata:
  name: activemq-prod-jaas-config
  namespace: messaging
type: Opaque
stringData:
  login.config: |
    activemq {
        org.apache.activemq.artemis.spi.core.security.jaas.PropertiesLoginModule sufficient
            org.apache.activemq.jaas.properties.user="artemis-users.properties"
            org.apache.activemq.jaas.properties.role="artemis-roles.properties"
            baseDir="/home/jboss/amq-broker/etc";
        org.apache.activemq.artemis.spi.core.security.jaas.PropertiesLoginModule sufficient
            reload=true
            org.apache.activemq.jaas.properties.user="users.properties"
            org.apache.activemq.jaas.properties.role="roles.properties";
    };
  users.properties: |
    appuser=AppUserP@ss
  roles.properties: |
    app_role=appuser
---
apiVersion: v1
kind: Secret
metadata:
  name: activemq-prod-security-bp
  namespace: messaging
type: Opaque
stringData:
  security.properties: |
    securityRoles."#".admin.createNonDurableQueue=true
    securityRoles."#".admin.deleteNonDurableQueue=true
    securityRoles."#".admin.createDurableQueue=true
    securityRoles."#".admin.deleteDurableQueue=true
    securityRoles."#".admin.createAddress=true
    securityRoles."#".admin.deleteAddress=true
    securityRoles."#".admin.consume=true
    securityRoles."#".admin.browse=true
    securityRoles."#".admin.send=true
    securityRoles."#".admin.manage=true
    securityRoles."#".app_role.createNonDurableQueue=true
    securityRoles."#".app_role.consume=true
    securityRoles."#".app_role.browse=true
    securityRoles."#".app_role.send=true
```

```bash
kubectl apply -f activemq-security.yaml

kubectl patch broker activemq-prod -n messaging --type merge -p '{
  "spec": {
    "deploymentPlan": {
      "extraMounts": {
        "secrets": [
          "activemq-prod-jaas-config",
          "activemq-prod-security-bp"
        ]
      }
    }
  }
}'

kubectl wait Broker activemq-prod --for=condition=Ready --namespace=messaging --timeout=240s
```

## Step 4: Create Queues and Topics

```yaml
# activemq-addresses.yaml - Queue/topic definitions
apiVersion: v1
kind: Secret
metadata:
  name: activemq-prod-addresses-bp
  namespace: messaging
type: Opaque
stringData:
  addresses.properties: |
    addressConfigurations.orders.routingTypes=ANYCAST
    addressConfigurations.orders.queueConfigs."orders.processor".address=orders
    addressConfigurations.orders.queueConfigs."orders.processor".routingType=ANYCAST
    addressConfigurations.events.routingTypes=MULTICAST
    addressConfigurations.events.queueConfigs."events.subscriber".address=events
    addressConfigurations.events.queueConfigs."events.subscriber".routingType=MULTICAST
```

```bash
kubectl apply -f activemq-addresses.yaml

kubectl patch broker activemq-prod -n messaging --type merge -p '{
  "spec": {
    "deploymentPlan": {
      "extraMounts": {
        "secrets": [
          "activemq-prod-jaas-config",
          "activemq-prod-security-bp",
          "activemq-prod-addresses-bp"
        ]
      }
    }
  }
}'

kubectl wait Broker activemq-prod --for=condition=Ready --namespace=messaging --timeout=240s
```

## Step 5: Configure Application Connection

```yaml
# app-config.yaml - Application connecting to ActiveMQ Artemis
apiVersion: v1
kind: ConfigMap
metadata:
  name: activemq-config
  namespace: production
data:
  # AMQP connection string
  ACTIVEMQ_BROKER_URL: "amqp://appuser:AppUserP%40ss@activemq-prod-hdls-svc.messaging.svc.cluster.local:5672"
  # Artemis Core connection
  ACTIVEMQ_CORE_URL: "tcp://activemq-prod-hdls-svc.messaging.svc.cluster.local:61616?user=appuser&password=AppUserP%40ss"
  ACTIVEMQ_QUEUE: "orders.processor"
```

## Step 6: Access Management Console

```bash
# Port forward to ActiveMQ management console
kubectl port-forward -n messaging svc/activemq-prod-wconsj-0-svc 8161:8161

# Access at: http://localhost:8161/console
# Default credentials: admin/AdminP@ss
```

## Step 7: Monitor ActiveMQ

```yaml
# activemq-servicemonitor.yaml - Prometheus scraping
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: activemq-monitor
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - messaging
  selector:
    matchLabels:
      application: activemq-prod-app
  endpoints:
    - port: console-jolokia
      interval: 30s
```

## Troubleshooting

```bash
# Check broker status via Artemis CLI
kubectl exec -n messaging activemq-prod-ss-0 -- \
  amq-broker/bin/artemis queue stat \
  --url tcp://activemq-prod-hdls-svc.messaging.svc.cluster.local:61616 \
  --user admin \
  --password AdminP@ss

# Check DLQ
kubectl exec -n messaging activemq-prod-ss-0 -- \
  amq-broker/bin/artemis browser \
  --url tcp://activemq-prod-hdls-svc.messaging.svc.cluster.local:61616 \
  --user admin \
  --password AdminP@ss \
  --destination queue://DLQ

# View logs
kubectl logs -n messaging activemq-prod-ss-0 --tail=100

# Check journal files
kubectl exec -n messaging activemq-prod-ss-0 -- \
  ls /home/jboss/amq-broker/data/
```

## Conclusion

ActiveMQ Artemis on Rancher provides enterprise-grade messaging with JMS compatibility and multi-protocol support. The ArkMQ Broker Operator enables declarative Kubernetes management of broker configuration, security, and scaling. For organizations with existing JMS applications or requirements for protocol flexibility (AMQP, STOMP, MQTT), Artemis is an excellent choice that provides a clear migration path from legacy ActiveMQ while offering modern clustering and persistence features.

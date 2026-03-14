# How to Configure RabbitMQ Queues with Topology Operator via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, RabbitMQ, Topology Operator, Queues, Exchanges, AMQP

Description: Manage RabbitMQ queues, exchanges, and bindings with the Topology Operator using Flux CD for declarative message topology management.

---

## Introduction

The RabbitMQ Messaging Topology Operator extends the Cluster Operator with CRDs for managing RabbitMQ topology objects — queues, exchanges, bindings, virtual hosts, policies, and users — through Kubernetes resources. This means your entire AMQP topology: which queues exist, which exchanges route to them, and what dead-letter configurations are in place, is described in Git and automatically applied.

Managing RabbitMQ topology through Flux CD eliminates the common problem of undocumented queues created manually in the management UI. When a team needs a new queue, they open a pull request, and the Topology Operator creates it automatically.

## Prerequisites

- RabbitMQ Cluster Operator with a running cluster (see previous post)
- RabbitMQ Messaging Topology Operator installed (comes with the cluster operator Helm chart)
- `kubectl` and `flux` CLIs installed

## Step 1: Create a Virtual Host

Separate teams or applications using vhosts for isolation:

```yaml
# infrastructure/messaging/rabbitmq/topology/vhost-orders.yaml
apiVersion: rabbitmq.com/v1beta1
kind: Vhost
metadata:
  name: orders-vhost
  namespace: rabbitmq
spec:
  name: orders            # vhost name in RabbitMQ
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
```

## Step 2: Create Exchanges

```yaml
# infrastructure/messaging/rabbitmq/topology/exchanges.yaml
# Topic exchange for order events (routing by event type)
apiVersion: rabbitmq.com/v1beta1
kind: Exchange
metadata:
  name: orders-topic-exchange
  namespace: rabbitmq
spec:
  name: orders.topic
  type: topic
  durable: true
  autoDelete: false
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
---
# Direct exchange for commands
apiVersion: rabbitmq.com/v1beta1
kind: Exchange
metadata:
  name: orders-direct-exchange
  namespace: rabbitmq
spec:
  name: orders.direct
  type: direct
  durable: true
  autoDelete: false
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
---
# Fanout exchange for broadcasting
apiVersion: rabbitmq.com/v1beta1
kind: Exchange
metadata:
  name: orders-fanout-exchange
  namespace: rabbitmq
spec:
  name: orders.fanout
  type: fanout
  durable: true
  autoDelete: false
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
```

## Step 3: Create Queues

```yaml
# infrastructure/messaging/rabbitmq/topology/queues.yaml
# Quorum queue for order processing (HA, Raft-replicated)
apiVersion: rabbitmq.com/v1beta1
kind: Queue
metadata:
  name: order-processing-queue
  namespace: rabbitmq
spec:
  name: order.processing
  durable: true
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
  arguments:
    # Use quorum queue for HA (replaces classic mirrored queues)
    x-queue-type: quorum
    # Dead letter exchange for failed messages
    x-dead-letter-exchange: orders.topic
    x-dead-letter-routing-key: order.dead-letter
    # Message TTL: 24 hours
    x-message-ttl: 86400000
    # Max queue length: 100,000 messages
    x-max-length: 100000
    # Overflow behavior: drop head (oldest) messages
    x-overflow: drop-head
---
# Dead letter queue for failed order processing
apiVersion: rabbitmq.com/v1beta1
kind: Queue
metadata:
  name: order-dead-letter-queue
  namespace: rabbitmq
spec:
  name: order.dead-letter
  durable: true
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
  arguments:
    x-queue-type: quorum
    # Keep dead letters for 7 days
    x-message-ttl: 604800000
---
# Classic queue for notifications (no HA needed)
apiVersion: rabbitmq.com/v1beta1
kind: Queue
metadata:
  name: notification-queue
  namespace: rabbitmq
spec:
  name: notification.email
  durable: true
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
  arguments:
    x-queue-type: classic
    x-message-ttl: 3600000   # 1 hour TTL for notifications
```

## Step 4: Create Bindings

```yaml
# infrastructure/messaging/rabbitmq/topology/bindings.yaml
# Bind order.processing queue to orders.topic exchange
apiVersion: rabbitmq.com/v1beta1
kind: Binding
metadata:
  name: order-processing-binding
  namespace: rabbitmq
spec:
  source: orders.topic
  destination: order.processing
  destinationType: queue
  routingKey: "order.#"    # topic pattern: all order.* keys
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
---
# Bind dead-letter queue
apiVersion: rabbitmq.com/v1beta1
kind: Binding
metadata:
  name: dead-letter-binding
  namespace: rabbitmq
spec:
  source: orders.topic
  destination: order.dead-letter
  destinationType: queue
  routingKey: "order.dead-letter"
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
---
# Bind notification queue
apiVersion: rabbitmq.com/v1beta1
kind: Binding
metadata:
  name: notification-binding
  namespace: rabbitmq
spec:
  source: orders.fanout
  destination: notification.email
  destinationType: queue
  routingKey: ""  # fanout ignores routing keys
  vhostReference:
    name: orders-vhost
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
```

## Step 5: Create Users and Permissions

```yaml
# infrastructure/messaging/rabbitmq/topology/users.yaml
apiVersion: rabbitmq.com/v1beta1
kind: User
metadata:
  name: orders-service-user
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
  importCredentialsSecret:
    name: orders-service-rabbitmq-credentials
---
# Set permissions for the user in the vhost
apiVersion: rabbitmq.com/v1beta1
kind: Permission
metadata:
  name: orders-service-permission
  namespace: rabbitmq
spec:
  vhost: orders
  userReference:
    name: orders-service-user
  permissions:
    configure: "^order\\..*"   # can declare order.* queues/exchanges
    write: "^order\\..*"       # can publish to order.* exchanges
    read: "^order\\..*"        # can consume from order.* queues
  rabbitmqClusterReference:
    name: production
    namespace: rabbitmq
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/rabbitmq-topology-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rabbitmq-topology
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/rabbitmq/topology
  prune: true
  dependsOn:
    - name: rabbitmq-cluster
```

## Step 7: Verify Topology

```bash
# Check all topology resources
kubectl get queue,exchange,binding,vhost -n rabbitmq

# Check queue status in RabbitMQ
kubectl exec -n rabbitmq production-server-0 -- \
  rabbitmqctl list_queues name messages consumers --vhost orders

# Check exchange list
kubectl exec -n rabbitmq production-server-0 -- \
  rabbitmqctl list_exchanges --vhost orders

# Check bindings
kubectl exec -n rabbitmq production-server-0 -- \
  rabbitmqctl list_bindings --vhost orders
```

## Best Practices

- Prefer quorum queues (`x-queue-type: quorum`) over classic mirrored queues for HA — they are Raft-based and more reliable.
- Always configure a dead-letter exchange (`x-dead-letter-exchange`) on queues used for message processing to catch failed messages.
- Use virtual hosts to isolate different applications or teams — permissions are scoped per vhost.
- Set `x-message-ttl` to prevent queues from filling indefinitely if consumers fall behind.
- Manage user credentials with the Topology Operator's `User` CRD and `importCredentialsSecret` — never embed passwords in CRD specs.

## Conclusion

The RabbitMQ Messaging Topology Operator managed by Flux CD gives you a fully declarative AMQP topology where queues, exchanges, bindings, and user permissions are all described in Git. Topology changes are pull requests reviewed by your team and applied automatically. This eliminates the "tribal knowledge" problem where queue configurations exist only in the management UI and are lost when someone needs to recreate the broker from scratch.

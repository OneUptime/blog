# How to Use Dapr with Amazon MSK (Managed Kafka)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, MSK, Kafka, Pub/Sub, Streaming

Description: Configure Dapr pub/sub to use Amazon MSK (Managed Streaming for Apache Kafka) for durable, high-throughput event streaming between microservices.

---

Amazon MSK provides a fully managed Apache Kafka service. Dapr's Kafka pub/sub component connects to MSK, letting microservices publish and subscribe to Kafka topics without managing Kafka client libraries or broker connections.

## Create an MSK Cluster

```bash
# Create MSK cluster
aws kafka create-cluster \
  --cluster-name dapr-events \
  --kafka-version 3.5.1 \
  --number-of-broker-nodes 3 \
  --broker-node-group-info '{
    "InstanceType": "kafka.m5.large",
    "ClientSubnets": ["subnet-0a1b2c3d", "subnet-0e4f5a6b", "subnet-0c7d8e9f"],
    "SecurityGroups": ["sg-0abc123456"],
    "StorageInfo": {"EbsStorageInfo": {"VolumeSize": 100}}
  }' \
  --encryption-info '{
    "EncryptionInTransit": {
      "ClientBroker": "TLS",
      "InCluster": true
    }
  }' \
  --region us-east-1

# Get bootstrap brokers (after cluster is active)
aws kafka get-bootstrap-brokers \
  --cluster-arn arn:aws:kafka:us-east-1:123456789012:cluster/dapr-events/abc-123 \
  --region us-east-1
```

## Configure the Dapr Kafka Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: msk-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "b-1.dapr-events.abc.c1.kafka.us-east-1.amazonaws.com:9098,b-2.dapr-events.abc.c1.kafka.us-east-1.amazonaws.com:9098"
  - name: consumerGroup
    value: dapr-consumers
  - name: authType
    value: "awsiam"
  - name: region
    value: us-east-1
  - name: initialOffset
    value: oldest
  - name: maxMessageBytes
    value: "1048576"
```

## Enable IAM Authentication for MSK

MSK supports IAM authentication using the AWS_MSK_IAM SASL mechanism. Ensure the EKS node role or IRSA role has MSK permissions:

```bash
aws iam put-role-policy \
  --role-name DaprAppRole \
  --policy-name MSKPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeCluster",
          "kafka-cluster:ReadData",
          "kafka-cluster:WriteData",
          "kafka-cluster:CreateTopic",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:AlterGroup",
          "kafka-cluster:DescribeGroup"
        ],
        "Resource": [
          "arn:aws:kafka:us-east-1:123456789012:cluster/dapr-events/*",
          "arn:aws:kafka:us-east-1:123456789012:topic/dapr-events/*",
          "arn:aws:kafka:us-east-1:123456789012:group/dapr-events/*"
        ]
      }
    ]
  }'
```

## Publish Events to MSK

```python
import requests

def publish_order_event(order: dict):
    resp = requests.post(
        "http://localhost:3500/v1.0/publish/msk-pubsub/order-placed",
        json=order,
        headers={"Content-Type": "application/json"}
    )
    resp.raise_for_status()
    print(f"Published to MSK: order {order['id']}")

publish_order_event({
    "id": "order-001",
    "customerId": "cust-123",
    "items": [{"sku": "ITEM-A", "qty": 3}],
    "total": 89.97
})
```

## Subscribe to MSK Topics

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "msk-pubsub",
            "topic": "order-placed",
            "route": "/order-placed",
            "metadata": {
                "rawPayload": "false"
            }
        }
    ])

@app.route('/order-placed', methods=['POST'])
def handle_order():
    event = request.json
    order = event.get('data', {})
    print(f"Order received from Kafka: {order['id']}")
    fulfill_order(order)
    return jsonify({"status": "SUCCESS"})

def fulfill_order(order: dict):
    print(f"Fulfilling order: {order['id']}, total: ${order['total']}")

if __name__ == '__main__':
    app.run(port=8080)
```

## Configure Topic Partitioning

```python
# Publish with a partition key for ordered processing
requests.post(
    "http://localhost:3500/v1.0/publish/msk-pubsub/order-placed?metadata.partitionKey=cust-456",
    json={"id": "order-002", "customerId": "cust-456", "total": 25.00},
    headers={"Content-Type": "application/json"}
).raise_for_status()
```

## Summary

Dapr's Kafka pub/sub component integrates seamlessly with Amazon MSK using IAM authentication, eliminating the need to manage Kafka credentials. The component handles consumer group coordination, partition assignment, and offset management automatically. Publishing with a `partitionKey` header ensures ordering guarantees for related events, making MSK an ideal backend for high-throughput, ordered event streaming in AWS environments.

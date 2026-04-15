# How to Implement Data Replication with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Data Replication, Event-Driven, Architecture

Description: Replicate data across microservices using Dapr pub/sub events to maintain eventually consistent local copies without direct database coupling.

---

Data replication via pub/sub is a core pattern for maintaining eventual consistency in microservices. When a service changes data, it publishes an event. Other services subscribe to these events and update their local read models. Dapr pub/sub handles message delivery, retry, and dead-lettering, making this pattern reliable to implement.

## Architecture: Pub/Sub Data Replication

```text
Source Service -> Publishes Event -> Dapr Pub/Sub -> Subscriber Services
                                                   -> Update Local State Store
```

Each subscriber maintains a local replica of the data it needs, updated asynchronously via events. This eliminates cross-service database calls at read time.

## Setting Up Pub/Sub Component

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: kafka:9092
    - name: consumerGroup
      value: dapr-replication
    - name: maxMessageBytes
      value: "1048576"
```

## Publisher: Emitting Data Change Events

The source service publishes events whenever data changes:

```python
# catalog_service/catalog.py
import json
from dapr.clients import DaprClient
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class CatalogEvent:
    event_type: str  # "created", "updated", "deleted"
    entity_type: str
    entity_id: str
    data: dict
    version: int
    timestamp: str

def update_product(product_id: str, updates: dict):
    with DaprClient() as client:
        # Load current product
        current = client.get_state("statestore", f"product:{product_id}")
        product = json.loads(current.data)

        # Apply updates and increment version
        product.update(updates)
        product['version'] = product.get('version', 0) + 1
        product['updated_at'] = datetime.utcnow().isoformat()

        # Save updated product
        client.save_state("statestore", f"product:{product_id}",
                          json.dumps(product))

        # Publish replication event
        event = CatalogEvent(
            event_type="updated",
            entity_type="product",
            entity_id=product_id,
            data=product,
            version=product['version'],
            timestamp=product['updated_at']
        )
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="catalog.product.updated",
            data=json.dumps(asdict(event)),
            data_content_type="application/json"
        )
```

## Subscriber: Receiving and Applying Replicated Data

Services that need product data subscribe and maintain local replicas:

```python
# order_service/catalog_replica.py
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        'pubsubname': 'pubsub',
        'topic': 'catalog.product.updated',
        'route': '/events/catalog/product-updated',
        'metadata': {
            'rawPayload': 'false'
        }
    }, {
        'pubsubname': 'pubsub',
        'topic': 'catalog.product.created',
        'route': '/events/catalog/product-created',
    }])

@app.route('/events/catalog/product-updated', methods=['POST'])
def handle_product_updated():
    cloud_event = request.json
    event_data = cloud_event.get('data', {})

    product_id = event_data.get('entity_id')
    product_data = event_data.get('data', {})
    event_version = event_data.get('version', 0)

    with DaprClient() as client:
        # Check for out-of-order delivery using version
        current = client.get_state("order-statestore", f"replica:product:{product_id}")
        if current.data:
            current_product = json.loads(current.data)
            if current_product.get('version', 0) >= event_version:
                return jsonify({'status': 'SUCCESS'})  # Idempotent - skip older version

        # Store local replica
        client.save_state(
            store_name="order-statestore",
            key=f"replica:product:{product_id}",
            value=json.dumps(product_data)
        )

    return jsonify({'status': 'SUCCESS'})
```

## Handling Replication Lag and Consistency

For operations requiring consistent data, fall back to direct service invocation:

```python
def get_product_for_checkout(product_id: str, require_latest: bool = False):
    if require_latest:
        # Direct service call for strongly consistent reads
        with DaprClient() as client:
            result = client.invoke_method(
                app_id="catalog-service",
                method_name=f"products/{product_id}",
                http_verb="GET"
            )
            return json.loads(result.data)

    # Use local replica for eventually consistent reads (fast path)
    with DaprClient() as client:
        replica = client.get_state("order-statestore",
                                   f"replica:product:{product_id}")
        if replica.data:
            return json.loads(replica.data)

    # Fallback to service call if replica not yet populated
    return get_product_for_checkout(product_id, require_latest=True)
```

## Dead Letter Handling for Failed Replications

Dead letter topics are configured at the subscription level, not the pub/sub component level:

```yaml
# components/subscription.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: catalog-product-subscription
spec:
  pubsubname: pubsub
  topic: catalog.product.updated
  route: /events/catalog/product-updated
  deadLetterTopic: replication-dead-letter
```

## Summary

Data replication with Dapr pub/sub enables eventually consistent local replicas in each subscriber service. Using versioned events and idempotent handlers prevents out-of-order delivery issues, while dead letter topics capture failed replications for manual review or replay.

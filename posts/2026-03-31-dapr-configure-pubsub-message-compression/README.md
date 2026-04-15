# How to Configure Pub/Sub Message Compression in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Compression, Kafka, Messaging

Description: Configure message compression in Dapr pub/sub components to reduce network bandwidth and broker storage for high-volume message streams.

---

## Overview

Message compression reduces the size of data in transit and at rest in your message broker. Dapr's Kafka pub/sub component supports producer-side compression, while other backends like RabbitMQ rely on application-level compression.

## Kafka Compression Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "order-service"
  - name: compression
    value: "snappy"
  - name: maxMessageBytes
    value: "1048576"
```

Supported compression codecs: `none`, `gzip`, `snappy`, `lz4`, `zstd`.

## Choosing a Compression Algorithm

| Algorithm | Ratio | CPU Cost | Use Case |
|-----------|-------|----------|----------|
| `snappy` | Medium | Low | High throughput, latency-sensitive |
| `lz4` | Medium | Very low | Maximum throughput |
| `gzip` | High | High | Bandwidth-constrained, large payloads |
| `zstd` | High | Medium | Best balance of ratio and speed |

## Application-Level Compression for Other Backends

For backends without native compression support (RabbitMQ, Redis), compress at the application layer:

```python
import gzip
import json
import requests
import base64

def publish_compressed(pubsub_name, topic, data):
    payload = json.dumps(data).encode('utf-8')
    compressed = gzip.compress(payload)
    encoded = base64.b64encode(compressed).decode('utf-8')

    requests.post(
        f"http://localhost:3500/v1.0/publish/{pubsub_name}/{topic}",
        json={"compressed": True, "data": encoded},
        headers={"Content-Type": "application/json"}
    )

def handle_compressed_message(event_data):
    if event_data.get("compressed"):
        compressed = base64.b64decode(event_data["data"])
        payload = json.loads(gzip.decompress(compressed).decode('utf-8'))
    else:
        payload = event_data
    return payload
```

## Measuring Compression Effectiveness

```bash
# Check Kafka broker metrics for compression ratio
kubectl exec -it kafka-0 -- kafka-log-dirs.sh \
  --bootstrap-server localhost:9092 \
  --topic-list orders \
  --describe | grep -i compress

# Producer compression stats via JMX
kafka-run-class.sh kafka.tools.JmxTool \
  --object-name kafka.producer:type=producer-metrics,client-id=* \
  --attributes compression-rate-avg
```

## Configuring Max Message Size

When using compression, ensure your max message size accommodates pre-compression sizes:

```yaml
  - name: maxMessageBytes
    value: "10485760"  # 10MB uncompressed limit
```

Also update Kafka broker settings:

```bash
kubectl exec -it kafka-0 -- kafka-configs.sh \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name orders \
  --alter \
  --add-config max.message.bytes=10485760
```

## End-to-End Compression Verification

```bash
# Publish a large payload
curl -X POST http://localhost:3500/v1.0/publish/kafka-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"data": "'"$(python3 -c "print('x'*100000)")"'"}'

# Check actual bytes on the broker
kubectl exec -it kafka-0 -- du -sh /var/lib/kafka/data/orders-0/
```

## Summary

Enable Kafka producer compression in Dapr's Kafka pub/sub component using `compression: snappy` or `zstd` for a good balance of compression ratio and CPU overhead. For non-Kafka backends, implement application-level gzip compression with base64 encoding. Measure compression ratios using broker metrics to validate bandwidth savings in production.

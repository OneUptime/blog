# How to Send Large Messages in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Large Messages, Chunking, Compression, Claim Check Pattern, Java, Python

Description: A comprehensive guide to handling large messages in Kafka, covering configuration changes, compression strategies, message chunking, the claim check pattern, and best practices for efficient large payload processing.

---

Kafka has a default message size limit of 1MB, but many applications need to send larger payloads. This guide covers multiple approaches to handling large messages, from simple configuration changes to architectural patterns like chunking and claim checks.

## Understanding Kafka Message Limits

### Default Limits

| Configuration | Default | Description |
|---------------|---------|-------------|
| message.max.bytes | 1MB | Broker limit per message |
| max.request.size | 1MB | Producer request size limit |
| max.partition.fetch.bytes | 1MB | Consumer fetch size limit |
| fetch.max.bytes | 50MB | Total fetch size limit |

### Considerations

- Larger messages increase memory pressure on brokers
- Network bandwidth consumption increases
- Replication time increases
- Consumer processing time increases

## Approach 1: Increase Message Size Limits

### Broker Configuration

```properties
# server.properties
message.max.bytes=10485760  # 10MB
replica.fetch.max.bytes=10485760  # 10MB
```

### Producer Configuration

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class LargeMessageProducer {
    public static Producer<String, byte[]> createProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.ByteArraySerializer");

        // Increase max request size
        props.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 10485760);  // 10MB

        // Increase buffer memory for large messages
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);  // 64MB

        // Compression to reduce message size
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

        // Batching settings for large messages
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 1048576);  // 1MB batches
        props.put(ProducerConfig.LINGER_MS_CONFIG, 100);

        return new KafkaProducer<>(props);
    }
}
```

### Consumer Configuration

```java
import org.apache.kafka.clients.consumer.*;
import java.util.Properties;

public class LargeMessageConsumer {
    public static Consumer<String, byte[]> createConsumer(
            String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.ByteArrayDeserializer");

        // Increase fetch sizes
        props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG, 10485760);
        props.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG, 52428800);

        // Increase poll timeout for processing large messages
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 600000);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 10);

        return new KafkaConsumer<>(props);
    }
}
```

## Approach 2: Compression

### Compression Options

```java
// LZ4 - Fastest compression/decompression
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

// ZSTD - Best compression ratio
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd");

// Snappy - Good balance
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");

// GZIP - High compression, slower
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
```

### Pre-Compression in Application

```java
import java.io.*;
import java.util.zip.*;

public class CompressionUtils {

    public static byte[] compress(byte[] data) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (GZIPOutputStream gzos = new GZIPOutputStream(baos)) {
            gzos.write(data);
        }
        return baos.toByteArray();
    }

    public static byte[] decompress(byte[] compressed) throws IOException {
        ByteArrayInputStream bais = new ByteArrayInputStream(compressed);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (GZIPInputStream gzis = new GZIPInputStream(bais)) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = gzis.read(buffer)) != -1) {
                baos.write(buffer, 0, len);
            }
        }
        return baos.toByteArray();
    }
}
```

## Approach 3: Message Chunking

### Java Chunking Producer

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.header.internals.RecordHeader;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class ChunkingProducer {
    private final Producer<String, byte[]> producer;
    private final int chunkSize;
    private final String topic;

    public ChunkingProducer(String bootstrapServers, String topic, int chunkSizeKb) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.ByteArraySerializer");
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        this.producer = new KafkaProducer<>(props);
        this.chunkSize = chunkSizeKb * 1024;
        this.topic = topic;
    }

    public void sendLargeMessage(String key, byte[] payload) throws Exception {
        String messageId = UUID.randomUUID().toString();
        int totalChunks = (int) Math.ceil((double) payload.length / chunkSize);

        List<RecordMetadata> metadataList = new ArrayList<>();

        for (int i = 0; i < totalChunks; i++) {
            int start = i * chunkSize;
            int end = Math.min(start + chunkSize, payload.length);
            byte[] chunk = Arrays.copyOfRange(payload, start, end);

            ProducerRecord<String, byte[]> record = new ProducerRecord<>(topic, key, chunk);

            // Add chunk headers
            record.headers()
                .add(new RecordHeader("message-id",
                    messageId.getBytes(StandardCharsets.UTF_8)))
                .add(new RecordHeader("chunk-index",
                    String.valueOf(i).getBytes(StandardCharsets.UTF_8)))
                .add(new RecordHeader("total-chunks",
                    String.valueOf(totalChunks).getBytes(StandardCharsets.UTF_8)))
                .add(new RecordHeader("total-size",
                    String.valueOf(payload.length).getBytes(StandardCharsets.UTF_8)));

            RecordMetadata metadata = producer.send(record).get();
            metadataList.add(metadata);
        }

        System.out.printf("Sent %d chunks for message %s%n", totalChunks, messageId);
    }

    public void close() {
        producer.close();
    }
}
```

### Java Chunking Consumer

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.header.Header;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

public class ChunkingConsumer {
    private final Consumer<String, byte[]> consumer;
    private final Map<String, ChunkBuffer> buffers = new ConcurrentHashMap<>();
    private final long bufferTimeoutMs;

    public ChunkingConsumer(String bootstrapServers, String groupId,
                           long bufferTimeoutMs) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.ByteArrayDeserializer");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        this.consumer = new KafkaConsumer<>(props);
        this.bufferTimeoutMs = bufferTimeoutMs;
    }

    public void consume(String topic, MessageHandler handler) {
        consumer.subscribe(Collections.singletonList(topic));

        // Cleanup expired buffers periodically
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(this::cleanupExpiredBuffers,
            60, 60, TimeUnit.SECONDS);

        try {
            while (true) {
                ConsumerRecords<String, byte[]> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, byte[]> record : records) {
                    processChunk(record, handler);
                }
            }
        } finally {
            scheduler.shutdown();
            consumer.close();
        }
    }

    private void processChunk(ConsumerRecord<String, byte[]> record,
                             MessageHandler handler) {
        // Extract headers
        String messageId = getHeader(record, "message-id");
        int chunkIndex = Integer.parseInt(getHeader(record, "chunk-index"));
        int totalChunks = Integer.parseInt(getHeader(record, "total-chunks"));
        int totalSize = Integer.parseInt(getHeader(record, "total-size"));

        // Get or create buffer
        ChunkBuffer buffer = buffers.computeIfAbsent(messageId,
            k -> new ChunkBuffer(totalChunks, totalSize));

        // Add chunk
        buffer.addChunk(chunkIndex, record.value());

        // Check if complete
        if (buffer.isComplete()) {
            byte[] completeMessage = buffer.assemble();
            buffers.remove(messageId);

            System.out.printf("Assembled message %s (%d bytes)%n",
                messageId, completeMessage.length);

            handler.handle(record.key(), completeMessage);
        }
    }

    private String getHeader(ConsumerRecord<String, byte[]> record, String name) {
        Header header = record.headers().lastHeader(name);
        return header != null ?
            new String(header.value(), StandardCharsets.UTF_8) : null;
    }

    private void cleanupExpiredBuffers() {
        long now = System.currentTimeMillis();
        buffers.entrySet().removeIf(entry ->
            now - entry.getValue().createdAt > bufferTimeoutMs);
    }

    static class ChunkBuffer {
        final byte[][] chunks;
        final int totalSize;
        final long createdAt;
        int receivedChunks = 0;

        ChunkBuffer(int totalChunks, int totalSize) {
            this.chunks = new byte[totalChunks][];
            this.totalSize = totalSize;
            this.createdAt = System.currentTimeMillis();
        }

        synchronized void addChunk(int index, byte[] data) {
            if (chunks[index] == null) {
                chunks[index] = data;
                receivedChunks++;
            }
        }

        synchronized boolean isComplete() {
            return receivedChunks == chunks.length;
        }

        byte[] assemble() {
            byte[] result = new byte[totalSize];
            int offset = 0;
            for (byte[] chunk : chunks) {
                System.arraycopy(chunk, 0, result, offset, chunk.length);
                offset += chunk.length;
            }
            return result;
        }
    }

    interface MessageHandler {
        void handle(String key, byte[] payload);
    }
}
```

### Python Chunking Implementation

```python
from confluent_kafka import Producer, Consumer
import uuid
import json
from typing import Callable, Dict, List, Optional
import time

class ChunkingProducer:
    def __init__(self, bootstrap_servers: str, topic: str, chunk_size_kb: int = 512):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'acks': 'all',
            'enable.idempotence': True,
        }
        self.producer = Producer(self.config)
        self.topic = topic
        self.chunk_size = chunk_size_kb * 1024

    def delivery_report(self, err, msg):
        if err:
            print(f"Delivery failed: {err}")

    def send_large_message(self, key: str, payload: bytes):
        message_id = str(uuid.uuid4())
        total_chunks = (len(payload) + self.chunk_size - 1) // self.chunk_size

        for i in range(total_chunks):
            start = i * self.chunk_size
            end = min(start + self.chunk_size, len(payload))
            chunk = payload[start:end]

            headers = [
                ('message-id', message_id.encode()),
                ('chunk-index', str(i).encode()),
                ('total-chunks', str(total_chunks).encode()),
                ('total-size', str(len(payload)).encode()),
            ]

            self.producer.produce(
                self.topic,
                key=key,
                value=chunk,
                headers=headers,
                callback=self.delivery_report
            )

        self.producer.flush()
        print(f"Sent {total_chunks} chunks for message {message_id}")

    def close(self):
        self.producer.flush()


class ChunkBuffer:
    def __init__(self, total_chunks: int, total_size: int):
        self.chunks: Dict[int, bytes] = {}
        self.total_chunks = total_chunks
        self.total_size = total_size
        self.created_at = time.time()

    def add_chunk(self, index: int, data: bytes):
        self.chunks[index] = data

    def is_complete(self) -> bool:
        return len(self.chunks) == self.total_chunks

    def assemble(self) -> bytes:
        result = b''
        for i in range(self.total_chunks):
            result += self.chunks[i]
        return result


class ChunkingConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str,
                 buffer_timeout_sec: int = 300):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(self.config)
        self.buffers: Dict[str, ChunkBuffer] = {}
        self.buffer_timeout = buffer_timeout_sec

    def _get_header(self, msg, name: str) -> Optional[str]:
        headers = msg.headers() or []
        for header_name, header_value in headers:
            if header_name == name:
                return header_value.decode('utf-8')
        return None

    def _cleanup_expired_buffers(self):
        now = time.time()
        expired = [
            mid for mid, buf in self.buffers.items()
            if now - buf.created_at > self.buffer_timeout
        ]
        for mid in expired:
            del self.buffers[mid]

    def consume(self, topic: str, handler: Callable[[str, bytes], None]):
        self.consumer.subscribe([topic])
        last_cleanup = time.time()

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Consumer error: {msg.error()}")
                    continue

                # Extract headers
                message_id = self._get_header(msg, 'message-id')
                chunk_index = int(self._get_header(msg, 'chunk-index'))
                total_chunks = int(self._get_header(msg, 'total-chunks'))
                total_size = int(self._get_header(msg, 'total-size'))

                # Get or create buffer
                if message_id not in self.buffers:
                    self.buffers[message_id] = ChunkBuffer(total_chunks, total_size)

                buffer = self.buffers[message_id]
                buffer.add_chunk(chunk_index, msg.value())

                # Check if complete
                if buffer.is_complete():
                    complete_message = buffer.assemble()
                    del self.buffers[message_id]

                    print(f"Assembled message {message_id} ({len(complete_message)} bytes)")
                    handler(msg.key().decode() if msg.key() else None, complete_message)

                # Periodic cleanup
                if time.time() - last_cleanup > 60:
                    self._cleanup_expired_buffers()
                    last_cleanup = time.time()

        except KeyboardInterrupt:
            pass
        finally:
            self.consumer.close()
```

## Approach 4: Claim Check Pattern

Store the large payload in external storage and send only a reference through Kafka.

### Java Claim Check with S3

```java
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.core.sync.RequestBody;
import org.apache.kafka.clients.producer.*;
import java.util.*;

public class ClaimCheckProducer {
    private final Producer<String, String> producer;
    private final S3Client s3Client;
    private final String bucket;
    private final int sizeThreshold;

    public ClaimCheckProducer(String bootstrapServers, String bucket,
                              int sizeThresholdKb) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        this.producer = new KafkaProducer<>(props);
        this.s3Client = S3Client.builder().build();
        this.bucket = bucket;
        this.sizeThreshold = sizeThresholdKb * 1024;
    }

    public void sendMessage(String topic, String key, byte[] payload) {
        String value;

        if (payload.length > sizeThreshold) {
            // Store in S3
            String s3Key = "messages/" + UUID.randomUUID().toString();

            s3Client.putObject(
                PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(s3Key)
                    .build(),
                RequestBody.fromBytes(payload)
            );

            // Send reference
            value = String.format(
                "{\"type\":\"claim-check\",\"bucket\":\"%s\",\"key\":\"%s\",\"size\":%d}",
                bucket, s3Key, payload.length);
        } else {
            // Send inline
            value = String.format(
                "{\"type\":\"inline\",\"data\":\"%s\"}",
                Base64.getEncoder().encodeToString(payload));
        }

        producer.send(new ProducerRecord<>(topic, key, value));
    }

    public void close() {
        producer.close();
        s3Client.close();
    }
}

public class ClaimCheckConsumer {
    private final Consumer<String, String> consumer;
    private final S3Client s3Client;

    public ClaimCheckConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");

        this.consumer = new KafkaConsumer<>(props);
        this.s3Client = S3Client.builder().build();
    }

    public byte[] resolvePayload(String value) {
        // Parse JSON (simplified)
        if (value.contains("\"type\":\"claim-check\"")) {
            // Extract bucket and key
            String bucket = extractField(value, "bucket");
            String s3Key = extractField(value, "key");

            // Fetch from S3
            GetObjectResponse response = s3Client.getObject(
                GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(s3Key)
                    .build()
            ).response();

            return s3Client.getObjectAsBytes(
                GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(s3Key)
                    .build()
            ).asByteArray();
        } else {
            // Inline data
            String data = extractField(value, "data");
            return Base64.getDecoder().decode(data);
        }
    }

    private String extractField(String json, String field) {
        // Simplified JSON parsing
        int start = json.indexOf("\"" + field + "\":\"") + field.length() + 4;
        int end = json.indexOf("\"", start);
        return json.substring(start, end);
    }
}
```

### Python Claim Check with S3

```python
import boto3
import json
import base64
import uuid
from confluent_kafka import Producer, Consumer
from typing import Optional

class ClaimCheckProducer:
    def __init__(self, bootstrap_servers: str, bucket: str,
                 size_threshold_kb: int = 512):
        self.config = {'bootstrap.servers': bootstrap_servers}
        self.producer = Producer(self.config)
        self.s3_client = boto3.client('s3')
        self.bucket = bucket
        self.size_threshold = size_threshold_kb * 1024

    def send_message(self, topic: str, key: str, payload: bytes):
        if len(payload) > self.size_threshold:
            # Store in S3
            s3_key = f"messages/{uuid.uuid4()}"
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=payload
            )

            # Send reference
            value = json.dumps({
                'type': 'claim-check',
                'bucket': self.bucket,
                'key': s3_key,
                'size': len(payload)
            })
        else:
            # Send inline
            value = json.dumps({
                'type': 'inline',
                'data': base64.b64encode(payload).decode()
            })

        self.producer.produce(topic, key=key, value=value)
        self.producer.flush()


class ClaimCheckConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest'
        }
        self.consumer = Consumer(self.config)
        self.s3_client = boto3.client('s3')

    def resolve_payload(self, value: str) -> bytes:
        data = json.loads(value)

        if data['type'] == 'claim-check':
            response = self.s3_client.get_object(
                Bucket=data['bucket'],
                Key=data['key']
            )
            return response['Body'].read()
        else:
            return base64.b64decode(data['data'])
```

## Best Practices

### 1. Choose the Right Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| < 1MB messages | Default configuration |
| 1-10MB occasional | Increase limits + compression |
| 10-100MB frequent | Message chunking |
| > 100MB | Claim check pattern |
| Binary files/media | Claim check pattern |

### 2. Monitor Message Sizes

```java
// Producer interceptor to log message sizes
public class SizeMonitorInterceptor implements ProducerInterceptor<String, byte[]> {
    @Override
    public ProducerRecord<String, byte[]> onSend(ProducerRecord<String, byte[]> record) {
        int size = record.value().length;
        if (size > 500000) {
            System.out.printf("Large message: %d bytes to %s%n", size, record.topic());
        }
        return record;
    }

    // ... other methods
}
```

### 3. Set Appropriate Timeouts

```properties
# Producer
request.timeout.ms=60000
delivery.timeout.ms=300000

# Consumer
max.poll.interval.ms=600000
session.timeout.ms=60000
```

### 4. Use Compression

```properties
compression.type=zstd
```

## Conclusion

Handling large messages in Kafka requires choosing the right approach based on your specific requirements:

1. **Increase limits** for occasional large messages up to 10MB
2. **Use compression** to reduce message size
3. **Implement chunking** for very large messages that need to stay in Kafka
4. **Use claim check pattern** for binary files or extremely large payloads

Consider the trade-offs between simplicity, performance, and operational complexity when choosing your approach.

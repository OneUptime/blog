# How to Use Redis for IoT Data Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Data Ingestion, Sensors, Streams, Time Series, Edge Computing, MQTT

Description: A comprehensive guide to using Redis for IoT data ingestion, covering high-frequency sensor data buffering, stream processing, data validation, and efficient storage patterns for millions of devices.

---

IoT systems generate massive volumes of data from sensors, devices, and actuators. Redis serves as an excellent ingestion layer, buffering high-frequency data, validating inputs, and routing messages to downstream systems. This guide covers building robust IoT data ingestion pipelines with Redis.

## IoT Data Ingestion Challenges

IoT ingestion systems must handle:

1. **High throughput** - Millions of messages per second
2. **Bursty traffic** - Devices may send data in batches
3. **Variable schemas** - Different device types have different data formats
4. **Temporal ordering** - Data must be processed in order
5. **Reliability** - No data loss during processing
6. **Low latency** - Real-time alerting requirements

## Architecture Overview

```
+-------------+     +-----------+     +-------------+     +------------+
|   Devices   | --> |   MQTT    | --> |    Redis    | --> |  Consumers |
| (Millions)  |     |  Broker   |     |   Streams   |     | (Workers)  |
+-------------+     +-----------+     +-------------+     +------------+
                          |                  |                   |
                    Validation          Buffering           Processing
                                             |                   |
                                             v                   v
                                      +-------------+     +------------+
                                      | Time Series |     |  Storage   |
                                      |    (TSDB)   |     | (ClickHouse)|
                                      +-------------+     +------------+
```

## Basic Data Ingestion

### Stream-Based Ingestion

```python
import redis
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

@dataclass
class SensorReading:
    device_id: str
    sensor_type: str
    value: float
    unit: str
    timestamp: float
    metadata: Dict = None

class IoTDataIngester:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_prefix = "iot:stream"
        self.max_stream_length = 100000  # Auto-trim streams

    def ingest_reading(self, reading: SensorReading) -> str:
        """Ingest a single sensor reading into Redis Stream."""
        stream_key = f"{self.stream_prefix}:{reading.device_id}"

        # Prepare data for stream
        data = {
            "device_id": reading.device_id,
            "sensor_type": reading.sensor_type,
            "value": str(reading.value),
            "unit": reading.unit,
            "timestamp": str(reading.timestamp),
            "ingested_at": str(time.time())
        }

        if reading.metadata:
            data["metadata"] = json.dumps(reading.metadata)

        # Add to stream with auto-generated ID
        message_id = self.redis.xadd(
            stream_key,
            data,
            maxlen=self.max_stream_length,
            approximate=True
        )

        # Update device last seen
        self.redis.hset(
            f"device:{reading.device_id}:status",
            mapping={
                "last_seen": str(time.time()),
                "last_value": str(reading.value),
                "last_sensor": reading.sensor_type
            }
        )

        return message_id

    def ingest_batch(self, readings: List[SensorReading]) -> Dict:
        """Ingest multiple readings efficiently using pipeline."""
        pipe = self.redis.pipeline()
        results = {"success": 0, "failed": 0, "message_ids": []}

        for reading in readings:
            stream_key = f"{self.stream_prefix}:{reading.device_id}"

            data = {
                "device_id": reading.device_id,
                "sensor_type": reading.sensor_type,
                "value": str(reading.value),
                "unit": reading.unit,
                "timestamp": str(reading.timestamp),
                "ingested_at": str(time.time())
            }

            if reading.metadata:
                data["metadata"] = json.dumps(reading.metadata)

            pipe.xadd(
                stream_key,
                data,
                maxlen=self.max_stream_length,
                approximate=True
            )

        try:
            message_ids = pipe.execute()
            results["success"] = len(message_ids)
            results["message_ids"] = message_ids
        except Exception as e:
            results["failed"] = len(readings)
            results["error"] = str(e)

        return results

    def ingest_to_global_stream(
        self,
        reading: SensorReading,
        partition_key: str = None
    ) -> str:
        """Ingest to a partitioned global stream for parallel processing."""
        # Partition by device ID or custom key
        if partition_key is None:
            partition_key = reading.device_id

        # Simple hash partitioning
        partition = hash(partition_key) % 8  # 8 partitions
        stream_key = f"{self.stream_prefix}:partition:{partition}"

        data = {
            "device_id": reading.device_id,
            "sensor_type": reading.sensor_type,
            "value": str(reading.value),
            "unit": reading.unit,
            "timestamp": str(reading.timestamp),
            "partition_key": partition_key
        }

        return self.redis.xadd(
            stream_key,
            data,
            maxlen=self.max_stream_length,
            approximate=True
        )
```

## Data Validation Layer

Validate incoming data before processing:

```python
class DataValidator:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.schema_prefix = "iot:schema"
        self.invalid_stream = "iot:invalid"

    def register_device_schema(
        self,
        device_type: str,
        schema: Dict
    ):
        """Register expected schema for a device type."""
        schema_key = f"{self.schema_prefix}:{device_type}"
        self.redis.hset(schema_key, mapping={
            "sensors": json.dumps(schema.get("sensors", [])),
            "value_ranges": json.dumps(schema.get("value_ranges", {})),
            "required_fields": json.dumps(schema.get("required_fields", []))
        })

    def validate_reading(
        self,
        reading: SensorReading,
        device_type: str
    ) -> Dict:
        """Validate a reading against device schema."""
        schema_key = f"{self.schema_prefix}:{device_type}"
        schema_data = self.redis.hgetall(schema_key)

        if not schema_data:
            return {"valid": True, "warnings": ["No schema registered"]}

        errors = []
        warnings = []

        # Check sensor type
        valid_sensors = json.loads(schema_data.get(b"sensors", b"[]"))
        if valid_sensors and reading.sensor_type not in valid_sensors:
            errors.append(f"Unknown sensor type: {reading.sensor_type}")

        # Check value ranges
        value_ranges = json.loads(schema_data.get(b"value_ranges", b"{}"))
        if reading.sensor_type in value_ranges:
            range_spec = value_ranges[reading.sensor_type]
            min_val = range_spec.get("min", float("-inf"))
            max_val = range_spec.get("max", float("inf"))

            if reading.value < min_val or reading.value > max_val:
                errors.append(
                    f"Value {reading.value} out of range [{min_val}, {max_val}]"
                )

        # Check timestamp (not too old, not in future)
        now = time.time()
        if reading.timestamp > now + 60:  # More than 1 min in future
            warnings.append("Timestamp is in the future")
        if reading.timestamp < now - 86400:  # More than 1 day old
            warnings.append("Timestamp is more than 24 hours old")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def ingest_with_validation(
        self,
        reading: SensorReading,
        device_type: str,
        ingester: IoTDataIngester
    ) -> Dict:
        """Validate and ingest a reading."""
        validation = self.validate_reading(reading, device_type)

        if validation["valid"]:
            message_id = ingester.ingest_reading(reading)
            return {
                "status": "accepted",
                "message_id": message_id,
                "warnings": validation.get("warnings", [])
            }
        else:
            # Store in invalid stream for review
            self.redis.xadd(
                self.invalid_stream,
                {
                    "device_id": reading.device_id,
                    "data": json.dumps({
                        "sensor_type": reading.sensor_type,
                        "value": reading.value,
                        "timestamp": reading.timestamp
                    }),
                    "errors": json.dumps(validation["errors"]),
                    "received_at": str(time.time())
                },
                maxlen=10000
            )
            return {
                "status": "rejected",
                "errors": validation["errors"]
            }
```

## Consumer Group Processing

Process ingested data with consumer groups for parallelism:

```python
class StreamConsumer:
    def __init__(
        self,
        redis_client: redis.Redis,
        consumer_group: str,
        consumer_name: str
    ):
        self.redis = redis_client
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name
        self.batch_size = 100
        self.block_timeout = 5000  # 5 seconds

    def setup_consumer_group(self, stream_key: str):
        """Create consumer group if it doesn't exist."""
        try:
            self.redis.xgroup_create(
                stream_key,
                self.consumer_group,
                id="0",
                mkstream=True
            )
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    def process_stream(
        self,
        stream_key: str,
        handler: callable
    ):
        """Process messages from a stream."""
        self.setup_consumer_group(stream_key)

        while True:
            # Read new messages
            messages = self.redis.xreadgroup(
                self.consumer_group,
                self.consumer_name,
                {stream_key: ">"},
                count=self.batch_size,
                block=self.block_timeout
            )

            if not messages:
                continue

            for stream, stream_messages in messages:
                for message_id, data in stream_messages:
                    try:
                        # Decode data
                        decoded_data = {
                            k.decode() if isinstance(k, bytes) else k:
                            v.decode() if isinstance(v, bytes) else v
                            for k, v in data.items()
                        }

                        # Process the message
                        handler(decoded_data)

                        # Acknowledge the message
                        self.redis.xack(stream_key, self.consumer_group, message_id)

                    except Exception as e:
                        print(f"Error processing message {message_id}: {e}")
                        # Message will be retried

    def claim_pending_messages(self, stream_key: str, min_idle_time: int = 60000):
        """Claim messages that haven't been processed by other consumers."""
        pending = self.redis.xpending_range(
            stream_key,
            self.consumer_group,
            min="-",
            max="+",
            count=100
        )

        for entry in pending:
            message_id = entry["message_id"]
            idle_time = entry["time_since_delivered"]

            if idle_time > min_idle_time:
                # Claim the message
                claimed = self.redis.xclaim(
                    stream_key,
                    self.consumer_group,
                    self.consumer_name,
                    min_idle_time,
                    [message_id]
                )

                if claimed:
                    print(f"Claimed message {message_id}")
```

## Real-Time Aggregation

Aggregate sensor data in real-time:

```python
class RealTimeAggregator:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.window_size = 60  # 1 minute windows

    def aggregate_reading(self, reading: SensorReading):
        """Add reading to real-time aggregation."""
        window = int(reading.timestamp // self.window_size) * self.window_size
        agg_key = f"iot:agg:{reading.device_id}:{reading.sensor_type}:{window}"

        # Use Lua script for atomic aggregation
        lua_script = """
        local key = KEYS[1]
        local value = tonumber(ARGV[1])
        local ttl = tonumber(ARGV[2])

        local count = redis.call('HINCRBY', key, 'count', 1)
        local sum = redis.call('HINCRBYFLOAT', key, 'sum', value)

        -- Update min
        local current_min = redis.call('HGET', key, 'min')
        if not current_min or value < tonumber(current_min) then
            redis.call('HSET', key, 'min', value)
        end

        -- Update max
        local current_max = redis.call('HGET', key, 'max')
        if not current_max or value > tonumber(current_max) then
            redis.call('HSET', key, 'max', value)
        end

        -- Set TTL on first write
        if count == 1 then
            redis.call('EXPIRE', key, ttl)
        end

        return {count, sum}
        """

        self.redis.eval(
            lua_script,
            1,
            agg_key,
            reading.value,
            self.window_size * 10  # Keep for 10 windows
        )

    def get_aggregation(
        self,
        device_id: str,
        sensor_type: str,
        window: int
    ) -> Dict:
        """Get aggregated stats for a time window."""
        agg_key = f"iot:agg:{device_id}:{sensor_type}:{window}"
        data = self.redis.hgetall(agg_key)

        if not data:
            return None

        count = int(data.get(b"count", 0))
        sum_val = float(data.get(b"sum", 0))

        return {
            "device_id": device_id,
            "sensor_type": sensor_type,
            "window_start": window,
            "window_end": window + self.window_size,
            "count": count,
            "sum": sum_val,
            "avg": sum_val / count if count > 0 else 0,
            "min": float(data.get(b"min", 0)),
            "max": float(data.get(b"max", 0))
        }

    def get_recent_aggregations(
        self,
        device_id: str,
        sensor_type: str,
        num_windows: int = 10
    ) -> List[Dict]:
        """Get aggregations for recent time windows."""
        now = time.time()
        current_window = int(now // self.window_size) * self.window_size

        aggregations = []
        for i in range(num_windows):
            window = current_window - (i * self.window_size)
            agg = self.get_aggregation(device_id, sensor_type, window)
            if agg:
                aggregations.append(agg)

        return list(reversed(aggregations))
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');

class IoTIngester {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.streamPrefix = 'iot:stream';
        this.maxStreamLength = 100000;
    }

    async ingestReading(reading) {
        const { deviceId, sensorType, value, unit, timestamp, metadata } = reading;
        const streamKey = `${this.streamPrefix}:${deviceId}`;

        const data = {
            deviceId,
            sensorType,
            value: value.toString(),
            unit,
            timestamp: timestamp.toString(),
            ingestedAt: Date.now().toString()
        };

        if (metadata) {
            data.metadata = JSON.stringify(metadata);
        }

        const messageId = await this.redis.xadd(
            streamKey,
            'MAXLEN', '~', this.maxStreamLength,
            '*',
            ...Object.entries(data).flat()
        );

        // Update device status
        await this.redis.hset(`device:${deviceId}:status`, {
            lastSeen: Date.now().toString(),
            lastValue: value.toString(),
            lastSensor: sensorType
        });

        return messageId;
    }

    async ingestBatch(readings) {
        const pipeline = this.redis.pipeline();

        for (const reading of readings) {
            const { deviceId, sensorType, value, unit, timestamp, metadata } = reading;
            const streamKey = `${this.streamPrefix}:${deviceId}`;

            const data = {
                deviceId,
                sensorType,
                value: value.toString(),
                unit,
                timestamp: timestamp.toString(),
                ingestedAt: Date.now().toString()
            };

            if (metadata) {
                data.metadata = JSON.stringify(metadata);
            }

            pipeline.xadd(
                streamKey,
                'MAXLEN', '~', this.maxStreamLength,
                '*',
                ...Object.entries(data).flat()
            );
        }

        const results = await pipeline.exec();
        return {
            success: results.filter(r => !r[0]).length,
            failed: results.filter(r => r[0]).length,
            messageIds: results.map(r => r[1])
        };
    }
}

class StreamProcessor {
    constructor(redisConfig, consumerGroup, consumerName) {
        this.redis = new Redis(redisConfig);
        this.consumerGroup = consumerGroup;
        this.consumerName = consumerName;
        this.batchSize = 100;
        this.blockTimeout = 5000;
    }

    async setupConsumerGroup(streamKey) {
        try {
            await this.redis.xgroup('CREATE', streamKey, this.consumerGroup, '0', 'MKSTREAM');
        } catch (err) {
            if (!err.message.includes('BUSYGROUP')) {
                throw err;
            }
        }
    }

    async processStream(streamKey, handler) {
        await this.setupConsumerGroup(streamKey);

        while (true) {
            const results = await this.redis.xreadgroup(
                'GROUP', this.consumerGroup, this.consumerName,
                'COUNT', this.batchSize,
                'BLOCK', this.blockTimeout,
                'STREAMS', streamKey, '>'
            );

            if (!results) continue;

            for (const [stream, messages] of results) {
                for (const [messageId, fields] of messages) {
                    try {
                        // Convert fields array to object
                        const data = {};
                        for (let i = 0; i < fields.length; i += 2) {
                            data[fields[i]] = fields[i + 1];
                        }

                        await handler(data);
                        await this.redis.xack(streamKey, this.consumerGroup, messageId);
                    } catch (err) {
                        console.error(`Error processing ${messageId}:`, err);
                    }
                }
            }
        }
    }
}

// Real-time aggregation
class Aggregator {
    constructor(redisClient) {
        this.redis = redisClient;
        this.windowSize = 60; // 1 minute
    }

    async aggregateReading(reading) {
        const { deviceId, sensorType, value, timestamp } = reading;
        const window = Math.floor(timestamp / this.windowSize) * this.windowSize;
        const aggKey = `iot:agg:${deviceId}:${sensorType}:${window}`;

        const luaScript = `
            local key = KEYS[1]
            local value = tonumber(ARGV[1])
            local ttl = tonumber(ARGV[2])

            local count = redis.call('HINCRBY', key, 'count', 1)
            redis.call('HINCRBYFLOAT', key, 'sum', value)

            local currentMin = redis.call('HGET', key, 'min')
            if not currentMin or value < tonumber(currentMin) then
                redis.call('HSET', key, 'min', value)
            end

            local currentMax = redis.call('HGET', key, 'max')
            if not currentMax or value > tonumber(currentMax) then
                redis.call('HSET', key, 'max', value)
            end

            if count == 1 then
                redis.call('EXPIRE', key, ttl)
            end

            return count
        `;

        await this.redis.eval(luaScript, 1, aggKey, value, this.windowSize * 10);
    }

    async getAggregation(deviceId, sensorType, window) {
        const aggKey = `iot:agg:${deviceId}:${sensorType}:${window}`;
        const data = await this.redis.hgetall(aggKey);

        if (!data.count) return null;

        const count = parseInt(data.count);
        const sum = parseFloat(data.sum);

        return {
            deviceId,
            sensorType,
            windowStart: window,
            windowEnd: window + this.windowSize,
            count,
            sum,
            avg: sum / count,
            min: parseFloat(data.min),
            max: parseFloat(data.max)
        };
    }
}

// Usage
const ingester = new IoTIngester({ host: 'localhost', port: 6379 });

// Ingest a reading
await ingester.ingestReading({
    deviceId: 'sensor-001',
    sensorType: 'temperature',
    value: 23.5,
    unit: 'celsius',
    timestamp: Date.now() / 1000
});

// Process stream
const processor = new StreamProcessor(
    { host: 'localhost', port: 6379 },
    'iot-processors',
    'processor-1'
);

processor.processStream('iot:stream:sensor-001', async (data) => {
    console.log('Processing:', data);
    // Store to time series DB, trigger alerts, etc.
});
```

## Best Practices

1. **Use Streams over Lists** - Streams provide consumer groups, message acknowledgment, and better memory management.

2. **Partition by device** - Separate streams per device or device group for parallel processing.

3. **Set MAXLEN on streams** - Prevent unbounded memory growth with approximate trimming.

4. **Validate early** - Reject invalid data at ingestion to prevent downstream issues.

5. **Use consumer groups** - Enable horizontal scaling of processing workers.

6. **Aggregate in Redis** - Reduce data volume before sending to long-term storage.

7. **Monitor lag** - Track consumer lag to detect processing bottlenecks.

## Conclusion

Redis provides an excellent ingestion layer for IoT data. Its Streams data structure offers the perfect balance of performance, reliability, and flexibility for handling high-volume sensor data. Combined with consumer groups for parallel processing and real-time aggregation, Redis enables building scalable IoT pipelines.

For more IoT patterns with Redis, check out our guides on [Device State Management](/blog/redis-device-state-management) and [IoT Metrics Aggregation](/blog/redis-iot-metrics-aggregation).

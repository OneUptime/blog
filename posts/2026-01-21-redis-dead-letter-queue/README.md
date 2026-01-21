# How to Implement Dead Letter Queues with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Dead Letter Queue, DLQ, Redis Streams, Error Handling, Message Retry, Fault Tolerance

Description: A comprehensive guide to implementing dead letter queues with Redis Streams for handling failed message processing, retry strategies, and error recovery.

---

Dead letter queues (DLQ) handle messages that cannot be processed successfully. Redis Streams provide excellent primitives for implementing robust DLQ patterns with automatic retry and failure tracking.

## Why Dead Letter Queues?

DLQs are essential for reliable message processing:

- **Prevent message loss**: Failed messages are preserved for later handling
- **Isolate failures**: Bad messages do not block the main queue
- **Enable debugging**: Analyze why messages failed
- **Support retry**: Automatically retry failed messages with backoff
- **Maintain visibility**: Monitor and alert on DLQ growth

## Basic Dead Letter Queue

Implement a simple DLQ with Redis Streams:

```python
import redis
import json
import time
from typing import Dict, Any, Callable, Optional, List
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class FailedMessage:
    message_id: str
    original_stream: str
    data: Dict[str, Any]
    error: str
    failed_at: float
    retry_count: int
    max_retries: int
    next_retry_at: Optional[float] = None

class DeadLetterQueue:
    def __init__(self, redis_client: redis.Redis, dlq_name: str = "dlq"):
        self.redis = redis_client
        self.dlq_name = dlq_name
        self._dlq_stream = f"{dlq_name}:stream"
        self._retry_queue = f"{dlq_name}:retry"
        self._permanent_failures = f"{dlq_name}:permanent"

    def send_to_dlq(self, message_id: str, original_stream: str,
                    data: Dict[str, Any], error: str,
                    retry_count: int = 0, max_retries: int = 3):
        """Send a failed message to the dead letter queue."""
        failed_msg = FailedMessage(
            message_id=message_id,
            original_stream=original_stream,
            data=data,
            error=str(error),
            failed_at=time.time(),
            retry_count=retry_count,
            max_retries=max_retries
        )

        if retry_count >= max_retries:
            # Move to permanent failures
            self._store_permanent_failure(failed_msg)
        else:
            # Calculate next retry time with exponential backoff
            backoff = min(300, 2 ** retry_count * 10)  # Max 5 minutes
            failed_msg.next_retry_at = time.time() + backoff

            # Add to DLQ stream
            self.redis.xadd(self._dlq_stream, {
                "message_id": failed_msg.message_id,
                "original_stream": failed_msg.original_stream,
                "data": json.dumps(failed_msg.data),
                "error": failed_msg.error,
                "failed_at": str(failed_msg.failed_at),
                "retry_count": str(failed_msg.retry_count),
                "max_retries": str(failed_msg.max_retries),
                "next_retry_at": str(failed_msg.next_retry_at)
            })

            # Add to retry sorted set
            self.redis.zadd(
                self._retry_queue,
                {message_id: failed_msg.next_retry_at}
            )

            logger.warning(
                f"Message {message_id} sent to DLQ, retry {retry_count + 1} "
                f"scheduled at {failed_msg.next_retry_at}"
            )

    def _store_permanent_failure(self, failed_msg: FailedMessage):
        """Store message that exceeded max retries."""
        self.redis.xadd(self._permanent_failures, {
            "message_id": failed_msg.message_id,
            "original_stream": failed_msg.original_stream,
            "data": json.dumps(failed_msg.data),
            "error": failed_msg.error,
            "failed_at": str(failed_msg.failed_at),
            "retry_count": str(failed_msg.retry_count)
        }, maxlen=10000)

        logger.error(
            f"Message {failed_msg.message_id} permanently failed "
            f"after {failed_msg.retry_count} retries"
        )

    def get_ready_for_retry(self, limit: int = 100) -> List[FailedMessage]:
        """Get messages ready for retry."""
        now = time.time()

        # Get message IDs ready for retry
        message_ids = self.redis.zrangebyscore(
            self._retry_queue,
            "-inf",
            now,
            start=0,
            num=limit
        )

        messages = []
        for msg_id in message_ids:
            if isinstance(msg_id, bytes):
                msg_id = msg_id.decode()

            # Get message data from stream
            entries = self.redis.xread(
                {self._dlq_stream: "0-0"},
                count=1000
            )

            for stream, stream_entries in entries:
                for stream_id, data in stream_entries:
                    decoded = {
                        k.decode() if isinstance(k, bytes) else k:
                        v.decode() if isinstance(v, bytes) else v
                        for k, v in data.items()
                    }

                    if decoded["message_id"] == msg_id:
                        messages.append(FailedMessage(
                            message_id=decoded["message_id"],
                            original_stream=decoded["original_stream"],
                            data=json.loads(decoded["data"]),
                            error=decoded["error"],
                            failed_at=float(decoded["failed_at"]),
                            retry_count=int(decoded["retry_count"]),
                            max_retries=int(decoded["max_retries"]),
                            next_retry_at=float(decoded["next_retry_at"])
                        ))
                        break

        return messages

    def remove_from_retry(self, message_id: str):
        """Remove message from retry queue after successful processing."""
        self.redis.zrem(self._retry_queue, message_id)

    def get_dlq_stats(self) -> Dict[str, int]:
        """Get DLQ statistics."""
        return {
            "pending_retry": self.redis.zcard(self._retry_queue),
            "dlq_stream_length": self.redis.xlen(self._dlq_stream),
            "permanent_failures": self.redis.xlen(self._permanent_failures)
        }

# Usage
dlq = DeadLetterQueue(redis.Redis())

# Send failed message to DLQ
dlq.send_to_dlq(
    message_id="msg_123",
    original_stream="events:orders",
    data={"order_id": "ord_456", "action": "process"},
    error="Database connection timeout",
    retry_count=0,
    max_retries=3
)
```

## Consumer with DLQ Integration

Integrate DLQ with stream consumers:

```python
import redis
import json
import time
import threading
from typing import Dict, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class ResilientConsumer:
    def __init__(self, redis_client: redis.Redis, stream_key: str,
                 consumer_group: str, consumer_name: str,
                 max_retries: int = 3):
        self.redis = redis_client
        self.stream_key = stream_key
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name
        self.max_retries = max_retries
        self.dlq = DeadLetterQueue(redis_client, f"dlq:{stream_key}")
        self._running = False
        self._handler: Optional[Callable] = None

    def _ensure_consumer_group(self):
        """Create consumer group if not exists."""
        try:
            self.redis.xgroup_create(
                self.stream_key,
                self.consumer_group,
                id="0",
                mkstream=True
            )
        except redis.ResponseError:
            pass

    def consume(self, handler: Callable[[Dict], None]):
        """Start consuming messages with DLQ support."""
        self._ensure_consumer_group()
        self._handler = handler
        self._running = True

        # Start retry processor
        retry_thread = threading.Thread(target=self._process_retries)
        retry_thread.daemon = True
        retry_thread.start()

        # Main consumption loop
        while self._running:
            try:
                messages = self.redis.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {self.stream_key: ">"},
                    count=10,
                    block=5000
                )

                if not messages:
                    continue

                for stream, entries in messages:
                    for message_id, data in entries:
                        self._process_message(message_id, data)

            except redis.RedisError as e:
                logger.error(f"Redis error: {e}")
                time.sleep(1)

    def _process_message(self, message_id: bytes, data: Dict[bytes, bytes],
                         retry_count: int = 0):
        """Process a single message with error handling."""
        if isinstance(message_id, bytes):
            message_id = message_id.decode()

        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        try:
            self._handler(decoded)

            # Acknowledge successful processing
            self.redis.xack(self.stream_key, self.consumer_group, message_id)
            logger.debug(f"Processed message: {message_id}")

        except Exception as e:
            logger.error(f"Error processing {message_id}: {e}")

            # Send to DLQ for retry
            self.dlq.send_to_dlq(
                message_id=message_id,
                original_stream=self.stream_key,
                data=decoded,
                error=str(e),
                retry_count=retry_count,
                max_retries=self.max_retries
            )

            # Acknowledge to remove from pending
            self.redis.xack(self.stream_key, self.consumer_group, message_id)

    def _process_retries(self):
        """Background thread to process retry queue."""
        while self._running:
            try:
                ready_messages = self.dlq.get_ready_for_retry(limit=10)

                for msg in ready_messages:
                    logger.info(f"Retrying message: {msg.message_id}")

                    try:
                        self._handler(msg.data)

                        # Success - remove from retry queue
                        self.dlq.remove_from_retry(msg.message_id)
                        logger.info(f"Retry successful: {msg.message_id}")

                    except Exception as e:
                        # Retry failed - send back to DLQ with incremented count
                        self.dlq.remove_from_retry(msg.message_id)
                        self.dlq.send_to_dlq(
                            message_id=msg.message_id,
                            original_stream=msg.original_stream,
                            data=msg.data,
                            error=str(e),
                            retry_count=msg.retry_count + 1,
                            max_retries=msg.max_retries
                        )

                time.sleep(1)  # Check every second

            except Exception as e:
                logger.error(f"Retry processor error: {e}")
                time.sleep(5)

    def stop(self):
        """Stop the consumer."""
        self._running = False

# Usage
r = redis.Redis()
consumer = ResilientConsumer(
    r,
    stream_key="events:orders",
    consumer_group="order-processors",
    consumer_name="processor-1",
    max_retries=3
)

def process_order(data: Dict):
    """Process order - may raise exceptions."""
    order_id = data.get("order_id")
    # Process order...
    if some_condition:
        raise Exception("Processing failed")

consumer.consume(process_order)
```

## Advanced DLQ with Categories

Categorize failures for different handling:

```python
import redis
import json
import time
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

class FailureCategory(Enum):
    TRANSIENT = "transient"      # Temporary failures, safe to retry
    PERMANENT = "permanent"      # Permanent failures, do not retry
    POISON = "poison"            # Invalid message format
    DEPENDENCY = "dependency"    # External dependency failure
    UNKNOWN = "unknown"          # Unclassified errors

class CategorizedDLQ:
    def __init__(self, redis_client: redis.Redis, namespace: str = "cdlq"):
        self.redis = redis_client
        self.namespace = namespace

    def _category_stream(self, category: FailureCategory) -> str:
        return f"{self.namespace}:{category.value}"

    def _retry_queue(self, category: FailureCategory) -> str:
        return f"{self.namespace}:{category.value}:retry"

    def classify_error(self, error: Exception) -> FailureCategory:
        """Classify error into category."""
        error_str = str(error).lower()

        # Transient errors
        if any(term in error_str for term in [
            "timeout", "connection", "temporary", "retry"
        ]):
            return FailureCategory.TRANSIENT

        # Dependency errors
        if any(term in error_str for term in [
            "service unavailable", "503", "502", "database"
        ]):
            return FailureCategory.DEPENDENCY

        # Poison messages
        if any(term in error_str for term in [
            "parse", "decode", "invalid json", "schema"
        ]):
            return FailureCategory.POISON

        # Permanent errors
        if any(term in error_str for term in [
            "not found", "404", "forbidden", "unauthorized"
        ]):
            return FailureCategory.PERMANENT

        return FailureCategory.UNKNOWN

    def send_to_dlq(self, message_id: str, data: Dict[str, Any],
                    error: Exception, original_stream: str,
                    retry_count: int = 0, metadata: Dict = None):
        """Send message to categorized DLQ."""
        category = self.classify_error(error)

        entry = {
            "message_id": message_id,
            "original_stream": original_stream,
            "data": json.dumps(data),
            "error": str(error),
            "error_type": type(error).__name__,
            "category": category.value,
            "retry_count": str(retry_count),
            "failed_at": str(time.time()),
            "metadata": json.dumps(metadata or {})
        }

        # Add to category-specific stream
        stream_key = self._category_stream(category)
        self.redis.xadd(stream_key, entry, maxlen=50000)

        # Schedule retry for transient and dependency failures
        if category in (FailureCategory.TRANSIENT, FailureCategory.DEPENDENCY):
            max_retries = 5 if category == FailureCategory.TRANSIENT else 3
            if retry_count < max_retries:
                backoff = self._calculate_backoff(category, retry_count)
                retry_at = time.time() + backoff

                self.redis.zadd(
                    self._retry_queue(category),
                    {message_id: retry_at}
                )

        logger.warning(
            f"Message {message_id} sent to {category.value} DLQ "
            f"(retry: {retry_count})"
        )

        return category

    def _calculate_backoff(self, category: FailureCategory,
                           retry_count: int) -> float:
        """Calculate backoff based on category."""
        if category == FailureCategory.TRANSIENT:
            # Quick retries: 1s, 2s, 4s, 8s, 16s
            return min(60, 2 ** retry_count)
        elif category == FailureCategory.DEPENDENCY:
            # Slower retries: 30s, 60s, 120s
            return min(300, 30 * (2 ** retry_count))
        return 60

    def get_category_stats(self) -> Dict[str, Dict]:
        """Get statistics per category."""
        stats = {}

        for category in FailureCategory:
            stream_key = self._category_stream(category)
            retry_key = self._retry_queue(category)

            stats[category.value] = {
                "total": self.redis.xlen(stream_key),
                "pending_retry": self.redis.zcard(retry_key)
            }

        return stats

    def get_messages_by_category(self, category: FailureCategory,
                                  limit: int = 100) -> List[Dict]:
        """Get messages from specific category."""
        stream_key = self._category_stream(category)
        entries = self.redis.xrange(stream_key, "-", "+", count=limit)

        messages = []
        for stream_id, data in entries:
            decoded = {
                k.decode() if isinstance(k, bytes) else k:
                v.decode() if isinstance(v, bytes) else v
                for k, v in data.items()
            }
            decoded["stream_id"] = stream_id.decode() if isinstance(stream_id, bytes) else stream_id
            decoded["data"] = json.loads(decoded["data"])
            messages.append(decoded)

        return messages

    def reprocess_category(self, category: FailureCategory,
                           handler: callable) -> Dict[str, int]:
        """Manually reprocess all messages in a category."""
        stats = {"success": 0, "failed": 0}
        messages = self.get_messages_by_category(category, limit=1000)

        for msg in messages:
            try:
                handler(msg["data"])
                # Remove from DLQ on success
                self.redis.xdel(
                    self._category_stream(category),
                    msg["stream_id"]
                )
                stats["success"] += 1
            except Exception as e:
                stats["failed"] += 1
                logger.error(f"Reprocess failed: {e}")

        return stats

# Usage
cdlq = CategorizedDLQ(redis.Redis())

try:
    process_message(data)
except Exception as e:
    category = cdlq.send_to_dlq(
        message_id="msg_123",
        data=data,
        error=e,
        original_stream="events:orders"
    )
```

## DLQ Monitoring and Alerting

Monitor DLQ health and alert on issues:

```python
import redis
import json
import time
from typing import Dict, List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class DLQAlert:
    alert_type: str
    category: str
    message: str
    count: int
    timestamp: float

class DLQMonitor:
    def __init__(self, redis_client: redis.Redis, dlq: DeadLetterQueue):
        self.redis = redis_client
        self.dlq = dlq
        self._alerts_key = f"{dlq.dlq_name}:alerts"
        self._thresholds = {
            "pending_retry": 100,
            "permanent_failures": 10,
            "growth_rate": 50  # Messages per minute
        }

    def set_threshold(self, metric: str, value: int):
        """Set alerting threshold."""
        self._thresholds[metric] = value

    def check_health(self) -> List[DLQAlert]:
        """Check DLQ health and generate alerts."""
        alerts = []
        stats = self.dlq.get_dlq_stats()

        # Check pending retry count
        if stats["pending_retry"] > self._thresholds["pending_retry"]:
            alerts.append(DLQAlert(
                alert_type="threshold_exceeded",
                category="pending_retry",
                message=f"Pending retries ({stats['pending_retry']}) "
                        f"exceeded threshold ({self._thresholds['pending_retry']})",
                count=stats["pending_retry"],
                timestamp=time.time()
            ))

        # Check permanent failures
        if stats["permanent_failures"] > self._thresholds["permanent_failures"]:
            alerts.append(DLQAlert(
                alert_type="threshold_exceeded",
                category="permanent_failures",
                message=f"Permanent failures ({stats['permanent_failures']}) "
                        f"exceeded threshold ({self._thresholds['permanent_failures']})",
                count=stats["permanent_failures"],
                timestamp=time.time()
            ))

        # Check growth rate
        growth_rate = self._calculate_growth_rate()
        if growth_rate > self._thresholds["growth_rate"]:
            alerts.append(DLQAlert(
                alert_type="growth_rate",
                category="dlq_growth",
                message=f"DLQ growth rate ({growth_rate}/min) "
                        f"exceeded threshold ({self._thresholds['growth_rate']}/min)",
                count=growth_rate,
                timestamp=time.time()
            ))

        # Store alerts
        for alert in alerts:
            self._store_alert(alert)

        return alerts

    def _calculate_growth_rate(self) -> int:
        """Calculate messages added to DLQ per minute."""
        now = time.time()
        one_minute_ago = now - 60

        # Count recent entries
        entries = self.redis.xrange(
            self.dlq._dlq_stream,
            min=f"{int(one_minute_ago * 1000)}-0",
            max="+"
        )

        return len(entries)

    def _store_alert(self, alert: DLQAlert):
        """Store alert in Redis."""
        self.redis.xadd(self._alerts_key, {
            "alert_type": alert.alert_type,
            "category": alert.category,
            "message": alert.message,
            "count": str(alert.count),
            "timestamp": str(alert.timestamp)
        }, maxlen=1000)

    def get_recent_alerts(self, limit: int = 50) -> List[Dict]:
        """Get recent alerts."""
        entries = self.redis.xrevrange(self._alerts_key, count=limit)

        alerts = []
        for stream_id, data in entries:
            decoded = {
                k.decode() if isinstance(k, bytes) else k:
                v.decode() if isinstance(v, bytes) else v
                for k, v in data.items()
            }
            alerts.append(decoded)

        return alerts

    def export_metrics(self) -> Dict:
        """Export metrics for Prometheus or similar."""
        stats = self.dlq.get_dlq_stats()
        growth_rate = self._calculate_growth_rate()

        return {
            "dlq_pending_retry_total": stats["pending_retry"],
            "dlq_permanent_failures_total": stats["permanent_failures"],
            "dlq_stream_length": stats["dlq_stream_length"],
            "dlq_growth_rate_per_minute": growth_rate
        }

# Usage
dlq = DeadLetterQueue(redis.Redis())
monitor = DLQMonitor(redis.Redis(), dlq)

# Set custom thresholds
monitor.set_threshold("pending_retry", 50)
monitor.set_threshold("permanent_failures", 5)

# Check health periodically
def health_check_loop():
    while True:
        alerts = monitor.check_health()
        for alert in alerts:
            logger.warning(f"DLQ Alert: {alert.message}")
            # Send to alerting system (Slack, PagerDuty, etc.)
        time.sleep(60)
```

## Best Practices

1. **Classify errors** - Different failure types need different retry strategies
2. **Use exponential backoff** - Prevent overwhelming recovering services
3. **Set max retries** - Avoid infinite retry loops
4. **Monitor DLQ growth** - Alert on unusual growth rates
5. **Provide manual reprocessing** - Allow operators to retry failed messages
6. **Preserve context** - Store enough information for debugging
7. **Clean up old failures** - Archive or delete old permanent failures

## Conclusion

Dead letter queues are essential for building reliable message-driven systems. Redis Streams provide the primitives needed for sophisticated DLQ implementations with retry scheduling, failure categorization, and monitoring. Always implement proper alerting and provide tools for manual intervention when automated retries are not sufficient.

# How to Test Redis Pub/Sub Message Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Testing, Messaging, Integration Test

Description: Learn how to write reliable tests for Redis Pub/Sub message delivery, covering subscription timing, message ordering, and channel pattern matching.

---

## Challenges in Testing Pub/Sub

Redis Pub/Sub is inherently asynchronous, making tests prone to race conditions. Common pitfalls include:

- Publishing before a subscriber is ready
- Tests timing out because messages were never received
- Channel name collisions between parallel tests
- Not properly closing subscriptions after tests

## Basic Pub/Sub Test in Python

Use threading to run subscriber and publisher concurrently:

```python
import redis
import threading
import time
import pytest

@pytest.fixture
def r():
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    yield client
    client.close()

def test_pubsub_basic_delivery(r):
    channel = "test:basic"
    received = []
    ready = threading.Event()
    done = threading.Event()

    def subscriber():
        sub = r.pubsub()
        sub.subscribe(channel)
        ready.set()  # Signal that we are subscribed

        for message in sub.listen():
            if message['type'] == 'message':
                received.append(message['data'])
                done.set()
                break

        sub.unsubscribe(channel)
        sub.close()

    thread = threading.Thread(target=subscriber, daemon=True)
    thread.start()

    # Wait until subscriber is ready before publishing
    ready.wait(timeout=2)

    r.publish(channel, "hello world")

    # Wait for message to be received
    assert done.wait(timeout=3), "Message was not received within timeout"
    assert received == ["hello world"]
    thread.join(timeout=2)
```

## Testing Multiple Messages in Order

```python
def test_pubsub_message_ordering(r):
    channel = "test:ordering"
    received = []
    ready = threading.Event()
    expected_count = 5

    def subscriber():
        sub = r.pubsub()
        sub.subscribe(channel)
        ready.set()

        for message in sub.listen():
            if message['type'] == 'message':
                received.append(message['data'])
                if len(received) >= expected_count:
                    break

        sub.unsubscribe(channel)
        sub.close()

    thread = threading.Thread(target=subscriber, daemon=True)
    thread.start()
    ready.wait(timeout=2)

    messages = [f"msg:{i}" for i in range(expected_count)]
    for msg in messages:
        r.publish(channel, msg)

    thread.join(timeout=5)

    assert received == messages, f"Expected {messages}, got {received}"
```

## Testing Pattern Subscriptions

```python
def test_pattern_subscription(r):
    received = []
    ready = threading.Event()

    def subscriber():
        sub = r.pubsub()
        sub.psubscribe("test:events:*")
        ready.set()

        for message in sub.listen():
            if message['type'] == 'pmessage':
                received.append({
                    'channel': message['channel'],
                    'data': message['data']
                })
                if len(received) >= 3:
                    break

        sub.punsubscribe("test:events:*")
        sub.close()

    thread = threading.Thread(target=subscriber, daemon=True)
    thread.start()
    ready.wait(timeout=2)

    r.publish("test:events:user_login", "user:42")
    r.publish("test:events:user_logout", "user:42")
    r.publish("test:events:page_view", "page:/home")

    thread.join(timeout=5)

    assert len(received) == 3
    channels = [m['channel'] for m in received]
    assert "test:events:user_login" in channels
    assert "test:events:page_view" in channels
```

## Testing Subscriber Count

Verify the number of active subscribers on a channel:

```python
def test_subscriber_count(r):
    channel = "test:count"
    subscriptions = []
    ready_events = []

    def make_subscriber(sub_id):
        ready = threading.Event()
        ready_events.append(ready)

        def subscriber():
            sub = r.pubsub()
            sub.subscribe(channel)
            subscriptions.append(sub)
            ready.set()
            # Keep subscription alive
            time.sleep(2)
            sub.unsubscribe(channel)
            sub.close()

        return threading.Thread(target=subscriber, daemon=True)

    threads = [make_subscriber(i) for i in range(3)]
    for t in threads:
        t.start()

    # Wait for all 3 subscribers to connect
    for event in ready_events:
        event.wait(timeout=2)

    time.sleep(0.2)  # Allow subscriptions to register

    # Check subscriber count
    count = dict(r.pubsub_numsub(channel))[channel]
    assert count == 3, f"Expected 3 subscribers, got {count}"

    for t in threads:
        t.join(timeout=3)
```

## Testing at-Most-Once Delivery Semantics

Redis Pub/Sub is fire-and-forget. A message published before any subscriber joins is lost:

```python
def test_no_message_buffering(r):
    channel = "test:no-buffer"

    # Publish BEFORE any subscriber exists
    r.publish(channel, "this message is lost")

    received = []
    ready = threading.Event()

    def subscriber():
        sub = r.pubsub()
        sub.subscribe(channel)
        ready.set()
        # Poll briefly
        time.sleep(0.5)
        msg = sub.get_message(timeout=0.1)
        while msg is not None:
            if msg['type'] == 'message':
                received.append(msg['data'])
            msg = sub.get_message(timeout=0.1)
        sub.close()

    thread = threading.Thread(target=subscriber, daemon=True)
    thread.start()
    ready.wait(timeout=2)
    thread.join(timeout=2)

    # Message published before subscription should NOT be received
    assert len(received) == 0, "Redis Pub/Sub should not buffer messages"
```

## Async Testing with asyncio

```python
import asyncio
import pytest
import redis.asyncio as aioredis

@pytest.mark.asyncio
async def test_async_pubsub():
    r = aioredis.Redis(host='localhost', port=6379, decode_responses=True)
    pubsub = r.pubsub()

    await pubsub.subscribe("test:async")

    received = []

    async def listener():
        async for message in pubsub.listen():
            if message['type'] == 'message':
                received.append(message['data'])
                break

    listener_task = asyncio.create_task(listener())

    # Give subscriber time to register
    await asyncio.sleep(0.1)

    await r.publish("test:async", "async message")

    await asyncio.wait_for(listener_task, timeout=3)

    assert received == ["async message"]
    await pubsub.unsubscribe("test:async")
    await pubsub.aclose()
    await r.aclose()
```

## Unique Channel Names for Parallel Tests

Use pytest fixtures to generate unique channel names:

```python
import uuid
import pytest

@pytest.fixture
def channel():
    return f"test:{uuid.uuid4().hex[:12]}"

def test_delivery_with_unique_channel(r, channel):
    received = []
    ready = threading.Event()

    def subscriber():
        sub = r.pubsub()
        sub.subscribe(channel)
        ready.set()
        for msg in sub.listen():
            if msg['type'] == 'message':
                received.append(msg['data'])
                break
        sub.close()

    t = threading.Thread(target=subscriber, daemon=True)
    t.start()
    ready.wait(timeout=2)
    r.publish(channel, "payload")
    t.join(timeout=3)
    assert received == ["payload"]
```

## Summary

Testing Redis Pub/Sub requires careful management of timing between subscribers and publishers. Always wait for the subscriber to confirm subscription before publishing, using threading events or async coordination primitives. Use unique channel names per test to avoid cross-test pollution, set explicit timeouts on all waits, and always close subscriptions after tests to prevent connection leaks. Test both basic message delivery and pattern subscriptions, and verify the at-most-once delivery semantics are understood by your application.

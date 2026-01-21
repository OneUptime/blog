# How to Build Real-Time Notifications with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time, Notifications, WebSockets, Pub/Sub, Push Notifications, SSE

Description: A comprehensive guide to building real-time notification systems with Redis, covering Pub/Sub, Streams, WebSocket integration, and Server-Sent Events for delivering instant notifications to users.

---

Real-time notifications are essential for modern applications - from chat messages to order updates and system alerts. Redis provides powerful primitives for building scalable notification systems. This guide covers how to implement real-time notifications using Redis Pub/Sub, Streams, and integration with WebSockets and Server-Sent Events.

## Notification Architecture Overview

A typical real-time notification system consists of:

1. **Event Producers**: Services that generate notification events
2. **Message Broker**: Redis (Pub/Sub or Streams) for distributing events
3. **Delivery Layer**: WebSocket servers or SSE endpoints
4. **Persistence**: Storage for unread notifications
5. **Client Applications**: Web and mobile apps receiving notifications

## Using Redis Pub/Sub for Notifications

### Basic Pub/Sub Setup

```python
import redis
import json
import threading

class NotificationPublisher:
    """Publish notifications to Redis channels"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def send_notification(self, user_id, notification):
        """Send notification to a specific user"""
        channel = f"notifications:{user_id}"
        message = json.dumps({
            'type': notification.get('type', 'general'),
            'title': notification.get('title'),
            'body': notification.get('body'),
            'data': notification.get('data', {}),
            'timestamp': notification.get('timestamp'),
            'id': notification.get('id')
        })
        self.redis.publish(channel, message)

    def broadcast_notification(self, notification, user_ids=None):
        """Broadcast notification to multiple users or all"""
        if user_ids:
            for user_id in user_ids:
                self.send_notification(user_id, notification)
        else:
            # Broadcast to all subscribers
            channel = "notifications:broadcast"
            self.redis.publish(channel, json.dumps(notification))

    def send_to_group(self, group_id, notification):
        """Send notification to a group/channel"""
        channel = f"notifications:group:{group_id}"
        self.redis.publish(channel, json.dumps(notification))


class NotificationSubscriber:
    """Subscribe to notification channels"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self._running = False

    def subscribe_user(self, user_id, callback):
        """Subscribe to user's notification channel"""
        channel = f"notifications:{user_id}"
        self.pubsub.subscribe(**{channel: callback})

    def subscribe_group(self, group_id, callback):
        """Subscribe to group notifications"""
        channel = f"notifications:group:{group_id}"
        self.pubsub.subscribe(**{channel: callback})

    def subscribe_broadcast(self, callback):
        """Subscribe to broadcast notifications"""
        self.pubsub.subscribe(**{"notifications:broadcast": callback})

    def start(self):
        """Start listening for notifications"""
        self._running = True

        def listen():
            for message in self.pubsub.listen():
                if not self._running:
                    break
                if message['type'] == 'message':
                    # Message handling is done by callbacks
                    pass

        thread = threading.Thread(target=listen, daemon=True)
        thread.start()

    def stop(self):
        """Stop listening"""
        self._running = False
        self.pubsub.close()


# Usage
r = redis.Redis(decode_responses=True)
publisher = NotificationPublisher(r)

# Send a notification
publisher.send_notification('user123', {
    'id': 'notif_001',
    'type': 'order_update',
    'title': 'Order Shipped',
    'body': 'Your order #12345 has been shipped!',
    'data': {'order_id': '12345', 'tracking': 'ABC123'},
    'timestamp': '2024-01-15T10:30:00Z'
})
```

### WebSocket Integration with Pub/Sub

```python
import asyncio
import aioredis
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set

app = FastAPI()

class ConnectionManager:
    """Manage WebSocket connections and Redis subscriptions"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis = None

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept WebSocket and start subscription"""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

        # Start Redis subscription for this user if first connection
        if len(self.active_connections[user_id]) == 1:
            asyncio.create_task(self._subscribe(user_id))

    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def _subscribe(self, user_id: str):
        """Subscribe to Redis channel and forward messages"""
        if not self.redis:
            self.redis = await aioredis.from_url('redis://localhost')

        pubsub = self.redis.pubsub()
        await pubsub.subscribe(f"notifications:{user_id}")

        try:
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    await self._broadcast_to_user(user_id, message['data'])
        except Exception as e:
            print(f"Subscription error: {e}")
        finally:
            await pubsub.unsubscribe(f"notifications:{user_id}")

    async def _broadcast_to_user(self, user_id: str, message: str):
        """Send message to all connections for a user"""
        if user_id in self.active_connections:
            dead_connections = set()
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message)
                except Exception:
                    dead_connections.add(websocket)

            # Clean up dead connections
            for ws in dead_connections:
                self.active_connections[user_id].discard(ws)


manager = ConnectionManager()

@app.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive, handle client messages if needed
            data = await websocket.receive_text()
            # Handle acknowledgments or other client messages
            if data == 'ping':
                await websocket.send_text('pong')
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
```

### Node.js WebSocket Implementation

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

class NotificationServer {
    constructor(port = 8080) {
        this.wss = new WebSocket.Server({ port });
        this.redis = new Redis();
        this.connections = new Map(); // userId -> Set of WebSockets
        this.subscriptions = new Map(); // userId -> Redis subscriber

        this.setupWebSocketServer();
    }

    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const userId = this.extractUserId(req);
            if (!userId) {
                ws.close(4001, 'Authentication required');
                return;
            }

            this.registerConnection(userId, ws);

            ws.on('close', () => {
                this.unregisterConnection(userId, ws);
            });

            ws.on('message', (message) => {
                this.handleClientMessage(userId, ws, message);
            });

            // Send any pending notifications
            this.sendPendingNotifications(userId, ws);
        });
    }

    extractUserId(req) {
        // Extract from query string or headers
        const url = new URL(req.url, 'http://localhost');
        return url.searchParams.get('userId');
    }

    registerConnection(userId, ws) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
            this.startSubscription(userId);
        }
        this.connections.get(userId).add(ws);
        console.log(`User ${userId} connected. Total connections: ${this.connections.get(userId).size}`);
    }

    unregisterConnection(userId, ws) {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.delete(ws);
            if (userConnections.size === 0) {
                this.connections.delete(userId);
                this.stopSubscription(userId);
            }
        }
    }

    startSubscription(userId) {
        const subscriber = new Redis();
        const channel = `notifications:${userId}`;

        subscriber.subscribe(channel, (err) => {
            if (err) console.error(`Subscribe error for ${userId}:`, err);
        });

        subscriber.on('message', (ch, message) => {
            this.broadcastToUser(userId, message);
        });

        this.subscriptions.set(userId, subscriber);
    }

    stopSubscription(userId) {
        const subscriber = this.subscriptions.get(userId);
        if (subscriber) {
            subscriber.unsubscribe();
            subscriber.quit();
            this.subscriptions.delete(userId);
        }
    }

    broadcastToUser(userId, message) {
        const connections = this.connections.get(userId);
        if (connections) {
            connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            });
        }
    }

    handleClientMessage(userId, ws, message) {
        try {
            const data = JSON.parse(message);
            if (data.type === 'ack') {
                this.acknowledgeNotification(userId, data.notificationId);
            } else if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {
            console.error('Invalid message:', e);
        }
    }

    async sendPendingNotifications(userId, ws) {
        // Fetch unread notifications from Redis
        const notifications = await this.redis.lrange(`pending:${userId}`, 0, -1);
        notifications.forEach(notification => {
            ws.send(notification);
        });
    }

    async acknowledgeNotification(userId, notificationId) {
        // Mark notification as read
        await this.redis.srem(`unread:${userId}`, notificationId);
    }
}

// Start server
const server = new NotificationServer(8080);
console.log('Notification server started on port 8080');
```

## Using Redis Streams for Notifications

Redis Streams provide durability and replay capabilities that Pub/Sub lacks.

### Stream-Based Notification System

```python
import redis
import json
import time
from typing import Optional, List, Dict

class StreamNotificationService:
    """Notification service using Redis Streams"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def send_notification(self, user_id: str, notification: dict) -> str:
        """Send notification via stream"""
        stream_key = f"notifications:stream:{user_id}"

        entry_id = self.redis.xadd(
            stream_key,
            {
                'type': notification.get('type', 'general'),
                'title': notification.get('title', ''),
                'body': notification.get('body', ''),
                'data': json.dumps(notification.get('data', {})),
                'timestamp': str(int(time.time() * 1000)),
                'read': '0'
            },
            maxlen=1000  # Keep last 1000 notifications per user
        )

        # Also add to unread set for quick count
        self.redis.sadd(f"notifications:unread:{user_id}", entry_id)

        return entry_id

    def get_notifications(
        self,
        user_id: str,
        count: int = 50,
        last_id: Optional[str] = None,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for a user"""
        stream_key = f"notifications:stream:{user_id}"
        start_id = last_id if last_id else '-'

        entries = self.redis.xrevrange(stream_key, '+', start_id, count=count)

        notifications = []
        unread_ids = self.redis.smembers(f"notifications:unread:{user_id}")

        for entry_id, data in entries:
            notification = {
                'id': entry_id,
                'type': data.get('type', ''),
                'title': data.get('title', ''),
                'body': data.get('body', ''),
                'data': json.loads(data.get('data', '{}')),
                'timestamp': data.get('timestamp', ''),
                'read': entry_id not in unread_ids
            }

            if unread_only and notification['read']:
                continue

            notifications.append(notification)

        return notifications

    def mark_as_read(self, user_id: str, notification_ids: List[str]):
        """Mark notifications as read"""
        if notification_ids:
            self.redis.srem(f"notifications:unread:{user_id}", *notification_ids)

    def mark_all_as_read(self, user_id: str):
        """Mark all notifications as read"""
        self.redis.delete(f"notifications:unread:{user_id}")

    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications"""
        return self.redis.scard(f"notifications:unread:{user_id}")

    def delete_notification(self, user_id: str, notification_id: str):
        """Delete a notification"""
        stream_key = f"notifications:stream:{user_id}"
        self.redis.xdel(stream_key, notification_id)
        self.redis.srem(f"notifications:unread:{user_id}", notification_id)


class StreamNotificationConsumer:
    """Consume notifications from streams in real-time"""

    def __init__(self, redis_client, consumer_group: str, consumer_name: str):
        self.redis = redis_client
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name

    def setup_consumer_group(self, user_id: str):
        """Create consumer group for user's stream"""
        stream_key = f"notifications:stream:{user_id}"
        try:
            self.redis.xgroup_create(stream_key, self.consumer_group, id='0', mkstream=True)
        except redis.ResponseError as e:
            if 'BUSYGROUP' not in str(e):
                raise

    def consume(self, user_id: str, callback, block_ms: int = 5000):
        """Consume new notifications"""
        stream_key = f"notifications:stream:{user_id}"
        self.setup_consumer_group(user_id)

        while True:
            try:
                entries = self.redis.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {stream_key: '>'},
                    count=10,
                    block=block_ms
                )

                if entries:
                    for stream, messages in entries:
                        for msg_id, data in messages:
                            notification = {
                                'id': msg_id,
                                'type': data.get('type', ''),
                                'title': data.get('title', ''),
                                'body': data.get('body', ''),
                                'data': json.loads(data.get('data', '{}')),
                                'timestamp': data.get('timestamp', '')
                            }
                            callback(notification)

                            # Acknowledge processing
                            self.redis.xack(stream_key, self.consumer_group, msg_id)

            except Exception as e:
                print(f"Consumer error: {e}")
                time.sleep(1)


# Usage
r = redis.Redis(decode_responses=True)
service = StreamNotificationService(r)

# Send notification
notif_id = service.send_notification('user123', {
    'type': 'message',
    'title': 'New Message',
    'body': 'You have a new message from John',
    'data': {'sender_id': 'john', 'chat_id': 'chat_456'}
})

# Get notifications
notifications = service.get_notifications('user123', count=10)
print(f"Notifications: {notifications}")

# Get unread count
unread = service.get_unread_count('user123')
print(f"Unread: {unread}")

# Mark as read
service.mark_as_read('user123', [notif_id])
```

## Server-Sent Events (SSE) Integration

```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
import aioredis
import json

app = FastAPI()

async def notification_stream(user_id: str):
    """Generate SSE stream for notifications"""
    redis = await aioredis.from_url('redis://localhost', decode_responses=True)
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"notifications:{user_id}")

    try:
        # Send initial connection event
        yield f"event: connected\ndata: {json.dumps({'status': 'connected'})}\n\n"

        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                yield f"event: notification\ndata: {data}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe(f"notifications:{user_id}")
        await redis.close()

@app.get("/notifications/stream/{user_id}")
async def sse_notifications(user_id: str, request: Request):
    """SSE endpoint for real-time notifications"""

    async def event_generator():
        async for event in notification_stream(user_id):
            if await request.is_disconnected():
                break
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

JavaScript client for SSE:

```javascript
class NotificationClient {
    constructor(userId) {
        this.userId = userId;
        this.eventSource = null;
        this.callbacks = new Map();
    }

    connect() {
        this.eventSource = new EventSource(`/notifications/stream/${this.userId}`);

        this.eventSource.addEventListener('connected', (event) => {
            console.log('Connected to notification stream');
            this.emit('connected', JSON.parse(event.data));
        });

        this.eventSource.addEventListener('notification', (event) => {
            const notification = JSON.parse(event.data);
            this.emit('notification', notification);
        });

        this.eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            this.emit('error', error);

            // Reconnect after delay
            setTimeout(() => this.connect(), 5000);
        };
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.callbacks.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
}

// Usage
const notifications = new NotificationClient('user123');

notifications.on('connected', () => {
    console.log('Ready to receive notifications');
});

notifications.on('notification', (notification) => {
    console.log('New notification:', notification);
    showNotificationToast(notification);
});

notifications.connect();
```

## Push Notification Integration

### Mobile Push via Redis Queue

```python
import redis
import json
import time
from enum import Enum

class PushPlatform(Enum):
    IOS = 'ios'
    ANDROID = 'android'
    WEB = 'web'

class PushNotificationQueue:
    """Queue push notifications for delivery"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.queue_key = 'push_notifications:queue'

    def queue_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: dict = None,
        platforms: list = None
    ):
        """Queue push notification for delivery"""
        notification = {
            'user_id': user_id,
            'title': title,
            'body': body,
            'data': data or {},
            'platforms': platforms or [p.value for p in PushPlatform],
            'created_at': time.time(),
            'attempts': 0
        }
        self.redis.lpush(self.queue_key, json.dumps(notification))

    def get_user_tokens(self, user_id: str) -> dict:
        """Get push tokens for user"""
        tokens = self.redis.hgetall(f"push_tokens:{user_id}")
        return tokens

    def register_token(self, user_id: str, platform: PushPlatform, token: str):
        """Register push token for user"""
        self.redis.hset(f"push_tokens:{user_id}", platform.value, token)

    def unregister_token(self, user_id: str, platform: PushPlatform):
        """Unregister push token"""
        self.redis.hdel(f"push_tokens:{user_id}", platform.value)


class PushNotificationWorker:
    """Worker to process push notification queue"""

    def __init__(self, redis_client, fcm_client=None, apns_client=None):
        self.redis = redis_client
        self.fcm = fcm_client
        self.apns = apns_client
        self.queue_key = 'push_notifications:queue'
        self.dead_letter_key = 'push_notifications:dead_letter'

    def process(self):
        """Process notifications from queue"""
        while True:
            # Blocking pop from queue
            result = self.redis.brpop(self.queue_key, timeout=5)
            if not result:
                continue

            _, notification_json = result
            notification = json.loads(notification_json)

            try:
                self._send_notification(notification)
            except Exception as e:
                self._handle_failure(notification, str(e))

    def _send_notification(self, notification):
        """Send notification to all platforms"""
        user_id = notification['user_id']
        tokens = self.redis.hgetall(f"push_tokens:{user_id}")

        for platform in notification['platforms']:
            token = tokens.get(platform)
            if not token:
                continue

            if platform == 'android':
                self._send_fcm(token, notification)
            elif platform == 'ios':
                self._send_apns(token, notification)
            elif platform == 'web':
                self._send_web_push(token, notification)

    def _send_fcm(self, token, notification):
        """Send via Firebase Cloud Messaging"""
        if self.fcm:
            self.fcm.send_message(
                token=token,
                title=notification['title'],
                body=notification['body'],
                data=notification['data']
            )

    def _send_apns(self, token, notification):
        """Send via Apple Push Notification Service"""
        if self.apns:
            self.apns.send_notification(
                token=token,
                alert={
                    'title': notification['title'],
                    'body': notification['body']
                },
                custom=notification['data']
            )

    def _send_web_push(self, token, notification):
        """Send web push notification"""
        # Implement web push logic
        pass

    def _handle_failure(self, notification, error):
        """Handle failed notification"""
        notification['attempts'] += 1
        notification['last_error'] = error

        if notification['attempts'] < 3:
            # Retry with exponential backoff
            delay = 60 * (2 ** notification['attempts'])
            self.redis.zadd(
                'push_notifications:retry',
                {json.dumps(notification): time.time() + delay}
            )
        else:
            # Move to dead letter queue
            self.redis.lpush(self.dead_letter_key, json.dumps(notification))
```

## Notification Preferences and Filtering

```python
class NotificationPreferences:
    """Manage user notification preferences"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def set_preferences(self, user_id: str, preferences: dict):
        """Set notification preferences"""
        key = f"notification_prefs:{user_id}"
        self.redis.hset(key, mapping={
            'email_enabled': '1' if preferences.get('email_enabled', True) else '0',
            'push_enabled': '1' if preferences.get('push_enabled', True) else '0',
            'sms_enabled': '1' if preferences.get('sms_enabled', False) else '0',
            'quiet_hours_start': preferences.get('quiet_hours_start', ''),
            'quiet_hours_end': preferences.get('quiet_hours_end', ''),
            'disabled_types': json.dumps(preferences.get('disabled_types', []))
        })

    def get_preferences(self, user_id: str) -> dict:
        """Get notification preferences"""
        key = f"notification_prefs:{user_id}"
        prefs = self.redis.hgetall(key)

        return {
            'email_enabled': prefs.get('email_enabled', '1') == '1',
            'push_enabled': prefs.get('push_enabled', '1') == '1',
            'sms_enabled': prefs.get('sms_enabled', '0') == '1',
            'quiet_hours_start': prefs.get('quiet_hours_start', ''),
            'quiet_hours_end': prefs.get('quiet_hours_end', ''),
            'disabled_types': json.loads(prefs.get('disabled_types', '[]'))
        }

    def should_notify(self, user_id: str, notification_type: str, channel: str) -> bool:
        """Check if user should receive notification"""
        prefs = self.get_preferences(user_id)

        # Check channel
        if channel == 'email' and not prefs['email_enabled']:
            return False
        if channel == 'push' and not prefs['push_enabled']:
            return False
        if channel == 'sms' and not prefs['sms_enabled']:
            return False

        # Check notification type
        if notification_type in prefs['disabled_types']:
            return False

        # Check quiet hours
        if prefs['quiet_hours_start'] and prefs['quiet_hours_end']:
            from datetime import datetime
            now = datetime.now().strftime('%H:%M')
            start = prefs['quiet_hours_start']
            end = prefs['quiet_hours_end']

            if start <= end:
                if start <= now <= end:
                    return False
            else:  # Overnight quiet hours
                if now >= start or now <= end:
                    return False

        return True


class FilteredNotificationService:
    """Notification service with preference filtering"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.preferences = NotificationPreferences(redis_client)
        self.publisher = NotificationPublisher(redis_client)
        self.push_queue = PushNotificationQueue(redis_client)

    def send(self, user_id: str, notification: dict):
        """Send notification respecting user preferences"""
        notification_type = notification.get('type', 'general')

        # Real-time (WebSocket/SSE)
        if self.preferences.should_notify(user_id, notification_type, 'realtime'):
            self.publisher.send_notification(user_id, notification)

        # Push notification
        if self.preferences.should_notify(user_id, notification_type, 'push'):
            self.push_queue.queue_push(
                user_id,
                notification.get('title', ''),
                notification.get('body', ''),
                notification.get('data', {})
            )

        # Email (queue for email service)
        if self.preferences.should_notify(user_id, notification_type, 'email'):
            self.redis.lpush('email_queue', json.dumps({
                'user_id': user_id,
                'type': 'notification',
                'data': notification
            }))
```

## Best Practices

### 1. Handle Connection Failures Gracefully

```javascript
class ReconnectingNotificationClient {
    constructor(userId) {
        this.userId = userId;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.baseDelay = 1000;
    }

    connect() {
        this.ws = new WebSocket(`wss://api.example.com/ws/notifications/${this.userId}`);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            console.log('Connected');
        };

        this.ws.onclose = () => {
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
    }
}
```

### 2. Batch Notifications

```python
def batch_notifications(notifications, batch_size=100):
    """Batch multiple notifications for efficiency"""
    pipeline = redis.pipeline()

    for i, notification in enumerate(notifications):
        pipeline.publish(
            f"notifications:{notification['user_id']}",
            json.dumps(notification)
        )

        if (i + 1) % batch_size == 0:
            pipeline.execute()
            pipeline = redis.pipeline()

    if notifications:
        pipeline.execute()
```

### 3. Rate Limit Notifications

```python
def rate_limited_notify(redis_client, user_id, notification, max_per_minute=10):
    """Rate limit notifications per user"""
    key = f"notification_rate:{user_id}"
    current = redis_client.incr(key)

    if current == 1:
        redis_client.expire(key, 60)

    if current > max_per_minute:
        return False  # Rate limited

    # Send notification
    return True
```

## Conclusion

Building real-time notifications with Redis provides a scalable, low-latency solution for delivering instant updates to users. Key takeaways:

- Use Pub/Sub for simple, fire-and-forget notifications
- Use Streams when you need durability and replay capabilities
- Integrate with WebSockets or SSE for browser delivery
- Implement notification preferences to respect user choices
- Handle failures gracefully with retries and dead letter queues
- Consider rate limiting to prevent notification fatigue

By combining Redis's powerful messaging capabilities with modern delivery mechanisms, you can build notification systems that scale to millions of users while maintaining low latency and high reliability.

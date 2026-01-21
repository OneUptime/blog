# How to Build Command Queues for IoT Devices with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Command Queue, Device Control, Firmware Updates, Streams, Reliable Messaging

Description: A comprehensive guide to building command queues for IoT devices with Redis, covering device control, firmware updates, command acknowledgment, and reliable delivery patterns.

---

IoT devices need to receive commands from the cloud - configuration changes, firmware updates, and operational commands. Redis provides reliable queuing primitives to ensure commands reach devices even when they're intermittently connected. This guide covers building robust command queue systems.

## Command Queue Requirements

IoT command queues must handle:

1. **Reliable delivery** - Commands must not be lost
2. **Ordering** - Commands execute in the correct sequence
3. **Acknowledgment** - Confirm command execution
4. **Retry logic** - Handle failed or timed-out commands
5. **Offline devices** - Queue commands until device reconnects
6. **Priority** - Urgent commands jump the queue

## Basic Command Queue

```python
import redis
import json
import time
import uuid
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class CommandStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    ACKNOWLEDGED = "acknowledged"
    EXECUTED = "executed"
    FAILED = "failed"
    EXPIRED = "expired"

class CommandPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

@dataclass
class DeviceCommand:
    command_id: str
    device_id: str
    command_type: str
    payload: Dict
    priority: CommandPriority
    created_at: float
    expires_at: Optional[float]
    status: CommandStatus

class CommandQueue:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.queue_prefix = "device:commands"
        self.command_prefix = "command"

    def enqueue_command(
        self,
        device_id: str,
        command_type: str,
        payload: Dict,
        priority: CommandPriority = CommandPriority.NORMAL,
        ttl_seconds: int = 3600
    ) -> str:
        """Add a command to a device's queue."""
        command_id = str(uuid.uuid4())
        now = time.time()

        command = DeviceCommand(
            command_id=command_id,
            device_id=device_id,
            command_type=command_type,
            payload=payload,
            priority=priority,
            created_at=now,
            expires_at=now + ttl_seconds if ttl_seconds else None,
            status=CommandStatus.PENDING
        )

        # Store command details
        command_key = f"{self.command_prefix}:{command_id}"
        command_data = {
            "command_id": command_id,
            "device_id": device_id,
            "command_type": command_type,
            "payload": json.dumps(payload),
            "priority": priority.value,
            "created_at": str(now),
            "expires_at": str(command.expires_at) if command.expires_at else "",
            "status": CommandStatus.PENDING.value
        }

        pipe = self.redis.pipeline()

        # Store command
        pipe.hset(command_key, mapping=command_data)
        if ttl_seconds:
            pipe.expire(command_key, ttl_seconds + 3600)  # Extra time for history

        # Add to device queue (sorted set with priority + timestamp as score)
        # Higher priority and older commands processed first
        queue_key = f"{self.queue_prefix}:{device_id}"
        score = (priority.value * 1000000000) + (1000000000 - now)
        pipe.zadd(queue_key, {command_id: score})

        # Track pending commands
        pipe.sadd(f"commands:pending:{device_id}", command_id)

        pipe.execute()

        return command_id

    def get_pending_commands(
        self,
        device_id: str,
        limit: int = 10
    ) -> List[DeviceCommand]:
        """Get pending commands for a device, ordered by priority."""
        queue_key = f"{self.queue_prefix}:{device_id}"
        now = time.time()

        # Get top commands by priority
        command_ids = self.redis.zrevrange(queue_key, 0, limit - 1)

        commands = []
        expired = []

        for cmd_id in command_ids:
            cmd_id = cmd_id.decode() if isinstance(cmd_id, bytes) else cmd_id
            command_data = self.redis.hgetall(f"{self.command_prefix}:{cmd_id}")

            if not command_data:
                expired.append(cmd_id)
                continue

            # Check expiration
            expires_at = command_data.get(b"expires_at", b"").decode()
            if expires_at and float(expires_at) < now:
                expired.append(cmd_id)
                self._mark_expired(cmd_id, device_id)
                continue

            commands.append(self._parse_command(command_data))

        # Clean up expired
        if expired:
            self.redis.zrem(queue_key, *expired)

        return commands

    def mark_sent(self, command_id: str) -> bool:
        """Mark command as sent to device."""
        command_key = f"{self.command_prefix}:{command_id}"

        self.redis.hset(command_key, mapping={
            "status": CommandStatus.SENT.value,
            "sent_at": str(time.time())
        })

        return True

    def acknowledge_command(
        self,
        command_id: str,
        success: bool,
        result: Dict = None
    ) -> bool:
        """Acknowledge command execution by device."""
        command_key = f"{self.command_prefix}:{command_id}"
        command_data = self.redis.hgetall(command_key)

        if not command_data:
            return False

        device_id = command_data[b"device_id"].decode()
        queue_key = f"{self.queue_prefix}:{device_id}"

        status = CommandStatus.EXECUTED if success else CommandStatus.FAILED

        pipe = self.redis.pipeline()

        # Update command status
        pipe.hset(command_key, mapping={
            "status": status.value,
            "acknowledged_at": str(time.time()),
            "result": json.dumps(result or {})
        })

        # Remove from queue
        pipe.zrem(queue_key, command_id)
        pipe.srem(f"commands:pending:{device_id}", command_id)

        # Add to completed set (for history)
        pipe.zadd(
            f"commands:completed:{device_id}",
            {command_id: time.time()}
        )

        pipe.execute()

        # Publish acknowledgment event
        self.redis.publish(
            f"command:ack:{command_id}",
            json.dumps({
                "command_id": command_id,
                "device_id": device_id,
                "status": status.value,
                "success": success,
                "result": result
            })
        )

        return True

    def _mark_expired(self, command_id: str, device_id: str):
        """Mark a command as expired."""
        command_key = f"{self.command_prefix}:{command_id}"

        self.redis.hset(command_key, mapping={
            "status": CommandStatus.EXPIRED.value,
            "expired_at": str(time.time())
        })

        self.redis.srem(f"commands:pending:{device_id}", command_id)

    def _parse_command(self, data: Dict) -> DeviceCommand:
        """Parse command data from Redis."""
        return DeviceCommand(
            command_id=data[b"command_id"].decode(),
            device_id=data[b"device_id"].decode(),
            command_type=data[b"command_type"].decode(),
            payload=json.loads(data[b"payload"]),
            priority=CommandPriority(int(data[b"priority"])),
            created_at=float(data[b"created_at"]),
            expires_at=float(data[b"expires_at"]) if data.get(b"expires_at") else None,
            status=CommandStatus(data[b"status"].decode())
        )
```

## Reliable Command Delivery with Streams

Use Redis Streams for reliable delivery with acknowledgment:

```python
class ReliableCommandQueue:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_prefix = "commands:stream"

    def send_command(
        self,
        device_id: str,
        command_type: str,
        payload: Dict,
        priority: int = 1
    ) -> str:
        """Send a command via Redis Stream."""
        stream_key = f"{self.stream_prefix}:{device_id}"

        message = {
            "command_type": command_type,
            "payload": json.dumps(payload),
            "priority": str(priority),
            "created_at": str(time.time())
        }

        message_id = self.redis.xadd(
            stream_key,
            message,
            maxlen=1000  # Keep last 1000 commands
        )

        return message_id

    def setup_consumer_group(self, device_id: str, group_name: str = "device"):
        """Set up consumer group for a device."""
        stream_key = f"{self.stream_prefix}:{device_id}"

        try:
            self.redis.xgroup_create(
                stream_key,
                group_name,
                id="0",
                mkstream=True
            )
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    def receive_commands(
        self,
        device_id: str,
        consumer_name: str,
        count: int = 10,
        block_ms: int = 5000
    ) -> List[Dict]:
        """Receive commands for a device."""
        stream_key = f"{self.stream_prefix}:{device_id}"
        group_name = "device"

        self.setup_consumer_group(device_id, group_name)

        # First, check for pending messages (unacknowledged)
        pending = self.redis.xpending_range(
            stream_key,
            group_name,
            min="-",
            max="+",
            count=count
        )

        if pending:
            # Claim pending messages
            message_ids = [p["message_id"] for p in pending]
            claimed = self.redis.xclaim(
                stream_key,
                group_name,
                consumer_name,
                min_idle_time=30000,  # 30 seconds
                message_ids=message_ids
            )

            if claimed:
                return self._parse_messages(claimed)

        # Read new messages
        messages = self.redis.xreadgroup(
            group_name,
            consumer_name,
            {stream_key: ">"},
            count=count,
            block=block_ms
        )

        if not messages:
            return []

        return self._parse_messages(messages[0][1])

    def acknowledge_receipt(
        self,
        device_id: str,
        message_id: str
    ) -> bool:
        """Acknowledge command receipt."""
        stream_key = f"{self.stream_prefix}:{device_id}"
        return self.redis.xack(stream_key, "device", message_id) == 1

    def _parse_messages(self, messages: List) -> List[Dict]:
        """Parse stream messages into command objects."""
        commands = []
        for message_id, data in messages:
            message_id = message_id.decode() if isinstance(message_id, bytes) else message_id

            command = {
                "message_id": message_id,
                "command_type": data[b"command_type"].decode() if b"command_type" in data else data.get("command_type"),
                "payload": json.loads(data[b"payload"] if b"payload" in data else data.get("payload")),
                "priority": int(data[b"priority"] if b"priority" in data else data.get("priority", 1)),
                "created_at": float(data[b"created_at"] if b"created_at" in data else data.get("created_at"))
            }
            commands.append(command)

        return commands
```

## Firmware Update Queue

Special handling for firmware updates:

```python
class FirmwareUpdateQueue:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.update_prefix = "firmware:update"

    def schedule_update(
        self,
        device_id: str,
        firmware_version: str,
        download_url: str,
        checksum: str,
        priority: CommandPriority = CommandPriority.NORMAL
    ) -> str:
        """Schedule a firmware update for a device."""
        update_id = str(uuid.uuid4())
        update_key = f"{self.update_prefix}:{update_id}"

        update_data = {
            "update_id": update_id,
            "device_id": device_id,
            "firmware_version": firmware_version,
            "download_url": download_url,
            "checksum": checksum,
            "status": "scheduled",
            "scheduled_at": str(time.time()),
            "priority": priority.value
        }

        pipe = self.redis.pipeline()

        # Store update details
        pipe.hset(update_key, mapping=update_data)

        # Add to device's update queue
        pipe.zadd(
            f"firmware:queue:{device_id}",
            {update_id: priority.value * 1000000000 + time.time()}
        )

        # Track scheduled updates
        pipe.sadd("firmware:scheduled", update_id)

        pipe.execute()

        return update_id

    def get_pending_update(self, device_id: str) -> Optional[Dict]:
        """Get the highest priority pending update."""
        queue_key = f"firmware:queue:{device_id}"

        # Get top update
        updates = self.redis.zrevrange(queue_key, 0, 0)
        if not updates:
            return None

        update_id = updates[0].decode() if isinstance(updates[0], bytes) else updates[0]
        update_data = self.redis.hgetall(f"{self.update_prefix}:{update_id}")

        if not update_data:
            self.redis.zrem(queue_key, update_id)
            return None

        return {
            k.decode(): v.decode() for k, v in update_data.items()
        }

    def update_progress(
        self,
        update_id: str,
        status: str,
        progress: int = None,
        error: str = None
    ):
        """Update firmware update progress."""
        update_key = f"{self.update_prefix}:{update_id}"

        updates = {
            "status": status,
            "updated_at": str(time.time())
        }

        if progress is not None:
            updates["progress"] = str(progress)

        if error:
            updates["error"] = error

        self.redis.hset(update_key, mapping=updates)

        # Publish progress event
        self.redis.publish(
            f"firmware:progress:{update_id}",
            json.dumps({
                "update_id": update_id,
                "status": status,
                "progress": progress,
                "error": error
            })
        )

    def complete_update(
        self,
        update_id: str,
        success: bool,
        new_version: str = None
    ):
        """Mark firmware update as complete."""
        update_key = f"{self.update_prefix}:{update_id}"
        update_data = self.redis.hgetall(update_key)

        if not update_data:
            return

        device_id = update_data[b"device_id"].decode()

        pipe = self.redis.pipeline()

        status = "completed" if success else "failed"
        pipe.hset(update_key, mapping={
            "status": status,
            "completed_at": str(time.time())
        })

        # Remove from queue
        pipe.zrem(f"firmware:queue:{device_id}", update_id)
        pipe.srem("firmware:scheduled", update_id)

        # Update device firmware version if successful
        if success and new_version:
            pipe.hset(f"device:state:{device_id}", "firmware_version", new_version)

        pipe.execute()
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class CommandQueue {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);
        this.queuePrefix = 'device:commands';
        this.commandPrefix = 'command';
    }

    async enqueueCommand(deviceId, commandType, payload, options = {}) {
        const {
            priority = 1,
            ttlSeconds = 3600
        } = options;

        const commandId = uuidv4();
        const now = Date.now() / 1000;
        const expiresAt = ttlSeconds ? now + ttlSeconds : null;

        const commandKey = `${this.commandPrefix}:${commandId}`;
        const queueKey = `${this.queuePrefix}:${deviceId}`;

        const pipeline = this.redis.pipeline();

        // Store command
        pipeline.hset(commandKey, {
            commandId,
            deviceId,
            commandType,
            payload: JSON.stringify(payload),
            priority: priority.toString(),
            createdAt: now.toString(),
            expiresAt: expiresAt ? expiresAt.toString() : '',
            status: 'pending'
        });

        if (ttlSeconds) {
            pipeline.expire(commandKey, ttlSeconds + 3600);
        }

        // Add to queue
        const score = (priority * 1000000000) + (1000000000 - now);
        pipeline.zadd(queueKey, score, commandId);
        pipeline.sadd(`commands:pending:${deviceId}`, commandId);

        await pipeline.exec();

        return commandId;
    }

    async getPendingCommands(deviceId, limit = 10) {
        const queueKey = `${this.queuePrefix}:${deviceId}`;
        const now = Date.now() / 1000;

        const commandIds = await this.redis.zrevrange(queueKey, 0, limit - 1);

        const commands = [];
        const expired = [];

        for (const cmdId of commandIds) {
            const commandData = await this.redis.hgetall(`${this.commandPrefix}:${cmdId}`);

            if (!commandData.commandId) {
                expired.push(cmdId);
                continue;
            }

            if (commandData.expiresAt && parseFloat(commandData.expiresAt) < now) {
                expired.push(cmdId);
                await this.markExpired(cmdId, deviceId);
                continue;
            }

            commands.push({
                commandId: commandData.commandId,
                deviceId: commandData.deviceId,
                commandType: commandData.commandType,
                payload: JSON.parse(commandData.payload),
                priority: parseInt(commandData.priority),
                createdAt: parseFloat(commandData.createdAt),
                status: commandData.status
            });
        }

        if (expired.length > 0) {
            await this.redis.zrem(queueKey, ...expired);
        }

        return commands;
    }

    async acknowledgeCommand(commandId, success, result = null) {
        const commandKey = `${this.commandPrefix}:${commandId}`;
        const commandData = await this.redis.hgetall(commandKey);

        if (!commandData.deviceId) {
            return false;
        }

        const deviceId = commandData.deviceId;
        const status = success ? 'executed' : 'failed';

        const pipeline = this.redis.pipeline();

        pipeline.hset(commandKey, {
            status,
            acknowledgedAt: (Date.now() / 1000).toString(),
            result: JSON.stringify(result || {})
        });

        pipeline.zrem(`${this.queuePrefix}:${deviceId}`, commandId);
        pipeline.srem(`commands:pending:${deviceId}`, commandId);
        pipeline.zadd(`commands:completed:${deviceId}`, Date.now() / 1000, commandId);

        await pipeline.exec();

        await this.pubClient.publish(
            `command:ack:${commandId}`,
            JSON.stringify({
                commandId,
                deviceId,
                status,
                success,
                result
            })
        );

        return true;
    }

    async markExpired(commandId, deviceId) {
        const commandKey = `${this.commandPrefix}:${commandId}`;

        await this.redis.hset(commandKey, {
            status: 'expired',
            expiredAt: (Date.now() / 1000).toString()
        });

        await this.redis.srem(`commands:pending:${deviceId}`, commandId);
    }

    // Wait for command acknowledgment
    async waitForAcknowledgment(commandId, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const subClient = new Redis(this.redis.options);
            const channel = `command:ack:${commandId}`;

            const timeout = setTimeout(() => {
                subClient.unsubscribe(channel);
                subClient.quit();
                reject(new Error('Acknowledgment timeout'));
            }, timeoutMs);

            subClient.subscribe(channel);
            subClient.on('message', (ch, message) => {
                clearTimeout(timeout);
                subClient.unsubscribe(channel);
                subClient.quit();
                resolve(JSON.parse(message));
            });
        });
    }
}

// Usage
const commandQueue = new CommandQueue({ host: 'localhost', port: 6379 });

// Send a command
const commandId = await commandQueue.enqueueCommand(
    'device-001',
    'set_config',
    { reportingInterval: 30, ledEnabled: true },
    { priority: 2, ttlSeconds: 300 }
);

// Device retrieves commands
const commands = await commandQueue.getPendingCommands('device-001');

// Device acknowledges
await commandQueue.acknowledgeCommand(commandId, true, { applied: true });

// Wait for acknowledgment (from sender side)
const ack = await commandQueue.waitForAcknowledgment(commandId);
console.log('Command acknowledged:', ack);
```

## Best Practices

1. **Set command TTLs** - Commands should expire if not executed within a reasonable time.

2. **Use priority queues** - Critical commands (security updates) should jump the queue.

3. **Acknowledge both receipt and execution** - Track when device receives vs executes command.

4. **Handle offline devices** - Commands queue until device reconnects.

5. **Implement idempotency** - Commands may be delivered multiple times.

6. **Rate limit command delivery** - Don't overwhelm constrained devices.

7. **Log command history** - Keep audit trail for debugging and compliance.

## Conclusion

Redis provides excellent primitives for building IoT command queues. Sorted sets enable priority-based delivery, Streams provide reliable messaging with acknowledgment, and pub/sub enables real-time command status updates. The key is implementing proper acknowledgment patterns to ensure commands are reliably delivered and executed.

For more IoT patterns with Redis, check out our guides on [Device State Management](/blog/redis-device-state-management) and [IoT Metrics Aggregation](/blog/redis-iot-metrics-aggregation).

# How to Implement Device State Management with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IoT, Device State, Online Offline, Presence Detection, Last Known State, Hashes, TTL

Description: A comprehensive guide to implementing device state management with Redis, covering online/offline tracking, last-known state storage, device shadow patterns, and presence detection for IoT systems.

---

Managing device state is critical for IoT platforms. You need to know which devices are online, their last known values, and be notified when devices go offline. Redis excels at this with its fast key-value operations, TTL-based expiration, and pub/sub for real-time notifications. This guide covers building robust device state management systems.

## Device State Requirements

Device state management must handle:

1. **Online/offline detection** - Know which devices are currently connected
2. **Last known state** - Store the most recent sensor values
3. **Device shadow** - Maintain desired vs reported state
4. **Presence notifications** - Alert when devices connect/disconnect
5. **Bulk queries** - Efficiently query state of many devices
6. **Historical state** - Track state changes over time

## Basic Device State Storage

### Device Registry and State

```python
import redis
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

class DeviceStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"

@dataclass
class DeviceState:
    device_id: str
    status: DeviceStatus
    reported_state: Dict[str, Any]
    desired_state: Dict[str, Any]
    last_seen: float
    metadata: Dict[str, Any]

class DeviceStateManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.heartbeat_timeout = 60  # Device offline after 60s
        self.state_prefix = "device:state"
        self.online_set = "devices:online"

    def register_device(
        self,
        device_id: str,
        device_type: str,
        metadata: Dict = None
    ) -> bool:
        """Register a new device in the system."""
        device_key = f"{self.state_prefix}:{device_id}"

        device_data = {
            "device_id": device_id,
            "device_type": device_type,
            "registered_at": str(time.time()),
            "status": DeviceStatus.OFFLINE.value,
            "last_seen": "0",
            "reported_state": json.dumps({}),
            "desired_state": json.dumps({}),
            "metadata": json.dumps(metadata or {})
        }

        self.redis.hset(device_key, mapping=device_data)

        # Add to device registry
        self.redis.sadd("devices:registered", device_id)
        self.redis.sadd(f"devices:type:{device_type}", device_id)

        return True

    def device_heartbeat(
        self,
        device_id: str,
        reported_state: Dict = None
    ) -> Dict:
        """Process a device heartbeat - mark online and update state."""
        now = time.time()
        device_key = f"{self.state_prefix}:{device_id}"
        heartbeat_key = f"device:heartbeat:{device_id}"

        # Check if device was previously offline
        was_offline = not self.redis.exists(heartbeat_key)

        pipe = self.redis.pipeline()

        # Set heartbeat with TTL
        pipe.setex(heartbeat_key, self.heartbeat_timeout, "1")

        # Update device state
        updates = {
            "status": DeviceStatus.ONLINE.value,
            "last_seen": str(now)
        }

        if reported_state:
            updates["reported_state"] = json.dumps(reported_state)

        pipe.hset(device_key, mapping=updates)

        # Add to online set
        pipe.sadd(self.online_set, device_id)

        pipe.execute()

        # Publish online event if was offline
        if was_offline:
            self._publish_presence_event(device_id, "online", now)

        return {
            "device_id": device_id,
            "status": "online",
            "was_offline": was_offline
        }

    def get_device_state(self, device_id: str) -> Optional[DeviceState]:
        """Get current state of a device."""
        device_key = f"{self.state_prefix}:{device_id}"
        heartbeat_key = f"device:heartbeat:{device_id}"

        # Get device data
        device_data = self.redis.hgetall(device_key)
        if not device_data:
            return None

        # Check if device is online (heartbeat exists)
        is_online = self.redis.exists(heartbeat_key)

        status = DeviceStatus.ONLINE if is_online else DeviceStatus.OFFLINE

        # Update status if changed
        stored_status = device_data.get(b"status", b"unknown").decode()
        if status.value != stored_status:
            self.redis.hset(device_key, "status", status.value)

        return DeviceState(
            device_id=device_id,
            status=status,
            reported_state=json.loads(device_data.get(b"reported_state", b"{}")),
            desired_state=json.loads(device_data.get(b"desired_state", b"{}")),
            last_seen=float(device_data.get(b"last_seen", 0)),
            metadata=json.loads(device_data.get(b"metadata", b"{}"))
        )

    def set_desired_state(
        self,
        device_id: str,
        desired_state: Dict
    ) -> Dict:
        """Set the desired state for a device (device shadow pattern)."""
        device_key = f"{self.state_prefix}:{device_id}"

        # Merge with existing desired state
        current = self.redis.hget(device_key, "desired_state")
        current_state = json.loads(current) if current else {}
        current_state.update(desired_state)

        self.redis.hset(device_key, "desired_state", json.dumps(current_state))

        # Notify device of state change
        self._publish_state_update(device_id, current_state)

        return {
            "device_id": device_id,
            "desired_state": current_state
        }

    def get_state_delta(self, device_id: str) -> Dict:
        """Get difference between desired and reported state."""
        device_key = f"{self.state_prefix}:{device_id}"

        pipe = self.redis.pipeline()
        pipe.hget(device_key, "reported_state")
        pipe.hget(device_key, "desired_state")
        results = pipe.execute()

        reported = json.loads(results[0]) if results[0] else {}
        desired = json.loads(results[1]) if results[1] else {}

        delta = {}
        for key, value in desired.items():
            if key not in reported or reported[key] != value:
                delta[key] = {
                    "desired": value,
                    "reported": reported.get(key)
                }

        return {
            "device_id": device_id,
            "in_sync": len(delta) == 0,
            "delta": delta
        }

    def _publish_presence_event(
        self,
        device_id: str,
        status: str,
        timestamp: float
    ):
        """Publish device presence change event."""
        event = {
            "type": "presence",
            "device_id": device_id,
            "status": status,
            "timestamp": timestamp
        }
        self.redis.publish("devices:presence", json.dumps(event))

    def _publish_state_update(self, device_id: str, state: Dict):
        """Publish state update to device channel."""
        message = {
            "type": "state_update",
            "desired_state": state,
            "timestamp": time.time()
        }
        self.redis.publish(f"device:{device_id}:commands", json.dumps(message))
```

## Offline Detection Service

Monitor heartbeat expiration to detect offline devices:

```python
class OfflineDetector:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.state_prefix = "device:state"
        self.online_set = "devices:online"

    def check_for_offline_devices(self) -> List[str]:
        """Check which devices have gone offline."""
        offline_devices = []

        # Get all online devices
        online_devices = self.redis.smembers(self.online_set)

        for device_id in online_devices:
            device_id = device_id.decode() if isinstance(device_id, bytes) else device_id
            heartbeat_key = f"device:heartbeat:{device_id}"

            # Check if heartbeat has expired
            if not self.redis.exists(heartbeat_key):
                # Device is offline
                offline_devices.append(device_id)
                self._mark_device_offline(device_id)

        return offline_devices

    def _mark_device_offline(self, device_id: str):
        """Mark a device as offline and notify."""
        device_key = f"{self.state_prefix}:{device_id}"

        pipe = self.redis.pipeline()
        pipe.hset(device_key, "status", DeviceStatus.OFFLINE.value)
        pipe.srem(self.online_set, device_id)
        pipe.execute()

        # Publish offline event
        event = {
            "type": "presence",
            "device_id": device_id,
            "status": "offline",
            "timestamp": time.time()
        }
        self.redis.publish("devices:presence", json.dumps(event))

    def run_detector(self, interval: int = 10):
        """Run offline detection loop."""
        import threading

        def detect_loop():
            while True:
                offline = self.check_for_offline_devices()
                if offline:
                    print(f"Devices went offline: {offline}")
                time.sleep(interval)

        thread = threading.Thread(target=detect_loop, daemon=True)
        thread.start()
```

## Using Redis Keyspace Notifications

Subscribe to key expiration events for real-time offline detection:

```python
class KeyspaceOfflineDetector:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = redis_client.pubsub()
        self.state_manager = DeviceStateManager(redis_client)

    def start(self):
        """Start listening for heartbeat key expirations."""
        # Enable keyspace notifications (requires redis.conf: notify-keyspace-events Ex)
        self.redis.config_set("notify-keyspace-events", "Ex")

        # Subscribe to expiration events
        pattern = "__keyevent@0__:expired"
        self.pubsub.psubscribe(pattern)

        print("Listening for device heartbeat expirations...")

        for message in self.pubsub.listen():
            if message["type"] == "pmessage":
                expired_key = message["data"].decode()

                # Check if it's a heartbeat key
                if expired_key.startswith("device:heartbeat:"):
                    device_id = expired_key.split(":")[-1]
                    self._handle_device_offline(device_id)

    def _handle_device_offline(self, device_id: str):
        """Handle device going offline."""
        print(f"Device {device_id} went offline")

        device_key = f"device:state:{device_id}"
        online_set = "devices:online"

        pipe = self.redis.pipeline()
        pipe.hset(device_key, "status", "offline")
        pipe.srem(online_set, device_id)
        pipe.execute()

        # Publish event
        event = {
            "type": "presence",
            "device_id": device_id,
            "status": "offline",
            "timestamp": time.time()
        }
        self.redis.publish("devices:presence", json.dumps(event))
```

## Bulk State Queries

Efficiently query state of multiple devices:

```python
class BulkStateQuery:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.state_prefix = "device:state"

    def get_devices_by_status(
        self,
        status: DeviceStatus
    ) -> List[str]:
        """Get all devices with a specific status."""
        if status == DeviceStatus.ONLINE:
            devices = self.redis.smembers("devices:online")
        else:
            # Get all registered, subtract online
            all_devices = self.redis.smembers("devices:registered")
            online_devices = self.redis.smembers("devices:online")
            devices = all_devices - online_devices

        return [d.decode() if isinstance(d, bytes) else d for d in devices]

    def get_devices_by_type(
        self,
        device_type: str,
        include_state: bool = False
    ) -> List[Dict]:
        """Get all devices of a specific type."""
        device_ids = self.redis.smembers(f"devices:type:{device_type}")

        if not include_state:
            return [d.decode() if isinstance(d, bytes) else d for d in device_ids]

        # Get state for each device
        pipe = self.redis.pipeline()
        for device_id in device_ids:
            device_id = device_id.decode() if isinstance(device_id, bytes) else device_id
            pipe.hgetall(f"{self.state_prefix}:{device_id}")
            pipe.exists(f"device:heartbeat:{device_id}")

        results = pipe.execute()

        devices = []
        for i in range(0, len(results), 2):
            state_data = results[i]
            is_online = results[i + 1]

            if state_data:
                devices.append({
                    "device_id": state_data.get(b"device_id", b"").decode(),
                    "status": "online" if is_online else "offline",
                    "last_seen": float(state_data.get(b"last_seen", 0)),
                    "reported_state": json.loads(state_data.get(b"reported_state", b"{}"))
                })

        return devices

    def get_devices_with_stale_state(
        self,
        max_age_seconds: int = 3600
    ) -> List[Dict]:
        """Get devices that haven't reported recently."""
        cutoff = time.time() - max_age_seconds
        all_devices = self.redis.smembers("devices:registered")

        stale_devices = []
        pipe = self.redis.pipeline()

        for device_id in all_devices:
            device_id = device_id.decode() if isinstance(device_id, bytes) else device_id
            pipe.hget(f"{self.state_prefix}:{device_id}", "last_seen")

        results = pipe.execute()

        for device_id, last_seen in zip(all_devices, results):
            device_id = device_id.decode() if isinstance(device_id, bytes) else device_id
            if last_seen:
                last_seen_time = float(last_seen)
                if last_seen_time < cutoff:
                    stale_devices.append({
                        "device_id": device_id,
                        "last_seen": last_seen_time,
                        "age_seconds": time.time() - last_seen_time
                    })

        return sorted(stale_devices, key=lambda d: d["last_seen"])
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');

class DeviceStateManager {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);
        this.heartbeatTimeout = 60;
        this.statePrefix = 'device:state';
        this.onlineSet = 'devices:online';
    }

    async registerDevice(deviceId, deviceType, metadata = {}) {
        const deviceKey = `${this.statePrefix}:${deviceId}`;

        await this.redis.hset(deviceKey, {
            deviceId,
            deviceType,
            registeredAt: Date.now().toString(),
            status: 'offline',
            lastSeen: '0',
            reportedState: JSON.stringify({}),
            desiredState: JSON.stringify({}),
            metadata: JSON.stringify(metadata)
        });

        await this.redis.sadd('devices:registered', deviceId);
        await this.redis.sadd(`devices:type:${deviceType}`, deviceId);

        return true;
    }

    async deviceHeartbeat(deviceId, reportedState = null) {
        const now = Date.now();
        const deviceKey = `${this.statePrefix}:${deviceId}`;
        const heartbeatKey = `device:heartbeat:${deviceId}`;

        // Check if device was offline
        const wasOffline = !(await this.redis.exists(heartbeatKey));

        const pipeline = this.redis.pipeline();

        // Set heartbeat with TTL
        pipeline.setex(heartbeatKey, this.heartbeatTimeout, '1');

        // Update device state
        const updates = {
            status: 'online',
            lastSeen: now.toString()
        };

        if (reportedState) {
            updates.reportedState = JSON.stringify(reportedState);
        }

        pipeline.hset(deviceKey, updates);
        pipeline.sadd(this.onlineSet, deviceId);

        await pipeline.exec();

        // Publish online event if was offline
        if (wasOffline) {
            await this.publishPresenceEvent(deviceId, 'online', now);
        }

        return {
            deviceId,
            status: 'online',
            wasOffline
        };
    }

    async getDeviceState(deviceId) {
        const deviceKey = `${this.statePrefix}:${deviceId}`;
        const heartbeatKey = `device:heartbeat:${deviceId}`;

        const [deviceData, isOnline] = await Promise.all([
            this.redis.hgetall(deviceKey),
            this.redis.exists(heartbeatKey)
        ]);

        if (!deviceData.deviceId) {
            return null;
        }

        const status = isOnline ? 'online' : 'offline';

        // Update status if changed
        if (deviceData.status !== status) {
            await this.redis.hset(deviceKey, 'status', status);
        }

        return {
            deviceId,
            status,
            reportedState: JSON.parse(deviceData.reportedState || '{}'),
            desiredState: JSON.parse(deviceData.desiredState || '{}'),
            lastSeen: parseFloat(deviceData.lastSeen || 0),
            metadata: JSON.parse(deviceData.metadata || '{}')
        };
    }

    async setDesiredState(deviceId, desiredState) {
        const deviceKey = `${this.statePrefix}:${deviceId}`;

        // Merge with existing
        const current = await this.redis.hget(deviceKey, 'desiredState');
        const currentState = current ? JSON.parse(current) : {};
        Object.assign(currentState, desiredState);

        await this.redis.hset(deviceKey, 'desiredState', JSON.stringify(currentState));

        // Notify device
        await this.pubClient.publish(
            `device:${deviceId}:commands`,
            JSON.stringify({
                type: 'state_update',
                desiredState: currentState,
                timestamp: Date.now()
            })
        );

        return { deviceId, desiredState: currentState };
    }

    async getStateDelta(deviceId) {
        const deviceKey = `${this.statePrefix}:${deviceId}`;

        const [reportedJson, desiredJson] = await Promise.all([
            this.redis.hget(deviceKey, 'reportedState'),
            this.redis.hget(deviceKey, 'desiredState')
        ]);

        const reported = reportedJson ? JSON.parse(reportedJson) : {};
        const desired = desiredJson ? JSON.parse(desiredJson) : {};

        const delta = {};
        for (const [key, value] of Object.entries(desired)) {
            if (!(key in reported) || reported[key] !== value) {
                delta[key] = {
                    desired: value,
                    reported: reported[key]
                };
            }
        }

        return {
            deviceId,
            inSync: Object.keys(delta).length === 0,
            delta
        };
    }

    async publishPresenceEvent(deviceId, status, timestamp) {
        await this.pubClient.publish('devices:presence', JSON.stringify({
            type: 'presence',
            deviceId,
            status,
            timestamp
        }));
    }

    // Bulk queries
    async getOnlineDevices() {
        const devices = await this.redis.smembers(this.onlineSet);
        return devices;
    }

    async getOfflineDevices() {
        const [all, online] = await Promise.all([
            this.redis.smembers('devices:registered'),
            this.redis.smembers(this.onlineSet)
        ]);

        const onlineSet = new Set(online);
        return all.filter(d => !onlineSet.has(d));
    }

    // Subscribe to presence events
    subscribeToPresence(callback) {
        const subClient = new Redis(this.redis.options);
        subClient.subscribe('devices:presence');

        subClient.on('message', (channel, message) => {
            callback(JSON.parse(message));
        });

        return () => {
            subClient.unsubscribe('devices:presence');
            subClient.quit();
        };
    }
}

// Offline detector using keyspace notifications
class OfflineDetector {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.subClient = new Redis(redisConfig);
        this.stateManager = new DeviceStateManager(redisConfig);
    }

    async start() {
        // Enable keyspace notifications
        await this.redis.config('SET', 'notify-keyspace-events', 'Ex');

        // Subscribe to expiration events
        await this.subClient.psubscribe('__keyevent@0__:expired');

        this.subClient.on('pmessage', async (pattern, channel, key) => {
            if (key.startsWith('device:heartbeat:')) {
                const deviceId = key.split(':')[2];
                await this.handleDeviceOffline(deviceId);
            }
        });

        console.log('Offline detector started');
    }

    async handleDeviceOffline(deviceId) {
        console.log(`Device ${deviceId} went offline`);

        const pipeline = this.redis.pipeline();
        pipeline.hset(`device:state:${deviceId}`, 'status', 'offline');
        pipeline.srem('devices:online', deviceId);
        await pipeline.exec();

        await this.redis.publish('devices:presence', JSON.stringify({
            type: 'presence',
            deviceId,
            status: 'offline',
            timestamp: Date.now()
        }));
    }
}

// Usage
const stateManager = new DeviceStateManager({ host: 'localhost', port: 6379 });

// Register device
await stateManager.registerDevice('sensor-001', 'temperature_sensor', {
    location: 'warehouse-a'
});

// Device heartbeat
await stateManager.deviceHeartbeat('sensor-001', {
    temperature: 23.5,
    humidity: 45
});

// Get state
const state = await stateManager.getDeviceState('sensor-001');
console.log(state);

// Set desired state
await stateManager.setDesiredState('sensor-001', {
    reportingInterval: 30
});

// Subscribe to presence
stateManager.subscribeToPresence((event) => {
    console.log(`Device ${event.deviceId} is now ${event.status}`);
});
```

## Best Practices

1. **Use TTL for heartbeats** - Let Redis handle expiration instead of polling.

2. **Enable keyspace notifications** - Get real-time offline detection without polling.

3. **Store state separately from heartbeat** - Device state persists even when heartbeat expires.

4. **Use device shadow pattern** - Track desired vs reported state for reliable configuration.

5. **Batch queries with pipelines** - Efficiently query multiple device states.

6. **Index by device type** - Enable efficient queries for specific device categories.

7. **Publish presence events** - Enable other services to react to device status changes.

## Conclusion

Redis provides an excellent foundation for device state management. Its combination of TTL-based expiration, hashes for structured state, and pub/sub for real-time notifications makes it ideal for tracking millions of IoT devices. The device shadow pattern enables reliable state synchronization even when devices are intermittently connected.

For more IoT patterns with Redis, check out our guides on [IoT Data Ingestion](/blog/redis-iot-data-ingestion) and [Command Queues](/blog/redis-iot-command-queues).

# How to Implement Real-Time Inventory Management with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Real-Time, Inventory, E-Commerce, Stock Management, Reservations, High Concurrency

Description: A comprehensive guide to implementing real-time inventory management with Redis, covering stock tracking, reservation systems, overselling prevention, and high-concurrency handling for e-commerce applications.

---

Real-time inventory management is critical for e-commerce platforms where stock levels change rapidly and overselling must be prevented. Redis's atomic operations and low latency make it ideal for building inventory systems that handle high concurrency. This guide covers how to implement robust inventory tracking with reservations, stock alerts, and real-time updates.

## Inventory Management Architecture

A real-time inventory system includes:

1. **Stock Tracking**: Current available quantities per SKU
2. **Reservations**: Temporary holds during checkout
3. **Atomic Updates**: Prevent overselling with atomic operations
4. **Real-Time Sync**: Keep all channels updated
5. **Audit Trail**: Track all inventory movements

## Basic Inventory Store

```python
import redis
import json
import time
import uuid
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class InventoryMovementType(Enum):
    RECEIPT = 'receipt'
    SALE = 'sale'
    RESERVATION = 'reservation'
    RESERVATION_RELEASE = 'reservation_release'
    ADJUSTMENT = 'adjustment'
    RETURN = 'return'
    TRANSFER = 'transfer'

@dataclass
class InventoryMovement:
    id: str
    sku: str
    movement_type: str
    quantity: int
    reference_id: Optional[str]
    warehouse: str
    timestamp: float
    notes: Optional[str]


class InventoryStore:
    """Basic inventory storage and retrieval"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def set_stock(self, sku: str, quantity: int, warehouse: str = 'default'):
        """Set initial stock level"""
        key = f"inventory:{warehouse}:{sku}"
        self.redis.hset(key, mapping={
            'available': quantity,
            'reserved': 0,
            'total': quantity,
            'updated_at': time.time()
        })

        # Index SKU
        self.redis.sadd(f"inventory:skus:{warehouse}", sku)
        self.redis.sadd('inventory:warehouses', warehouse)

    def get_stock(self, sku: str, warehouse: str = 'default') -> Dict:
        """Get current stock levels"""
        key = f"inventory:{warehouse}:{sku}"
        data = self.redis.hgetall(key)

        if not data:
            return {'available': 0, 'reserved': 0, 'total': 0}

        return {
            'available': int(data.get('available', 0)),
            'reserved': int(data.get('reserved', 0)),
            'total': int(data.get('total', 0)),
            'updated_at': float(data.get('updated_at', 0))
        }

    def get_multi_stock(self, skus: List[str], warehouse: str = 'default') -> Dict[str, Dict]:
        """Get stock for multiple SKUs efficiently"""
        pipe = self.redis.pipeline()
        for sku in skus:
            pipe.hgetall(f"inventory:{warehouse}:{sku}")

        results = pipe.execute()
        stock = {}

        for sku, data in zip(skus, results):
            if data:
                stock[sku] = {
                    'available': int(data.get('available', 0)),
                    'reserved': int(data.get('reserved', 0)),
                    'total': int(data.get('total', 0))
                }
            else:
                stock[sku] = {'available': 0, 'reserved': 0, 'total': 0}

        return stock

    def record_movement(self, movement: InventoryMovement):
        """Record inventory movement for audit trail"""
        key = f"inventory:movements:{movement.warehouse}:{movement.sku}"
        movement_data = {
            'id': movement.id,
            'type': movement.movement_type,
            'quantity': movement.quantity,
            'reference_id': movement.reference_id or '',
            'timestamp': movement.timestamp,
            'notes': movement.notes or ''
        }
        self.redis.zadd(key, {json.dumps(movement_data): movement.timestamp})

        # Keep last 1000 movements per SKU
        self.redis.zremrangebyrank(key, 0, -1001)


# Usage
r = redis.Redis(decode_responses=True)
store = InventoryStore(r)

# Set initial stock
store.set_stock('SKU-001', 100, 'warehouse-east')
store.set_stock('SKU-001', 50, 'warehouse-west')

# Get stock
stock = store.get_stock('SKU-001', 'warehouse-east')
print(f"Stock: {stock}")
```

## Atomic Inventory Operations

The key to preventing overselling is atomic stock updates using Lua scripts.

```python
class AtomicInventoryService:
    """Atomic inventory operations to prevent overselling"""

    # Deduct stock atomically
    DEDUCT_STOCK_SCRIPT = """
    local key = KEYS[1]
    local quantity = tonumber(ARGV[1])
    local reference_id = ARGV[2]
    local timestamp = ARGV[3]

    local available = tonumber(redis.call('HGET', key, 'available') or 0)

    if available < quantity then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_STOCK',
            available = available,
            requested = quantity
        })
    end

    -- Deduct stock
    local new_available = redis.call('HINCRBY', key, 'available', -quantity)
    local new_total = redis.call('HINCRBY', key, 'total', -quantity)
    redis.call('HSET', key, 'updated_at', timestamp)

    return cjson.encode({
        success = true,
        previous_available = available,
        new_available = new_available,
        quantity_deducted = quantity
    })
    """

    # Add stock atomically
    ADD_STOCK_SCRIPT = """
    local key = KEYS[1]
    local quantity = tonumber(ARGV[1])
    local timestamp = ARGV[2]

    local available = tonumber(redis.call('HGET', key, 'available') or 0)
    local total = tonumber(redis.call('HGET', key, 'total') or 0)

    -- Add stock
    local new_available = redis.call('HINCRBY', key, 'available', quantity)
    local new_total = redis.call('HINCRBY', key, 'total', quantity)
    redis.call('HSET', key, 'updated_at', timestamp)

    return cjson.encode({
        success = true,
        previous_available = available,
        new_available = new_available,
        quantity_added = quantity
    })
    """

    # Reserve stock (for cart/checkout)
    RESERVE_STOCK_SCRIPT = """
    local key = KEYS[1]
    local reservations_key = KEYS[2]
    local quantity = tonumber(ARGV[1])
    local reservation_id = ARGV[2]
    local ttl = tonumber(ARGV[3])
    local timestamp = ARGV[4]

    local available = tonumber(redis.call('HGET', key, 'available') or 0)

    if available < quantity then
        return cjson.encode({
            success = false,
            error = 'INSUFFICIENT_STOCK',
            available = available,
            requested = quantity
        })
    end

    -- Move from available to reserved
    redis.call('HINCRBY', key, 'available', -quantity)
    redis.call('HINCRBY', key, 'reserved', quantity)
    redis.call('HSET', key, 'updated_at', timestamp)

    -- Store reservation details
    local reservation = cjson.encode({
        id = reservation_id,
        quantity = quantity,
        timestamp = timestamp,
        expires = tonumber(timestamp) + ttl
    })
    redis.call('HSET', reservations_key, reservation_id, reservation)

    -- Set expiry key for auto-release
    redis.call('SETEX', 'reservation_expiry:' .. reservation_id, ttl, key .. ':' .. quantity)

    return cjson.encode({
        success = true,
        reservation_id = reservation_id,
        quantity_reserved = quantity,
        new_available = available - quantity,
        expires_in = ttl
    })
    """

    # Commit reservation (complete purchase)
    COMMIT_RESERVATION_SCRIPT = """
    local key = KEYS[1]
    local reservations_key = KEYS[2]
    local reservation_id = ARGV[1]
    local timestamp = ARGV[2]

    local reservation_json = redis.call('HGET', reservations_key, reservation_id)
    if not reservation_json then
        return cjson.encode({
            success = false,
            error = 'RESERVATION_NOT_FOUND'
        })
    end

    local reservation = cjson.decode(reservation_json)

    -- Check if expired
    if tonumber(timestamp) > reservation.expires then
        return cjson.encode({
            success = false,
            error = 'RESERVATION_EXPIRED'
        })
    end

    -- Remove from reserved, decrease total
    redis.call('HINCRBY', key, 'reserved', -reservation.quantity)
    redis.call('HINCRBY', key, 'total', -reservation.quantity)
    redis.call('HSET', key, 'updated_at', timestamp)

    -- Remove reservation record
    redis.call('HDEL', reservations_key, reservation_id)
    redis.call('DEL', 'reservation_expiry:' .. reservation_id)

    return cjson.encode({
        success = true,
        quantity_committed = reservation.quantity
    })
    """

    # Release reservation (cancel)
    RELEASE_RESERVATION_SCRIPT = """
    local key = KEYS[1]
    local reservations_key = KEYS[2]
    local reservation_id = ARGV[1]
    local timestamp = ARGV[2]

    local reservation_json = redis.call('HGET', reservations_key, reservation_id)
    if not reservation_json then
        return cjson.encode({
            success = false,
            error = 'RESERVATION_NOT_FOUND'
        })
    end

    local reservation = cjson.decode(reservation_json)

    -- Move from reserved back to available
    redis.call('HINCRBY', key, 'available', reservation.quantity)
    redis.call('HINCRBY', key, 'reserved', -reservation.quantity)
    redis.call('HSET', key, 'updated_at', timestamp)

    -- Remove reservation record
    redis.call('HDEL', reservations_key, reservation_id)
    redis.call('DEL', 'reservation_expiry:' .. reservation_id)

    return cjson.encode({
        success = true,
        quantity_released = reservation.quantity
    })
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._deduct_stock = redis_client.register_script(self.DEDUCT_STOCK_SCRIPT)
        self._add_stock = redis_client.register_script(self.ADD_STOCK_SCRIPT)
        self._reserve_stock = redis_client.register_script(self.RESERVE_STOCK_SCRIPT)
        self._commit_reservation = redis_client.register_script(self.COMMIT_RESERVATION_SCRIPT)
        self._release_reservation = redis_client.register_script(self.RELEASE_RESERVATION_SCRIPT)

    def deduct_stock(self, sku: str, quantity: int, reference_id: str = None,
                     warehouse: str = 'default') -> Dict:
        """Deduct stock atomically"""
        key = f"inventory:{warehouse}:{sku}"
        timestamp = str(time.time())

        result = self._deduct_stock(
            keys=[key],
            args=[quantity, reference_id or '', timestamp]
        )

        result_dict = json.loads(result)

        if result_dict.get('success'):
            self._publish_update(sku, warehouse, 'deduct', quantity)

        return result_dict

    def add_stock(self, sku: str, quantity: int, warehouse: str = 'default') -> Dict:
        """Add stock atomically"""
        key = f"inventory:{warehouse}:{sku}"
        timestamp = str(time.time())

        result = self._add_stock(
            keys=[key],
            args=[quantity, timestamp]
        )

        result_dict = json.loads(result)

        if result_dict.get('success'):
            self._publish_update(sku, warehouse, 'add', quantity)

        return result_dict

    def reserve_stock(self, sku: str, quantity: int, ttl_seconds: int = 600,
                      warehouse: str = 'default') -> Dict:
        """Reserve stock temporarily (e.g., during checkout)"""
        key = f"inventory:{warehouse}:{sku}"
        reservations_key = f"inventory:{warehouse}:{sku}:reservations"
        reservation_id = str(uuid.uuid4())
        timestamp = str(time.time())

        result = self._reserve_stock(
            keys=[key, reservations_key],
            args=[quantity, reservation_id, ttl_seconds, timestamp]
        )

        result_dict = json.loads(result)

        if result_dict.get('success'):
            self._publish_update(sku, warehouse, 'reserve', quantity)

        return result_dict

    def commit_reservation(self, sku: str, reservation_id: str,
                          warehouse: str = 'default') -> Dict:
        """Commit a reservation (complete purchase)"""
        key = f"inventory:{warehouse}:{sku}"
        reservations_key = f"inventory:{warehouse}:{sku}:reservations"
        timestamp = str(time.time())

        result = self._commit_reservation(
            keys=[key, reservations_key],
            args=[reservation_id, timestamp]
        )

        result_dict = json.loads(result)

        if result_dict.get('success'):
            self._publish_update(sku, warehouse, 'commit', result_dict['quantity_committed'])

        return result_dict

    def release_reservation(self, sku: str, reservation_id: str,
                           warehouse: str = 'default') -> Dict:
        """Release a reservation (cancel checkout)"""
        key = f"inventory:{warehouse}:{sku}"
        reservations_key = f"inventory:{warehouse}:{sku}:reservations"
        timestamp = str(time.time())

        result = self._release_reservation(
            keys=[key, reservations_key],
            args=[reservation_id, timestamp]
        )

        result_dict = json.loads(result)

        if result_dict.get('success'):
            self._publish_update(sku, warehouse, 'release', result_dict['quantity_released'])

        return result_dict

    def _publish_update(self, sku: str, warehouse: str, action: str, quantity: int):
        """Publish inventory update for real-time subscribers"""
        self.redis.publish('inventory:updates', json.dumps({
            'sku': sku,
            'warehouse': warehouse,
            'action': action,
            'quantity': quantity,
            'timestamp': time.time()
        }))


# Usage
r = redis.Redis(decode_responses=True)
inventory = AtomicInventoryService(r)

# Initial stock
store = InventoryStore(r)
store.set_stock('SKU-001', 100)

# Reserve during checkout
reserve_result = inventory.reserve_stock('SKU-001', 2, ttl_seconds=600)
print(f"Reserve: {reserve_result}")

if reserve_result['success']:
    # Complete purchase
    commit_result = inventory.commit_reservation('SKU-001', reserve_result['reservation_id'])
    print(f"Commit: {commit_result}")
```

## Multi-SKU Order Processing

```python
class OrderInventoryService:
    """Process orders with multiple SKUs atomically"""

    PROCESS_ORDER_SCRIPT = """
    -- KEYS: inventory keys for each item
    -- ARGV: order_id, timestamp, then (sku, quantity, warehouse) tuples

    local order_id = ARGV[1]
    local timestamp = ARGV[2]

    local items = {}
    local i = 3
    while i <= #ARGV do
        table.insert(items, {
            sku = ARGV[i],
            quantity = tonumber(ARGV[i + 1]),
            warehouse = ARGV[i + 2]
        })
        i = i + 3
    end

    -- First pass: validate all items have sufficient stock
    for idx, item in ipairs(items) do
        local key = 'inventory:' .. item.warehouse .. ':' .. item.sku
        local available = tonumber(redis.call('HGET', key, 'available') or 0)

        if available < item.quantity then
            return cjson.encode({
                success = false,
                error = 'INSUFFICIENT_STOCK',
                sku = item.sku,
                warehouse = item.warehouse,
                available = available,
                requested = item.quantity
            })
        end
    end

    -- Second pass: deduct all items
    local deducted = {}
    for idx, item in ipairs(items) do
        local key = 'inventory:' .. item.warehouse .. ':' .. item.sku

        local prev_available = tonumber(redis.call('HGET', key, 'available'))
        redis.call('HINCRBY', key, 'available', -item.quantity)
        redis.call('HINCRBY', key, 'total', -item.quantity)
        redis.call('HSET', key, 'updated_at', timestamp)

        table.insert(deducted, {
            sku = item.sku,
            warehouse = item.warehouse,
            quantity = item.quantity,
            previous_available = prev_available
        })
    end

    -- Record order
    local order_key = 'orders:inventory:' .. order_id
    redis.call('SET', order_key, cjson.encode({
        order_id = order_id,
        items = deducted,
        timestamp = timestamp
    }))

    return cjson.encode({
        success = true,
        order_id = order_id,
        items = deducted
    })
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._process_order = redis_client.register_script(self.PROCESS_ORDER_SCRIPT)

    def process_order(self, order_id: str, items: List[Dict]) -> Dict:
        """
        Process order with multiple items atomically.

        Args:
            order_id: Unique order identifier
            items: List of {'sku': str, 'quantity': int, 'warehouse': str}
        """
        timestamp = str(time.time())

        # Build args
        args = [order_id, timestamp]
        keys = []
        for item in items:
            warehouse = item.get('warehouse', 'default')
            keys.append(f"inventory:{warehouse}:{item['sku']}")
            args.extend([item['sku'], str(item['quantity']), warehouse])

        result = self._process_order(keys=keys, args=args)
        result_dict = json.loads(result)

        if result_dict.get('success'):
            # Publish updates for each item
            for item in items:
                self.redis.publish('inventory:updates', json.dumps({
                    'sku': item['sku'],
                    'warehouse': item.get('warehouse', 'default'),
                    'action': 'order',
                    'quantity': item['quantity'],
                    'order_id': order_id,
                    'timestamp': time.time()
                }))

        return result_dict


# Usage
r = redis.Redis(decode_responses=True)
order_service = OrderInventoryService(r)

result = order_service.process_order('ORD-12345', [
    {'sku': 'SKU-001', 'quantity': 2, 'warehouse': 'default'},
    {'sku': 'SKU-002', 'quantity': 1, 'warehouse': 'default'},
])
print(f"Order result: {result}")
```

## Real-Time Stock Updates

```python
import asyncio
import aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

class InventoryWebSocketManager:
    """Real-time inventory updates via WebSocket"""

    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}  # sku -> connections
        self.all_connections: Set[WebSocket] = set()  # For global updates
        self.redis = None

    async def get_redis(self):
        if not self.redis:
            self.redis = await aioredis.from_url('redis://localhost', decode_responses=True)
        return self.redis

    async def connect(self, websocket: WebSocket, skus: List[str] = None):
        """Connect to inventory updates"""
        await websocket.accept()

        self.all_connections.add(websocket)

        if skus:
            for sku in skus:
                if sku not in self.connections:
                    self.connections[sku] = set()
                self.connections[sku].add(websocket)

        # Send initial stock levels
        await self._send_initial_stock(websocket, skus)

    async def disconnect(self, websocket: WebSocket):
        """Disconnect from updates"""
        self.all_connections.discard(websocket)

        for sku_connections in self.connections.values():
            sku_connections.discard(websocket)

    async def start_subscription(self):
        """Start Redis subscription for inventory updates"""
        redis = await self.get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe('inventory:updates')

        async for message in pubsub.listen():
            if message['type'] == 'message':
                update = json.loads(message['data'])
                await self._broadcast_update(update)

    async def _broadcast_update(self, update: dict):
        """Broadcast update to relevant connections"""
        sku = update['sku']
        message = json.dumps({
            'type': 'stock_update',
            'data': update
        })

        # Send to SKU subscribers
        if sku in self.connections:
            for ws in list(self.connections[sku]):
                try:
                    await ws.send_text(message)
                except Exception:
                    self.connections[sku].discard(ws)

        # Send to all subscribers
        for ws in list(self.all_connections):
            if sku not in self.connections or ws not in self.connections[sku]:
                try:
                    await ws.send_text(message)
                except Exception:
                    self.all_connections.discard(ws)

    async def _send_initial_stock(self, websocket: WebSocket, skus: List[str] = None):
        """Send current stock levels"""
        redis = await self.get_redis()

        if not skus:
            # Get all SKUs
            skus = list(await redis.smembers('inventory:skus:default'))

        stock_data = {}
        for sku in skus:
            data = await redis.hgetall(f"inventory:default:{sku}")
            if data:
                stock_data[sku] = {
                    'available': int(data.get('available', 0)),
                    'reserved': int(data.get('reserved', 0)),
                    'total': int(data.get('total', 0))
                }

        await websocket.send_text(json.dumps({
            'type': 'initial_stock',
            'data': stock_data
        }))


manager = InventoryWebSocketManager()

@app.on_event("startup")
async def startup():
    asyncio.create_task(manager.start_subscription())

@app.websocket("/ws/inventory")
async def inventory_websocket(websocket: WebSocket, skus: str = None):
    sku_list = skus.split(',') if skus else None
    await manager.connect(websocket, sku_list)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get('type') == 'subscribe':
                for sku in message.get('skus', []):
                    if sku not in manager.connections:
                        manager.connections[sku] = set()
                    manager.connections[sku].add(websocket)

            elif message.get('type') == 'unsubscribe':
                for sku in message.get('skus', []):
                    if sku in manager.connections:
                        manager.connections[sku].discard(websocket)

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
```

## Low Stock Alerts

```python
class StockAlertService:
    """Monitor stock levels and trigger alerts"""

    CHECK_LOW_STOCK_SCRIPT = """
    local inventory_key = KEYS[1]
    local alerts_key = KEYS[2]
    local sku = ARGV[1]
    local threshold = tonumber(ARGV[2])
    local timestamp = ARGV[3]

    local available = tonumber(redis.call('HGET', inventory_key, 'available') or 0)

    -- Check if already alerted
    local last_alert = redis.call('HGET', alerts_key, sku)
    if last_alert then
        local alert_data = cjson.decode(last_alert)
        -- Don't re-alert within 1 hour
        if tonumber(timestamp) - alert_data.timestamp < 3600 then
            return cjson.encode({alert = false, reason = 'recently_alerted'})
        end
    end

    if available <= threshold then
        local alert = {
            sku = sku,
            available = available,
            threshold = threshold,
            timestamp = tonumber(timestamp)
        }
        redis.call('HSET', alerts_key, sku, cjson.encode(alert))
        return cjson.encode({alert = true, data = alert})
    end

    return cjson.encode({alert = false, reason = 'stock_ok'})
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self._check_low_stock = redis_client.register_script(self.CHECK_LOW_STOCK_SCRIPT)
        self.thresholds = {}  # sku -> threshold

    def set_threshold(self, sku: str, threshold: int, warehouse: str = 'default'):
        """Set low stock threshold for SKU"""
        key = f"{warehouse}:{sku}"
        self.thresholds[key] = threshold
        self.redis.hset('inventory:thresholds', key, threshold)

    def check_stock_level(self, sku: str, warehouse: str = 'default') -> Optional[Dict]:
        """Check if stock is low and create alert if needed"""
        key = f"{warehouse}:{sku}"
        threshold = self.thresholds.get(key)

        if threshold is None:
            threshold = int(self.redis.hget('inventory:thresholds', key) or 10)

        result = self._check_low_stock(
            keys=[
                f"inventory:{warehouse}:{sku}",
                'inventory:alerts'
            ],
            args=[sku, threshold, str(time.time())]
        )

        result_dict = json.loads(result)

        if result_dict.get('alert'):
            # Publish alert
            self.redis.publish('inventory:alerts', json.dumps(result_dict['data']))
            return result_dict['data']

        return None

    def get_low_stock_items(self, warehouse: str = 'default') -> List[Dict]:
        """Get all items with low stock"""
        alerts = self.redis.hgetall('inventory:alerts')
        low_stock = []

        for sku, alert_json in alerts.items():
            alert = json.loads(alert_json)
            low_stock.append(alert)

        return sorted(low_stock, key=lambda x: x['available'])

    async def monitor_stock(self, check_interval: int = 60):
        """Continuously monitor stock levels"""
        while True:
            # Get all SKUs
            skus = self.redis.smembers(f"inventory:skus:default")

            for sku in skus:
                self.check_stock_level(sku)

            await asyncio.sleep(check_interval)


# Usage
r = redis.Redis(decode_responses=True)
alerts = StockAlertService(r)

# Set thresholds
alerts.set_threshold('SKU-001', 10)
alerts.set_threshold('SKU-002', 5)

# Check stock
alert = alerts.check_stock_level('SKU-001')
if alert:
    print(f"Low stock alert: {alert}")
```

## Frontend Inventory Display

```javascript
class InventoryDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.ws = null;
        this.inventory = new Map();

        this.init();
    }

    init() {
        this.render();
        this.connect();
    }

    connect() {
        this.ws = new WebSocket('wss://api.example.com/ws/inventory');

        this.ws.onopen = () => {
            console.log('Connected to inventory updates');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            setTimeout(() => this.connect(), 3000);
        };
    }

    handleMessage(message) {
        switch (message.type) {
            case 'initial_stock':
                this.initializeInventory(message.data);
                break;
            case 'stock_update':
                this.updateStock(message.data);
                break;
        }
    }

    initializeInventory(data) {
        for (const [sku, stock] of Object.entries(data)) {
            this.inventory.set(sku, stock);
        }
        this.renderInventory();
    }

    updateStock(update) {
        const { sku, action, quantity } = update;
        const current = this.inventory.get(sku) || { available: 0, reserved: 0, total: 0 };

        // Update based on action
        switch (action) {
            case 'deduct':
            case 'order':
                current.available -= quantity;
                current.total -= quantity;
                break;
            case 'add':
                current.available += quantity;
                current.total += quantity;
                break;
            case 'reserve':
                current.available -= quantity;
                current.reserved += quantity;
                break;
            case 'release':
                current.available += quantity;
                current.reserved -= quantity;
                break;
            case 'commit':
                current.reserved -= quantity;
                current.total -= quantity;
                break;
        }

        this.inventory.set(sku, current);
        this.updateStockDisplay(sku, current);
    }

    render() {
        this.container.innerHTML = `
            <div class="inventory-container">
                <h2>Inventory Status</h2>
                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Available</th>
                            <th>Reserved</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-body">
                    </tbody>
                </table>
            </div>
        `;
    }

    renderInventory() {
        const tbody = document.getElementById('inventory-body');
        tbody.innerHTML = '';

        for (const [sku, stock] of this.inventory) {
            tbody.appendChild(this.createRow(sku, stock));
        }
    }

    createRow(sku, stock) {
        const row = document.createElement('tr');
        row.id = `row-${sku}`;
        row.innerHTML = this.getRowHTML(sku, stock);
        return row;
    }

    getRowHTML(sku, stock) {
        const status = this.getStatus(stock.available);
        return `
            <td class="sku">${sku}</td>
            <td class="available">${stock.available}</td>
            <td class="reserved">${stock.reserved}</td>
            <td class="total">${stock.total}</td>
            <td class="status ${status.class}">${status.label}</td>
        `;
    }

    updateStockDisplay(sku, stock) {
        let row = document.getElementById(`row-${sku}`);

        if (!row) {
            row = this.createRow(sku, stock);
            document.getElementById('inventory-body').appendChild(row);
        } else {
            row.innerHTML = this.getRowHTML(sku, stock);
            row.classList.add('updated');
            setTimeout(() => row.classList.remove('updated'), 1000);
        }
    }

    getStatus(available) {
        if (available === 0) {
            return { class: 'out-of-stock', label: 'Out of Stock' };
        } else if (available <= 10) {
            return { class: 'low-stock', label: 'Low Stock' };
        }
        return { class: 'in-stock', label: 'In Stock' };
    }
}

// Usage
const inventory = new InventoryDisplay('inventory-container');
```

## Conclusion

Real-time inventory management with Redis enables accurate stock tracking and prevents overselling in high-concurrency environments. Key takeaways:

- Use Lua scripts for atomic inventory operations
- Implement reservations with TTL for checkout flows
- Process multi-item orders atomically
- Stream updates via WebSocket for real-time displays
- Set up low stock alerts with thresholds
- Record all movements for audit trails

By combining Redis's atomic operations with real-time streaming, you can build inventory systems that handle flash sales and high traffic while maintaining accurate stock levels.

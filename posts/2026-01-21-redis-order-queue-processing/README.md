# How to Implement Order Queue Processing with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Order Processing, Queues, Fulfillment, Workflow

Description: A comprehensive guide to implementing order queue processing with Redis for order fulfillment, status tracking, and reliable workflow management.

---

Order processing is the backbone of e-commerce operations. From the moment a customer places an order to final delivery, multiple steps must be coordinated reliably. Redis provides the queuing capabilities, atomic operations, and pub/sub features needed to build robust order processing systems.

## Understanding Order Processing Challenges

Order processing involves:

- **Order intake**: Capturing orders from checkout
- **Validation**: Inventory checks, fraud detection
- **Payment processing**: Charging customers
- **Fulfillment**: Picking, packing, shipping
- **Status tracking**: Real-time order status updates
- **Notifications**: Emails, SMS, push notifications

## Basic Order Queue

### Python Implementation

```python
import redis
import json
import time
import uuid
from enum import Enum
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class OrderStatus(Enum):
    PENDING = 'pending'
    VALIDATED = 'validated'
    PAYMENT_PROCESSING = 'payment_processing'
    PAID = 'paid'
    FULFILLMENT = 'fulfillment'
    SHIPPED = 'shipped'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'
    FAILED = 'failed'

class OrderQueue:
    def __init__(self, prefix='order'):
        self.prefix = prefix
        self.queues = {
            'validation': f"{prefix}:queue:validation",
            'payment': f"{prefix}:queue:payment",
            'fulfillment': f"{prefix}:queue:fulfillment",
            'notification': f"{prefix}:queue:notification"
        }

    def create_order(self, order_data):
        """Create a new order and queue for processing."""
        order_id = str(uuid.uuid4())
        timestamp = int(time.time())

        order = {
            'id': order_id,
            'user_id': order_data['user_id'],
            'items': json.dumps(order_data['items']),
            'total': str(order_data['total']),
            'shipping_address': json.dumps(order_data['shipping_address']),
            'payment_method': json.dumps(order_data['payment_method']),
            'status': OrderStatus.PENDING.value,
            'created_at': timestamp,
            'updated_at': timestamp
        }

        # Store order
        order_key = f"{self.prefix}:{order_id}"
        r.hset(order_key, mapping=order)

        # Add to user's orders
        r.zadd(f"{self.prefix}:user:{order_data['user_id']}", {order_id: timestamp})

        # Queue for validation
        self._enqueue('validation', order_id, priority='normal')

        return order_id

    def _enqueue(self, queue_name, order_id, priority='normal'):
        """Add order to a processing queue."""
        queue_key = self.queues[queue_name]

        # Use sorted set for priority queuing
        # Lower score = higher priority
        priority_scores = {'high': 1, 'normal': 2, 'low': 3}
        base_score = priority_scores.get(priority, 2)
        score = base_score * 1000000000 + time.time()

        r.zadd(queue_key, {order_id: score})

        # Publish event for real-time processing
        r.publish(f"{self.prefix}:events:{queue_name}", json.dumps({
            'event': 'new_order',
            'order_id': order_id
        }))

    def dequeue(self, queue_name, count=1):
        """Get orders from a queue for processing."""
        queue_key = self.queues[queue_name]
        processing_key = f"{queue_key}:processing"

        lua_script = """
        local queue_key = KEYS[1]
        local processing_key = KEYS[2]
        local count = tonumber(ARGV[1])
        local timestamp = ARGV[2]

        local items = redis.call('ZRANGE', queue_key, 0, count - 1)
        if #items == 0 then
            return {}
        end

        -- Move to processing set
        for _, item in ipairs(items) do
            redis.call('ZREM', queue_key, item)
            redis.call('HSET', processing_key, item, timestamp)
        end

        return items
        """

        order_ids = r.eval(
            lua_script, 2,
            queue_key, processing_key,
            count, int(time.time())
        )

        return order_ids

    def complete_processing(self, queue_name, order_id, next_queue=None):
        """Mark order as processed and optionally move to next queue."""
        processing_key = f"{self.queues[queue_name]}:processing"

        r.hdel(processing_key, order_id)

        if next_queue:
            self._enqueue(next_queue, order_id)

    def fail_processing(self, queue_name, order_id, error_message, retry=True):
        """Handle processing failure."""
        processing_key = f"{self.queues[queue_name]}:processing"
        failed_key = f"{self.queues[queue_name]}:failed"

        r.hdel(processing_key, order_id)

        # Track failure
        failure_data = {
            'error': error_message,
            'timestamp': int(time.time()),
            'queue': queue_name
        }
        r.hset(failed_key, order_id, json.dumps(failure_data))

        # Update order status
        self.update_order_status(order_id, OrderStatus.FAILED, error_message)

        # Optionally retry
        if retry:
            retry_key = f"{self.queues[queue_name]}:retry"
            retry_at = time.time() + 300  # Retry in 5 minutes
            r.zadd(retry_key, {order_id: retry_at})

    def update_order_status(self, order_id, status, notes=None):
        """Update order status."""
        order_key = f"{self.prefix}:{order_id}"
        timestamp = int(time.time())

        pipe = r.pipeline()
        pipe.hset(order_key, 'status', status.value)
        pipe.hset(order_key, 'updated_at', timestamp)

        if notes:
            pipe.hset(order_key, 'status_notes', notes)

        # Add to status history
        history_entry = {
            'status': status.value,
            'timestamp': timestamp,
            'notes': notes
        }
        pipe.rpush(f"{order_key}:history", json.dumps(history_entry))

        pipe.execute()

        # Queue notification
        self._enqueue('notification', order_id, priority='high')

    def get_order(self, order_id):
        """Get order details."""
        order_key = f"{self.prefix}:{order_id}"
        order = r.hgetall(order_key)

        if not order:
            return None

        # Parse JSON fields
        order['items'] = json.loads(order.get('items', '[]'))
        order['shipping_address'] = json.loads(order.get('shipping_address', '{}'))
        order['payment_method'] = json.loads(order.get('payment_method', '{}'))

        return order

    def get_queue_stats(self):
        """Get statistics for all queues."""
        stats = {}

        for name, key in self.queues.items():
            stats[name] = {
                'pending': r.zcard(key),
                'processing': r.hlen(f"{key}:processing"),
                'failed': r.hlen(f"{key}:failed"),
                'retry': r.zcard(f"{key}:retry")
            }

        return stats

# Usage
queue = OrderQueue()

# Create order
order_id = queue.create_order({
    'user_id': 'user_123',
    'items': [
        {'product_id': 'prod_001', 'quantity': 2, 'price': '29.99'},
        {'product_id': 'prod_002', 'quantity': 1, 'price': '49.99'}
    ],
    'total': '109.97',
    'shipping_address': {
        'name': 'John Doe',
        'street': '123 Main St',
        'city': 'New York',
        'zip': '10001'
    },
    'payment_method': {'type': 'card', 'last4': '4242'}
})

print(f"Order created: {order_id}")

# Get queue stats
stats = queue.get_queue_stats()
print(f"Queue stats: {stats}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis();

const OrderStatus = {
  PENDING: 'pending',
  VALIDATED: 'validated',
  PAYMENT_PROCESSING: 'payment_processing',
  PAID: 'paid',
  FULFILLMENT: 'fulfillment',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

class OrderQueue {
  constructor(prefix = 'order') {
    this.prefix = prefix;
    this.queues = {
      validation: `${prefix}:queue:validation`,
      payment: `${prefix}:queue:payment`,
      fulfillment: `${prefix}:queue:fulfillment`,
      notification: `${prefix}:queue:notification`
    };
  }

  async createOrder(orderData) {
    const orderId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);

    const order = {
      id: orderId,
      user_id: orderData.userId,
      items: JSON.stringify(orderData.items),
      total: orderData.total.toString(),
      shipping_address: JSON.stringify(orderData.shippingAddress),
      payment_method: JSON.stringify(orderData.paymentMethod),
      status: OrderStatus.PENDING,
      created_at: timestamp,
      updated_at: timestamp
    };

    const pipeline = redis.pipeline();
    pipeline.hset(`${this.prefix}:${orderId}`, order);
    pipeline.zadd(`${this.prefix}:user:${orderData.userId}`, timestamp, orderId);
    await pipeline.exec();

    await this.enqueue('validation', orderId);

    return orderId;
  }

  async enqueue(queueName, orderId, priority = 'normal') {
    const queueKey = this.queues[queueName];
    const priorityScores = { high: 1, normal: 2, low: 3 };
    const baseScore = priorityScores[priority] || 2;
    const score = baseScore * 1000000000 + Date.now() / 1000;

    await redis.zadd(queueKey, score, orderId);

    await redis.publish(
      `${this.prefix}:events:${queueName}`,
      JSON.stringify({ event: 'new_order', order_id: orderId })
    );
  }

  async dequeue(queueName, count = 1) {
    const queueKey = this.queues[queueName];
    const processingKey = `${queueKey}:processing`;

    const luaScript = `
      local queue_key = KEYS[1]
      local processing_key = KEYS[2]
      local count = tonumber(ARGV[1])
      local timestamp = ARGV[2]

      local items = redis.call('ZRANGE', queue_key, 0, count - 1)
      if #items == 0 then
        return {}
      end

      for _, item in ipairs(items) do
        redis.call('ZREM', queue_key, item)
        redis.call('HSET', processing_key, item, timestamp)
      end

      return items
    `;

    return await redis.eval(
      luaScript,
      2,
      queueKey, processingKey,
      count, Math.floor(Date.now() / 1000)
    );
  }

  async completeProcessing(queueName, orderId, nextQueue = null) {
    const processingKey = `${this.queues[queueName]}:processing`;
    await redis.hdel(processingKey, orderId);

    if (nextQueue) {
      await this.enqueue(nextQueue, orderId);
    }
  }

  async updateOrderStatus(orderId, status, notes = null) {
    const orderKey = `${this.prefix}:${orderId}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const pipeline = redis.pipeline();
    pipeline.hset(orderKey, 'status', status);
    pipeline.hset(orderKey, 'updated_at', timestamp);

    if (notes) {
      pipeline.hset(orderKey, 'status_notes', notes);
    }

    pipeline.rpush(
      `${orderKey}:history`,
      JSON.stringify({ status, timestamp, notes })
    );

    await pipeline.exec();
    await this.enqueue('notification', orderId, 'high');
  }

  async getOrder(orderId) {
    const order = await redis.hgetall(`${this.prefix}:${orderId}`);

    if (!order || Object.keys(order).length === 0) {
      return null;
    }

    order.items = JSON.parse(order.items || '[]');
    order.shipping_address = JSON.parse(order.shipping_address || '{}');
    order.payment_method = JSON.parse(order.payment_method || '{}');

    return order;
  }
}

// Usage
async function example() {
  const queue = new OrderQueue();

  const orderId = await queue.createOrder({
    userId: 'user_123',
    items: [
      { product_id: 'prod_001', quantity: 2, price: '29.99' }
    ],
    total: '59.98',
    shippingAddress: { name: 'John Doe', street: '123 Main St' },
    paymentMethod: { type: 'card', last4: '4242' }
  });

  console.log('Order created:', orderId);
}

example().catch(console.error);
```

## Order Processing Workers

### Validation Worker

```python
class ValidationWorker:
    def __init__(self, queue):
        self.queue = queue
        self.running = False

    def start(self):
        """Start processing validation queue."""
        self.running = True

        while self.running:
            order_ids = self.queue.dequeue('validation', count=10)

            for order_id in order_ids:
                try:
                    self.process_order(order_id)
                except Exception as e:
                    self.queue.fail_processing('validation', order_id, str(e))

            if not order_ids:
                time.sleep(1)  # No orders, wait a bit

    def process_order(self, order_id):
        """Validate an order."""
        order = self.queue.get_order(order_id)

        # Validate inventory
        inventory_ok = self._check_inventory(order['items'])
        if not inventory_ok:
            self.queue.fail_processing(
                'validation', order_id,
                'Insufficient inventory', retry=False
            )
            return

        # Validate shipping address
        address_ok = self._validate_address(order['shipping_address'])
        if not address_ok:
            self.queue.fail_processing(
                'validation', order_id,
                'Invalid shipping address', retry=False
            )
            return

        # Run fraud check
        fraud_ok = self._fraud_check(order)
        if not fraud_ok:
            self.queue.fail_processing(
                'validation', order_id,
                'Failed fraud check', retry=False
            )
            return

        # Validation passed
        self.queue.update_order_status(order_id, OrderStatus.VALIDATED)
        self.queue.complete_processing('validation', order_id, next_queue='payment')

    def _check_inventory(self, items):
        """Check inventory for all items."""
        # Implementation depends on inventory system
        return True

    def _validate_address(self, address):
        """Validate shipping address."""
        # Implementation depends on address validation service
        return True

    def _fraud_check(self, order):
        """Run fraud detection."""
        # Implementation depends on fraud detection system
        return True

    def stop(self):
        """Stop the worker."""
        self.running = False

# Payment Worker
class PaymentWorker:
    def __init__(self, queue):
        self.queue = queue
        self.running = False

    def start(self):
        self.running = True

        while self.running:
            order_ids = self.queue.dequeue('payment', count=5)

            for order_id in order_ids:
                try:
                    self.process_payment(order_id)
                except Exception as e:
                    self.queue.fail_processing('payment', order_id, str(e))

            if not order_ids:
                time.sleep(1)

    def process_payment(self, order_id):
        """Process payment for an order."""
        order = self.queue.get_order(order_id)

        self.queue.update_order_status(order_id, OrderStatus.PAYMENT_PROCESSING)

        # Charge payment method
        payment_result = self._charge_payment(
            order['payment_method'],
            Decimal(order['total'])
        )

        if payment_result['success']:
            # Store payment info
            r.hset(f"order:{order_id}", 'payment_id', payment_result['transaction_id'])

            self.queue.update_order_status(order_id, OrderStatus.PAID)
            self.queue.complete_processing('payment', order_id, next_queue='fulfillment')
        else:
            self.queue.fail_processing(
                'payment', order_id,
                f"Payment failed: {payment_result['error']}"
            )

    def _charge_payment(self, payment_method, amount):
        """Charge the payment method."""
        # Integration with payment processor (Stripe, etc.)
        return {'success': True, 'transaction_id': f"txn_{uuid.uuid4().hex[:8]}"}

# Fulfillment Worker
class FulfillmentWorker:
    def __init__(self, queue):
        self.queue = queue
        self.running = False

    def start(self):
        self.running = True

        while self.running:
            order_ids = self.queue.dequeue('fulfillment', count=10)

            for order_id in order_ids:
                try:
                    self.process_fulfillment(order_id)
                except Exception as e:
                    self.queue.fail_processing('fulfillment', order_id, str(e))

            if not order_ids:
                time.sleep(1)

    def process_fulfillment(self, order_id):
        """Process order fulfillment."""
        order = self.queue.get_order(order_id)

        self.queue.update_order_status(order_id, OrderStatus.FULFILLMENT)

        # Reserve inventory
        self._reserve_inventory(order['items'])

        # Create shipping label
        shipping_info = self._create_shipping_label(
            order['shipping_address'],
            order['items']
        )

        # Store tracking info
        r.hset(f"order:{order_id}", mapping={
            'tracking_number': shipping_info['tracking_number'],
            'carrier': shipping_info['carrier']
        })

        self.queue.update_order_status(order_id, OrderStatus.SHIPPED)
        self.queue.complete_processing('fulfillment', order_id)

    def _reserve_inventory(self, items):
        """Reserve inventory for items."""
        pass

    def _create_shipping_label(self, address, items):
        """Create shipping label."""
        return {
            'tracking_number': f"TRACK{uuid.uuid4().hex[:10].upper()}",
            'carrier': 'USPS'
        }
```

## Order Status Tracking with Pub/Sub

```python
class OrderStatusTracker:
    def __init__(self, prefix='order'):
        self.prefix = prefix
        self.pubsub = r.pubsub()

    def track_order(self, order_id, callback):
        """Subscribe to order status updates."""
        channel = f"{self.prefix}:status:{order_id}"
        self.pubsub.subscribe(**{channel: callback})

        # Start listening in background
        thread = self.pubsub.run_in_thread(sleep_time=0.001)
        return thread

    def publish_status_update(self, order_id, status, details=None):
        """Publish a status update."""
        channel = f"{self.prefix}:status:{order_id}"
        message = {
            'order_id': order_id,
            'status': status.value if isinstance(status, OrderStatus) else status,
            'details': details,
            'timestamp': int(time.time())
        }
        r.publish(channel, json.dumps(message))

    def get_order_history(self, order_id):
        """Get complete order history."""
        history_key = f"{self.prefix}:{order_id}:history"
        history = r.lrange(history_key, 0, -1)

        return [json.loads(entry) for entry in history]

# WebSocket integration example
class OrderStatusWebSocket:
    def __init__(self):
        self.tracker = OrderStatusTracker()
        self.connections = {}

    async def handle_connection(self, websocket, order_id):
        """Handle WebSocket connection for order tracking."""
        # Send current status
        order = queue.get_order(order_id)
        if order:
            await websocket.send(json.dumps({
                'type': 'current_status',
                'status': order['status']
            }))

        # Subscribe to updates
        channel = f"order:status:{order_id}"

        pubsub = r.pubsub()
        pubsub.subscribe(channel)

        try:
            for message in pubsub.listen():
                if message['type'] == 'message':
                    await websocket.send(message['data'])
        finally:
            pubsub.unsubscribe(channel)
```

## Retry and Dead Letter Queue

```python
class RetryManager:
    def __init__(self, queue, max_retries=3):
        self.queue = queue
        self.max_retries = max_retries

    def process_retries(self):
        """Process orders due for retry."""
        for queue_name in self.queue.queues.keys():
            self._process_queue_retries(queue_name)

    def _process_queue_retries(self, queue_name):
        """Process retries for a specific queue."""
        retry_key = f"{self.queue.queues[queue_name]}:retry"
        now = time.time()

        # Get orders due for retry
        due_orders = r.zrangebyscore(retry_key, '-inf', now)

        for order_id in due_orders:
            retry_count = self._get_retry_count(order_id, queue_name)

            if retry_count >= self.max_retries:
                # Move to dead letter queue
                self._move_to_dlq(order_id, queue_name)
            else:
                # Increment retry count and requeue
                self._increment_retry_count(order_id, queue_name)
                r.zrem(retry_key, order_id)
                self.queue._enqueue(queue_name, order_id, priority='low')

    def _get_retry_count(self, order_id, queue_name):
        """Get retry count for an order."""
        key = f"order:{order_id}:retries:{queue_name}"
        count = r.get(key)
        return int(count) if count else 0

    def _increment_retry_count(self, order_id, queue_name):
        """Increment retry count."""
        key = f"order:{order_id}:retries:{queue_name}"
        r.incr(key)
        r.expire(key, 86400)  # Keep for 1 day

    def _move_to_dlq(self, order_id, queue_name):
        """Move order to dead letter queue."""
        dlq_key = f"order:dlq:{queue_name}"

        dlq_entry = {
            'order_id': order_id,
            'original_queue': queue_name,
            'moved_at': int(time.time()),
            'retry_count': self._get_retry_count(order_id, queue_name)
        }

        r.hset(dlq_key, order_id, json.dumps(dlq_entry))

        # Update order status
        self.queue.update_order_status(
            order_id,
            OrderStatus.FAILED,
            'Max retries exceeded'
        )

    def get_dlq_orders(self, queue_name=None):
        """Get orders in dead letter queue."""
        if queue_name:
            dlq_key = f"order:dlq:{queue_name}"
            orders = r.hgetall(dlq_key)
            return {k: json.loads(v) for k, v in orders.items()}
        else:
            all_orders = {}
            for qn in self.queue.queues.keys():
                orders = self.get_dlq_orders(qn)
                all_orders[qn] = orders
            return all_orders

    def reprocess_dlq_order(self, order_id, queue_name):
        """Manually reprocess an order from DLQ."""
        dlq_key = f"order:dlq:{queue_name}"

        # Remove from DLQ
        r.hdel(dlq_key, order_id)

        # Reset retry count
        r.delete(f"order:{order_id}:retries:{queue_name}")

        # Requeue
        self.queue._enqueue(queue_name, order_id, priority='high')
```

## Best Practices

### 1. Idempotent Processing

```python
def process_payment_idempotent(order_id):
    """Ensure payment is only processed once."""
    lock_key = f"payment_lock:{order_id}"

    # Try to acquire lock
    acquired = r.set(lock_key, '1', nx=True, ex=300)

    if not acquired:
        # Already processing or processed
        return

    try:
        # Check if already paid
        order = queue.get_order(order_id)
        if order['status'] == OrderStatus.PAID.value:
            return

        # Process payment...
    finally:
        r.delete(lock_key)
```

### 2. Monitor Queue Health

```python
def monitor_queue_health():
    """Monitor queue health metrics."""
    stats = queue.get_queue_stats()

    for name, metrics in stats.items():
        # Alert if too many pending
        if metrics['pending'] > 1000:
            alert(f"High pending count in {name}: {metrics['pending']}")

        # Alert if too many failed
        if metrics['failed'] > 100:
            alert(f"High failure count in {name}: {metrics['failed']}")

        # Alert if processing stuck
        processing_key = f"order:queue:{name}:processing"
        stuck_orders = check_stuck_orders(processing_key, threshold_minutes=30)
        if stuck_orders:
            alert(f"Stuck orders in {name}: {len(stuck_orders)}")
```

### 3. Graceful Shutdown

```python
def graceful_shutdown(workers):
    """Gracefully shutdown workers."""
    for worker in workers:
        worker.stop()

    # Wait for in-progress to complete
    time.sleep(30)

    # Return unfinished to queue
    for queue_name in queue.queues.keys():
        processing_key = f"{queue.queues[queue_name]}:processing"
        orders = r.hgetall(processing_key)

        for order_id in orders.keys():
            queue._enqueue(queue_name, order_id, priority='high')
            r.hdel(processing_key, order_id)
```

## Conclusion

Implementing order queue processing with Redis provides reliable, scalable order fulfillment. Key takeaways:

- Use sorted sets for priority-based queuing
- Implement separate queues for each processing stage
- Track processing state to handle failures
- Use pub/sub for real-time status updates
- Implement retry logic with exponential backoff
- Maintain dead letter queues for failed orders
- Ensure idempotent processing for reliability

Redis's queuing capabilities and atomic operations make it ideal for order processing systems that need to handle high volumes while maintaining data integrity.

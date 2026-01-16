# How to Set Up Redis Pub/Sub on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Redis, Pub/Sub, Messaging, Real-time, Tutorial

Description: Complete guide to using Redis publish/subscribe messaging on Ubuntu.

---

Redis Pub/Sub (Publish/Subscribe) is a powerful messaging paradigm that enables real-time communication between applications. This guide walks you through setting up and using Redis Pub/Sub on Ubuntu, from basic concepts to advanced patterns and best practices.

## Understanding Redis Pub/Sub

Redis Pub/Sub implements the publish-subscribe messaging pattern where:

- **Publishers** send messages to channels without knowing who will receive them
- **Subscribers** listen to channels without knowing who sends the messages
- **Channels** act as intermediaries that route messages from publishers to subscribers

This decoupled architecture provides several benefits:

1. **Loose coupling**: Publishers and subscribers operate independently
2. **Scalability**: Multiple subscribers can receive the same message simultaneously
3. **Real-time delivery**: Messages are delivered instantly to all connected subscribers
4. **Simplicity**: No complex message broker configuration required

### How Redis Pub/Sub Works

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│  Publisher   │ ──────► │   Channel   │ ──────► │  Subscriber  │
│  (Client A)  │         │  "news"     │         │  (Client B)  │
└──────────────┘         └─────────────┘         └──────────────┘
                                │
                                │
                                ▼
                         ┌──────────────┐
                         │  Subscriber  │
                         │  (Client C)  │
                         └──────────────┘
```

When a publisher sends a message to a channel, Redis immediately delivers it to all subscribers listening on that channel. If no subscribers are listening, the message is simply discarded.

## Installing Redis on Ubuntu

### Step 1: Update System Packages

```bash
# Update the package index to ensure we get the latest versions
sudo apt update

# Upgrade existing packages (optional but recommended)
sudo apt upgrade -y
```

### Step 2: Install Redis Server

```bash
# Install Redis server and CLI tools
sudo apt install redis-server -y

# Verify the installation
redis-server --version
# Output: Redis server v=7.x.x sha=00000000:0 malloc=jemalloc-5.x bits=64 build=...
```

### Step 3: Configure Redis

Edit the Redis configuration file to enable it as a systemd service:

```bash
# Open the Redis configuration file
sudo nano /etc/redis/redis.conf
```

Make the following changes:

```conf
# Change supervised from 'no' to 'systemd' for proper service management
supervised systemd

# Bind to localhost only for security (default)
bind 127.0.0.1 ::1

# Set a password for production environments (recommended)
requirepass your_secure_password_here

# Configure memory limit (optional, adjust based on your needs)
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Step 4: Start and Enable Redis

```bash
# Restart Redis to apply configuration changes
sudo systemctl restart redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Check Redis status
sudo systemctl status redis-server
```

### Step 5: Verify Installation

```bash
# Test Redis connection using the CLI
redis-cli ping
# Output: PONG

# If you set a password, authenticate first
redis-cli
127.0.0.1:6379> AUTH your_secure_password_here
# Output: OK
127.0.0.1:6379> PING
# Output: PONG
```

## Basic PUBLISH and SUBSCRIBE

Redis Pub/Sub uses two primary commands: `SUBSCRIBE` and `PUBLISH`.

### Subscribing to a Channel

Open a terminal and start a subscriber:

```bash
# Connect to Redis CLI
redis-cli

# Subscribe to a channel named "notifications"
127.0.0.1:6379> SUBSCRIBE notifications
# Output:
# Reading messages... (press Ctrl-C to quit)
# 1) "subscribe"
# 2) "notifications"
# 3) (integer) 1
```

The subscriber is now waiting for messages. The output shows:
1. The type of message ("subscribe" confirmation)
2. The channel name
3. The number of channels currently subscribed to

### Publishing a Message

Open another terminal and publish a message:

```bash
# Connect to Redis CLI
redis-cli

# Publish a message to the "notifications" channel
127.0.0.1:6379> PUBLISH notifications "Hello, Redis Pub/Sub!"
# Output: (integer) 1
```

The return value indicates how many subscribers received the message.

### What the Subscriber Sees

Back in the subscriber terminal, you'll see:

```
1) "message"
2) "notifications"
3) "Hello, Redis Pub/Sub!"
```

This shows:
1. Message type ("message")
2. Channel name
3. The actual message content

### Subscribing to Multiple Channels

```bash
# Subscribe to multiple channels at once
127.0.0.1:6379> SUBSCRIBE news alerts updates
# Reading messages... (press Ctrl-C to quit)
# 1) "subscribe"
# 2) "news"
# 3) (integer) 1
# 1) "subscribe"
# 2) "alerts"
# 3) (integer) 2
# 1) "subscribe"
# 4) "updates"
# 3) (integer) 3
```

### Unsubscribing from Channels

```bash
# Unsubscribe from specific channels
127.0.0.1:6379> UNSUBSCRIBE news alerts

# Unsubscribe from all channels
127.0.0.1:6379> UNSUBSCRIBE
```

## Pattern Subscriptions (PSUBSCRIBE)

Pattern subscriptions allow you to subscribe to multiple channels using glob-style patterns, providing flexibility for dynamic channel naming.

### Pattern Matching Syntax

- `*` matches any sequence of characters
- `?` matches exactly one character
- `[abc]` matches any character in the brackets

### Using PSUBSCRIBE

```bash
# Subscribe to all channels starting with "user:"
127.0.0.1:6379> PSUBSCRIBE user:*

# This will match:
# - user:123
# - user:login
# - user:profile:update
# - user:notifications:email
```

### Publishing to Pattern-Matched Channels

```bash
# These messages will be received by the pattern subscriber above
127.0.0.1:6379> PUBLISH user:123 "User 123 logged in"
127.0.0.1:6379> PUBLISH user:login "New login event"
127.0.0.1:6379> PUBLISH user:profile:update "Profile updated"
```

### Pattern Subscription Output

When receiving messages from pattern subscriptions, you get additional information:

```
1) "pmessage"           # Message type for pattern subscriptions
2) "user:*"             # The pattern that matched
3) "user:123"           # The actual channel name
4) "User 123 logged in" # The message content
```

### Multiple Pattern Subscriptions

```bash
# Subscribe to multiple patterns
127.0.0.1:6379> PSUBSCRIBE news:* alerts:* system:*

# More specific patterns
127.0.0.1:6379> PSUBSCRIBE user:???? # Matches user:1234, user:abcd, etc.
127.0.0.1:6379> PSUBSCRIBE log:[ewi]* # Matches log:error, log:warning, log:info
```

### Unsubscribing from Patterns

```bash
# Unsubscribe from specific patterns
127.0.0.1:6379> PUNSUBSCRIBE user:*

# Unsubscribe from all patterns
127.0.0.1:6379> PUNSUBSCRIBE
```

## Client Examples

### Python Example

First, install the Redis Python client:

```bash
# Install redis-py library
pip install redis
```

#### Basic Publisher (Python)

```python
#!/usr/bin/env python3
"""
Redis Pub/Sub Publisher Example
Demonstrates publishing messages to Redis channels
"""

import redis
import json
import time
from datetime import datetime


def create_redis_connection():
    """
    Create and return a Redis connection.
    Handles connection errors gracefully.
    """
    try:
        # Create Redis client with connection parameters
        client = redis.Redis(
            host='localhost',      # Redis server hostname
            port=6379,             # Default Redis port
            password=None,         # Set password if configured
            decode_responses=True  # Return strings instead of bytes
        )

        # Test the connection
        client.ping()
        print("Successfully connected to Redis")
        return client

    except redis.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        raise


def publish_message(client, channel, message):
    """
    Publish a message to a Redis channel.

    Args:
        client: Redis client instance
        channel: Channel name to publish to
        message: Message content (will be JSON serialized if dict)

    Returns:
        Number of subscribers that received the message
    """
    # Serialize complex objects to JSON
    if isinstance(message, dict):
        message = json.dumps(message)

    # Publish the message and get subscriber count
    subscriber_count = client.publish(channel, message)

    print(f"Published to '{channel}': {message}")
    print(f"Received by {subscriber_count} subscriber(s)")

    return subscriber_count


def main():
    """
    Main function demonstrating various publishing scenarios.
    """
    # Establish Redis connection
    redis_client = create_redis_connection()

    # Example 1: Simple string message
    publish_message(
        redis_client,
        'notifications',
        'Server maintenance scheduled for midnight'
    )

    # Example 2: JSON structured message
    event_data = {
        'event_type': 'user_signup',
        'user_id': 12345,
        'email': 'newuser@example.com',
        'timestamp': datetime.now().isoformat()
    }
    publish_message(redis_client, 'events:users', event_data)

    # Example 3: Publishing to multiple channels
    channels = ['alerts:critical', 'alerts:email', 'alerts:slack']
    alert_message = {
        'severity': 'critical',
        'message': 'Database connection pool exhausted',
        'service': 'api-server',
        'timestamp': datetime.now().isoformat()
    }

    for channel in channels:
        publish_message(redis_client, channel, alert_message)
        time.sleep(0.1)  # Small delay between publishes

    # Example 4: Continuous publishing (simulating real-time data)
    print("\nStarting continuous publishing (Ctrl+C to stop)...")
    try:
        counter = 0
        while True:
            counter += 1
            metric_data = {
                'metric': 'cpu_usage',
                'value': 45.2 + (counter % 10),
                'unit': 'percent',
                'host': 'server-01',
                'timestamp': datetime.now().isoformat()
            }
            publish_message(redis_client, 'metrics:system', metric_data)
            time.sleep(2)  # Publish every 2 seconds

    except KeyboardInterrupt:
        print("\nPublishing stopped")


if __name__ == '__main__':
    main()
```

#### Basic Subscriber (Python)

```python
#!/usr/bin/env python3
"""
Redis Pub/Sub Subscriber Example
Demonstrates subscribing to Redis channels and handling messages
"""

import redis
import json
import signal
import sys


class RedisSubscriber:
    """
    A robust Redis Pub/Sub subscriber with message handling capabilities.
    """

    def __init__(self, host='localhost', port=6379, password=None):
        """
        Initialize the subscriber with Redis connection parameters.

        Args:
            host: Redis server hostname
            port: Redis server port
            password: Optional authentication password
        """
        self.host = host
        self.port = port
        self.password = password
        self.client = None
        self.pubsub = None
        self.running = False

        # Set up graceful shutdown handler
        signal.signal(signal.SIGINT, self._shutdown_handler)
        signal.signal(signal.SIGTERM, self._shutdown_handler)

    def connect(self):
        """
        Establish connection to Redis server.
        """
        try:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                password=self.password,
                decode_responses=True
            )

            # Verify connection
            self.client.ping()

            # Create pubsub object for subscriptions
            self.pubsub = self.client.pubsub()

            print(f"Connected to Redis at {self.host}:{self.port}")

        except redis.ConnectionError as e:
            print(f"Connection failed: {e}")
            sys.exit(1)

    def _shutdown_handler(self, signum, frame):
        """
        Handle graceful shutdown on SIGINT/SIGTERM.
        """
        print("\nShutting down subscriber...")
        self.running = False

        if self.pubsub:
            self.pubsub.close()

        if self.client:
            self.client.close()

        sys.exit(0)

    def message_handler(self, message):
        """
        Process incoming messages from subscribed channels.
        Override this method for custom message handling.

        Args:
            message: Dictionary containing message data
        """
        # Extract message components
        msg_type = message.get('type')
        channel = message.get('channel')
        pattern = message.get('pattern')  # For pattern subscriptions
        data = message.get('data')

        # Skip subscription confirmation messages
        if msg_type in ('subscribe', 'psubscribe'):
            print(f"Subscribed to: {channel or pattern}")
            return

        if msg_type in ('unsubscribe', 'punsubscribe'):
            print(f"Unsubscribed from: {channel or pattern}")
            return

        # Process actual messages
        if msg_type in ('message', 'pmessage'):
            print(f"\n{'='*50}")
            print(f"Channel: {channel}")

            if pattern:
                print(f"Matched Pattern: {pattern}")

            # Try to parse JSON data
            try:
                parsed_data = json.loads(data)
                print(f"Data (JSON): {json.dumps(parsed_data, indent=2)}")
            except (json.JSONDecodeError, TypeError):
                print(f"Data (String): {data}")

            print(f"{'='*50}")

    def subscribe(self, *channels):
        """
        Subscribe to one or more channels.

        Args:
            *channels: Channel names to subscribe to
        """
        if not self.pubsub:
            raise RuntimeError("Not connected. Call connect() first.")

        # Subscribe to channels with message handler
        self.pubsub.subscribe(**{ch: self.message_handler for ch in channels})
        print(f"Subscribing to channels: {', '.join(channels)}")

    def psubscribe(self, *patterns):
        """
        Subscribe to channels matching patterns.

        Args:
            *patterns: Glob-style patterns to match channels
        """
        if not self.pubsub:
            raise RuntimeError("Not connected. Call connect() first.")

        # Subscribe to patterns with message handler
        self.pubsub.psubscribe(**{p: self.message_handler for p in patterns})
        print(f"Subscribing to patterns: {', '.join(patterns)}")

    def listen(self):
        """
        Start listening for messages.
        Blocks until shutdown signal received.
        """
        self.running = True
        print("\nListening for messages (Ctrl+C to quit)...\n")

        # Use get_message() for non-blocking message retrieval
        while self.running:
            try:
                # get_message() returns None if no message available
                message = self.pubsub.get_message(
                    ignore_subscribe_messages=False,
                    timeout=1.0  # Check for messages every second
                )

                if message:
                    self.message_handler(message)

            except redis.ConnectionError:
                print("Lost connection to Redis. Attempting to reconnect...")
                self.connect()


def main():
    """
    Main function demonstrating subscriber usage.
    """
    # Create subscriber instance
    subscriber = RedisSubscriber(
        host='localhost',
        port=6379,
        password=None  # Set password if configured
    )

    # Connect to Redis
    subscriber.connect()

    # Subscribe to specific channels
    subscriber.subscribe('notifications', 'events:users')

    # Subscribe to patterns (receive messages from any alerts:* channel)
    subscriber.psubscribe('alerts:*', 'metrics:*')

    # Start listening (blocks until Ctrl+C)
    subscriber.listen()


if __name__ == '__main__':
    main()
```

### Node.js Example

First, install the Redis Node.js client:

```bash
# Using npm
npm install redis

# Or using yarn
yarn add redis
```

#### Publisher (Node.js)

```javascript
/**
 * Redis Pub/Sub Publisher Example (Node.js)
 * Demonstrates publishing messages to Redis channels
 */

import { createClient } from 'redis';

/**
 * Create and configure Redis client
 * @returns {Promise<RedisClient>} Connected Redis client
 */
async function createRedisClient() {
    // Create client with configuration options
    const client = createClient({
        socket: {
            host: 'localhost',
            port: 6379,
            // Reconnection settings
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    console.error('Max reconnection attempts reached');
                    return new Error('Max reconnection attempts reached');
                }
                // Exponential backoff: wait longer between retries
                return Math.min(retries * 100, 3000);
            }
        },
        // password: 'your_password_here', // Uncomment if auth required
    });

    // Set up event handlers
    client.on('error', (err) => console.error('Redis Client Error:', err));
    client.on('connect', () => console.log('Connecting to Redis...'));
    client.on('ready', () => console.log('Redis client ready'));
    client.on('reconnecting', () => console.log('Reconnecting to Redis...'));

    // Connect to Redis
    await client.connect();

    return client;
}

/**
 * Publish a message to a Redis channel
 * @param {RedisClient} client - Redis client instance
 * @param {string} channel - Channel name
 * @param {string|object} message - Message to publish
 * @returns {Promise<number>} Number of subscribers that received the message
 */
async function publishMessage(client, channel, message) {
    // Serialize objects to JSON
    const messageStr = typeof message === 'object'
        ? JSON.stringify(message)
        : message;

    try {
        // Publish and get subscriber count
        const subscriberCount = await client.publish(channel, messageStr);

        console.log(`Published to '${channel}': ${messageStr}`);
        console.log(`Received by ${subscriberCount} subscriber(s)`);

        return subscriberCount;
    } catch (error) {
        console.error(`Failed to publish to ${channel}:`, error);
        throw error;
    }
}

/**
 * Main function demonstrating publisher functionality
 */
async function main() {
    let client;

    try {
        // Create Redis connection
        client = await createRedisClient();

        // Example 1: Simple string message
        await publishMessage(
            client,
            'notifications',
            'System update completed successfully'
        );

        // Example 2: Structured JSON message
        const userEvent = {
            eventType: 'user_action',
            userId: 'user_123',
            action: 'purchase',
            amount: 99.99,
            currency: 'USD',
            timestamp: new Date().toISOString()
        };
        await publishMessage(client, 'events:commerce', userEvent);

        // Example 3: Publishing to multiple channels
        const alertChannels = ['alerts:email', 'alerts:slack', 'alerts:pagerduty'];
        const criticalAlert = {
            severity: 'critical',
            service: 'payment-gateway',
            message: 'Payment processing timeout detected',
            errorCode: 'PAY_TIMEOUT_001',
            timestamp: new Date().toISOString()
        };

        // Publish to all alert channels concurrently
        await Promise.all(
            alertChannels.map(channel =>
                publishMessage(client, channel, criticalAlert)
            )
        );

        // Example 4: Continuous metrics publishing
        console.log('\nStarting continuous metrics publishing...');
        console.log('Press Ctrl+C to stop\n');

        let counter = 0;
        const publishInterval = setInterval(async () => {
            counter++;
            const metrics = {
                metric: 'request_latency',
                value: Math.random() * 100 + 50, // Random value between 50-150
                unit: 'ms',
                endpoint: '/api/users',
                timestamp: new Date().toISOString()
            };

            await publishMessage(client, 'metrics:api', metrics);
        }, 2000); // Publish every 2 seconds

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down publisher...');
            clearInterval(publishInterval);
            await client.quit();
            process.exit(0);
        });

    } catch (error) {
        console.error('Publisher error:', error);
        if (client) {
            await client.quit();
        }
        process.exit(1);
    }
}

// Run the main function
main();
```

#### Subscriber (Node.js)

```javascript
/**
 * Redis Pub/Sub Subscriber Example (Node.js)
 * Demonstrates subscribing to Redis channels and handling messages
 */

import { createClient } from 'redis';

/**
 * Message handler function
 * Processes incoming messages from subscribed channels
 * @param {string} message - The message content
 * @param {string} channel - The channel the message was received on
 */
function handleMessage(message, channel) {
    console.log('\n' + '='.repeat(50));
    console.log(`Channel: ${channel}`);

    // Attempt to parse JSON messages
    try {
        const parsed = JSON.parse(message);
        console.log('Data (JSON):');
        console.log(JSON.stringify(parsed, null, 2));
    } catch {
        // Not JSON, display as string
        console.log(`Data (String): ${message}`);
    }

    console.log('='.repeat(50));
}

/**
 * Pattern message handler
 * Handles messages from pattern subscriptions with additional metadata
 * @param {string} message - The message content
 * @param {string} channel - The actual channel name
 * @param {string} pattern - The pattern that matched
 */
function handlePatternMessage(message, channel, pattern) {
    console.log('\n' + '='.repeat(50));
    console.log(`Pattern: ${pattern}`);
    console.log(`Channel: ${channel}`);

    try {
        const parsed = JSON.parse(message);
        console.log('Data (JSON):');
        console.log(JSON.stringify(parsed, null, 2));
    } catch {
        console.log(`Data (String): ${message}`);
    }

    console.log('='.repeat(50));
}

/**
 * Create subscriber client
 * Note: In Redis v4+, subscribers need a dedicated connection
 * @returns {Promise<RedisClient>} Connected Redis subscriber client
 */
async function createSubscriber() {
    const subscriber = createClient({
        socket: {
            host: 'localhost',
            port: 6379,
            reconnectStrategy: (retries) => {
                console.log(`Reconnection attempt ${retries}`);
                return Math.min(retries * 100, 3000);
            }
        },
        // password: 'your_password_here', // Uncomment if auth required
    });

    // Event handlers for connection state
    subscriber.on('error', (err) => {
        console.error('Redis Subscriber Error:', err);
    });

    subscriber.on('connect', () => {
        console.log('Subscriber connecting to Redis...');
    });

    subscriber.on('ready', () => {
        console.log('Subscriber ready and connected');
    });

    await subscriber.connect();

    return subscriber;
}

/**
 * Main function demonstrating subscriber functionality
 */
async function main() {
    let subscriber;

    try {
        // Create subscriber connection
        subscriber = await createSubscriber();

        console.log('\nSetting up subscriptions...\n');

        // Subscribe to specific channels
        // Each subscribe() call sets up a listener for that channel
        await subscriber.subscribe('notifications', (message, channel) => {
            handleMessage(message, channel);
        });
        console.log('Subscribed to: notifications');

        await subscriber.subscribe('events:commerce', (message, channel) => {
            handleMessage(message, channel);
        });
        console.log('Subscribed to: events:commerce');

        // Pattern subscriptions for dynamic channels
        // pSubscribe matches channels using glob patterns
        await subscriber.pSubscribe('alerts:*', (message, channel, pattern) => {
            handlePatternMessage(message, channel, pattern);
        });
        console.log('Subscribed to pattern: alerts:*');

        await subscriber.pSubscribe('metrics:*', (message, channel, pattern) => {
            handlePatternMessage(message, channel, pattern);
        });
        console.log('Subscribed to pattern: metrics:*');

        console.log('\nListening for messages (Ctrl+C to quit)...\n');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down subscriber...');

            // Unsubscribe from all channels and patterns
            await subscriber.unsubscribe();
            await subscriber.pUnsubscribe();

            // Close connection
            await subscriber.quit();

            console.log('Subscriber disconnected');
            process.exit(0);
        });

    } catch (error) {
        console.error('Subscriber error:', error);
        if (subscriber) {
            await subscriber.quit();
        }
        process.exit(1);
    }
}

// Run the main function
main();
```

## Redis Streams as Alternative

While Redis Pub/Sub is excellent for real-time fire-and-forget messaging, Redis Streams offers additional features that may be more suitable for certain use cases.

### Key Differences

| Feature | Pub/Sub | Streams |
|---------|---------|---------|
| Message Persistence | No | Yes |
| Message Replay | No | Yes |
| Consumer Groups | No | Yes |
| Message Acknowledgment | No | Yes |
| Delivery Guarantee | At-most-once | At-least-once |
| Historical Data Access | No | Yes |

### When to Use Streams Instead

Consider Redis Streams when you need:

1. **Message persistence**: Messages survive Redis restarts
2. **Consumer groups**: Multiple consumers processing different messages
3. **Message acknowledgment**: Guaranteed processing with retry capability
4. **Message history**: Ability to replay or query past messages

### Basic Streams Example

```bash
# Add entries to a stream
127.0.0.1:6379> XADD mystream * sensor_id 1234 temperature 25.5
"1673456789012-0"

127.0.0.1:6379> XADD mystream * sensor_id 1234 temperature 26.1
"1673456789013-0"

# Read entries from a stream
127.0.0.1:6379> XRANGE mystream - +
1) 1) "1673456789012-0"
   2) 1) "sensor_id"
      2) "1234"
      3) "temperature"
      4) "25.5"
2) 1) "1673456789013-0"
   2) 1) "sensor_id"
      2) "1234"
      3) "temperature"
      4) "26.1"

# Create a consumer group
127.0.0.1:6379> XGROUP CREATE mystream mygroup $ MKSTREAM

# Read as a consumer in the group
127.0.0.1:6379> XREADGROUP GROUP mygroup consumer1 COUNT 1 STREAMS mystream >
```

### Python Streams Example

```python
#!/usr/bin/env python3
"""
Redis Streams Example
Demonstrates using Redis Streams for persistent messaging
"""

import redis
import json
from datetime import datetime


def streams_producer():
    """
    Produce messages to a Redis Stream.
    """
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Add entry to stream
    # XADD returns the entry ID (timestamp-sequence)
    entry_id = client.xadd(
        'events_stream',  # Stream name
        {
            'event_type': 'order_created',
            'order_id': '12345',
            'customer_id': 'cust_789',
            'amount': '99.99',
            'timestamp': datetime.now().isoformat()
        },
        maxlen=10000  # Optional: limit stream length
    )

    print(f"Added entry with ID: {entry_id}")


def streams_consumer():
    """
    Consume messages from a Redis Stream using consumer groups.
    """
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)

    stream_name = 'events_stream'
    group_name = 'order_processors'
    consumer_name = 'processor_1'

    # Create consumer group (ignore error if already exists)
    try:
        client.xgroup_create(
            stream_name,
            group_name,
            id='0',  # Start from beginning of stream
            mkstream=True  # Create stream if doesn't exist
        )
    except redis.ResponseError as e:
        if 'BUSYGROUP' not in str(e):
            raise

    print(f"Consumer {consumer_name} listening on {stream_name}...")

    while True:
        # Read new messages for this consumer
        messages = client.xreadgroup(
            group_name,
            consumer_name,
            {stream_name: '>'},  # '>' means only new messages
            count=10,
            block=5000  # Block for 5 seconds if no messages
        )

        if messages:
            for stream, entries in messages:
                for entry_id, data in entries:
                    print(f"\nProcessing entry {entry_id}:")
                    print(json.dumps(data, indent=2))

                    # Acknowledge the message after processing
                    client.xack(stream_name, group_name, entry_id)
                    print(f"Acknowledged: {entry_id}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'consume':
        streams_consumer()
    else:
        streams_producer()
```

## Message Persistence Considerations

One of the most important aspects to understand about Redis Pub/Sub is its lack of message persistence.

### No Built-in Persistence

Redis Pub/Sub operates on a fire-and-forget model:

1. **Messages are not stored**: Once published, messages are immediately delivered and discarded
2. **Offline subscribers miss messages**: If a subscriber disconnects, it won't receive messages sent during the downtime
3. **No delivery confirmation**: Publishers don't know if messages were actually processed

### Implementing Persistence Patterns

#### Pattern 1: Hybrid Pub/Sub + Storage

```python
#!/usr/bin/env python3
"""
Hybrid Pub/Sub with persistence pattern
Combines real-time delivery with message storage for reliability
"""

import redis
import json
import uuid
from datetime import datetime


class PersistentPublisher:
    """
    Publisher that stores messages before broadcasting.
    Ensures messages can be retrieved if subscribers miss them.
    """

    def __init__(self, redis_client):
        self.client = redis_client
        self.message_ttl = 86400  # 24 hours in seconds

    def publish(self, channel, message, persist=True):
        """
        Publish message with optional persistence.

        Args:
            channel: Channel to publish to
            message: Message data (dict or string)
            persist: Whether to store the message
        """
        # Generate unique message ID
        message_id = str(uuid.uuid4())

        # Prepare message envelope
        envelope = {
            'id': message_id,
            'channel': channel,
            'data': message,
            'timestamp': datetime.now().isoformat()
        }

        serialized = json.dumps(envelope)

        if persist:
            # Store message in a sorted set (score = timestamp for ordering)
            storage_key = f"messages:{channel}"
            score = datetime.now().timestamp()

            # Use pipeline for atomic operations
            pipe = self.client.pipeline()

            # Store message
            pipe.zadd(storage_key, {serialized: score})

            # Set expiry on the storage key
            pipe.expire(storage_key, self.message_ttl)

            # Also store in a hash for direct ID lookup
            pipe.hset(f"message:{message_id}", mapping={
                'data': serialized,
                'channel': channel
            })
            pipe.expire(f"message:{message_id}", self.message_ttl)

            pipe.execute()

        # Publish to channel for real-time delivery
        subscriber_count = self.client.publish(channel, serialized)

        return {
            'message_id': message_id,
            'subscribers_notified': subscriber_count,
            'persisted': persist
        }

    def get_missed_messages(self, channel, since_timestamp):
        """
        Retrieve messages published after a given timestamp.
        Useful for subscribers reconnecting after downtime.

        Args:
            channel: Channel to get messages from
            since_timestamp: Unix timestamp to start from
        """
        storage_key = f"messages:{channel}"

        # Get messages with score > since_timestamp
        messages = self.client.zrangebyscore(
            storage_key,
            since_timestamp,
            '+inf',
            withscores=True
        )

        return [
            {
                'message': json.loads(msg),
                'timestamp': score
            }
            for msg, score in messages
        ]
```

#### Pattern 2: Using Lists as Message Queue Backup

```python
#!/usr/bin/env python3
"""
Pub/Sub with List backup pattern
Uses Redis Lists to ensure message delivery
"""

import redis
import json
import threading
import time


class ReliablePublisher:
    """
    Publisher that uses both Pub/Sub and Lists for reliability.
    """

    def __init__(self, redis_client):
        self.client = redis_client

    def publish(self, channel, message):
        """
        Publish message to both Pub/Sub channel and backup list.
        """
        serialized = json.dumps(message) if isinstance(message, dict) else message

        # Use pipeline for atomic operations
        pipe = self.client.pipeline()

        # Push to backup list (consumers will BRPOP from here)
        pipe.lpush(f"queue:{channel}", serialized)

        # Also publish for real-time subscribers
        pipe.publish(channel, serialized)

        results = pipe.execute()

        return {
            'queued_position': results[0],
            'realtime_subscribers': results[1]
        }


class ReliableSubscriber:
    """
    Subscriber that falls back to queue if Pub/Sub message missed.
    """

    def __init__(self, redis_client, channel):
        self.client = redis_client
        self.channel = channel
        self.pubsub = self.client.pubsub()
        self.running = False

    def start(self, message_handler):
        """
        Start hybrid subscriber that listens to both Pub/Sub and queue.
        """
        self.running = True

        # Subscribe to Pub/Sub channel
        self.pubsub.subscribe(self.channel)

        # Start queue processor in separate thread
        queue_thread = threading.Thread(
            target=self._process_queue,
            args=(message_handler,)
        )
        queue_thread.daemon = True
        queue_thread.start()

        # Process Pub/Sub messages in main thread
        print(f"Listening on channel: {self.channel}")

        for message in self.pubsub.listen():
            if not self.running:
                break

            if message['type'] == 'message':
                data = message['data']
                # Mark as processed from realtime
                message_handler(data, source='pubsub')

    def _process_queue(self, message_handler):
        """
        Process messages from backup queue.
        Uses BRPOP for blocking pop operation.
        """
        queue_key = f"queue:{self.channel}"

        while self.running:
            # BRPOP blocks until message available (timeout 1 second)
            result = self.client.brpop(queue_key, timeout=1)

            if result:
                _, message = result
                message_handler(message, source='queue')

    def stop(self):
        """Stop the subscriber."""
        self.running = False
        self.pubsub.close()
```

## Scaling with Redis Cluster

When scaling Redis Pub/Sub to handle high volumes of messages or distribute load across multiple nodes, Redis Cluster provides a solution with some important considerations.

### Pub/Sub in Redis Cluster

In Redis Cluster, Pub/Sub behavior differs from single-node Redis:

1. **Global broadcast**: `PUBLISH` broadcasts to all cluster nodes
2. **Sharded Pub/Sub**: Redis 7.0+ supports `SPUBLISH` for hash slot-based routing
3. **Client awareness**: Clients can connect to any node to publish or subscribe

### Setting Up Redis Cluster

```bash
# Create directories for cluster nodes
mkdir -p /etc/redis/cluster/{7000,7001,7002,7003,7004,7005}

# Create configuration for each node
for port in 7000 7001 7002 7003 7004 7005; do
cat > /etc/redis/cluster/${port}/redis.conf << EOF
port ${port}
cluster-enabled yes
cluster-config-file nodes-${port}.conf
cluster-node-timeout 5000
appendonly yes
appendfilename "appendonly-${port}.aof"
dbfilename dump-${port}.rdb
dir /var/lib/redis/cluster/${port}
bind 127.0.0.1
protected-mode yes
daemonize yes
pidfile /var/run/redis/redis-${port}.pid
logfile /var/log/redis/redis-${port}.log
EOF
done

# Start all nodes
for port in 7000 7001 7002 7003 7004 7005; do
    redis-server /etc/redis/cluster/${port}/redis.conf
done

# Create the cluster (3 masters, 3 replicas)
redis-cli --cluster create \
    127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
    127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
    --cluster-replicas 1
```

### Cluster-Aware Python Client

```python
#!/usr/bin/env python3
"""
Redis Cluster Pub/Sub Example
Demonstrates Pub/Sub with Redis Cluster
"""

from redis.cluster import RedisCluster
import json


def create_cluster_client():
    """
    Create a Redis Cluster client.
    The client automatically discovers all cluster nodes.
    """
    # Define startup nodes (client will discover the rest)
    startup_nodes = [
        {"host": "127.0.0.1", "port": 7000},
        {"host": "127.0.0.1", "port": 7001},
        {"host": "127.0.0.1", "port": 7002}
    ]

    client = RedisCluster(
        startup_nodes=startup_nodes,
        decode_responses=True,
        skip_full_coverage_check=True
    )

    return client


def cluster_publisher():
    """
    Publish messages in a Redis Cluster environment.
    """
    client = create_cluster_client()

    # Regular PUBLISH broadcasts to all nodes
    message = {
        'event': 'cluster_test',
        'data': 'Hello from cluster!'
    }

    # Publish to channel (broadcasts to all nodes)
    subscriber_count = client.publish('cluster_channel', json.dumps(message))
    print(f"Published to {subscriber_count} subscribers across cluster")

    # For Redis 7.0+: Sharded Pub/Sub (routes to specific shard)
    # client.spublish('sharded_channel', json.dumps(message))


def cluster_subscriber():
    """
    Subscribe to messages in a Redis Cluster environment.
    """
    client = create_cluster_client()
    pubsub = client.pubsub()

    # Subscribe works across the cluster
    pubsub.subscribe('cluster_channel')

    print("Listening for cluster messages...")

    for message in pubsub.listen():
        if message['type'] == 'message':
            print(f"Received: {message['data']}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'subscribe':
        cluster_subscriber()
    else:
        cluster_publisher()
```

### Scaling Considerations

1. **Message amplification**: In cluster mode, PUBLISH sends messages to all nodes, increasing network traffic
2. **Sharded Pub/Sub**: Use `SPUBLISH/SSUBSCRIBE` (Redis 7.0+) for better scalability when channel locality is important
3. **Client distribution**: Distribute subscribers across cluster nodes to balance load
4. **Connection management**: Each subscriber connection consumes resources; monitor connection counts

## Monitoring Pub/Sub Activity

Monitoring your Redis Pub/Sub system is essential for maintaining performance and identifying issues.

### Built-in Monitoring Commands

```bash
# View all active channels with at least one subscriber
127.0.0.1:6379> PUBSUB CHANNELS
1) "notifications"
2) "events:users"
3) "alerts:critical"

# View channels matching a pattern
127.0.0.1:6379> PUBSUB CHANNELS alerts:*
1) "alerts:critical"
2) "alerts:warning"

# Get subscriber count for specific channels
127.0.0.1:6379> PUBSUB NUMSUB notifications events:users
1) "notifications"
2) (integer) 5
3) "events:users"
4) (integer) 3

# Get count of pattern subscriptions
127.0.0.1:6379> PUBSUB NUMPAT
(integer) 12
```

### Real-time Monitoring with MONITOR

```bash
# WARNING: MONITOR impacts performance - use sparingly in production
127.0.0.1:6379> MONITOR
OK
# Shows all commands processed by Redis in real-time
# 1673456789.123456 [0 127.0.0.1:54321] "PUBLISH" "notifications" "test message"
# 1673456789.234567 [0 127.0.0.1:54322] "SUBSCRIBE" "events"
```

### Client Information

```bash
# List all connected clients
127.0.0.1:6379> CLIENT LIST

# Filter for Pub/Sub clients (look for 'sub=' or 'psub=' flags)
# id=5 addr=127.0.0.1:54321 ... sub=3 psub=2 ...
# sub=3 means subscribed to 3 channels
# psub=2 means subscribed to 2 patterns
```

### Python Monitoring Script

```python
#!/usr/bin/env python3
"""
Redis Pub/Sub Monitoring Script
Provides real-time statistics about Pub/Sub activity
"""

import redis
import time
from datetime import datetime


class PubSubMonitor:
    """
    Monitor Redis Pub/Sub activity and collect metrics.
    """

    def __init__(self, host='localhost', port=6379):
        self.client = redis.Redis(
            host=host,
            port=port,
            decode_responses=True
        )

    def get_active_channels(self, pattern='*'):
        """
        Get list of active channels (with subscribers).

        Args:
            pattern: Glob pattern to filter channels
        """
        return self.client.pubsub_channels(pattern)

    def get_subscriber_counts(self, *channels):
        """
        Get subscriber count for each channel.

        Args:
            *channels: Channel names to check
        """
        if not channels:
            channels = self.get_active_channels()

        if not channels:
            return {}

        # PUBSUB NUMSUB returns alternating channel names and counts
        result = self.client.pubsub_numsub(*channels)

        # Convert to dictionary
        return dict(result)

    def get_pattern_subscription_count(self):
        """
        Get total number of pattern subscriptions.
        """
        return self.client.pubsub_numpat()

    def get_client_stats(self):
        """
        Get Pub/Sub-related client statistics.
        """
        clients = self.client.client_list()

        pubsub_clients = []
        for client in clients:
            # Check if client has Pub/Sub subscriptions
            sub_count = client.get('sub', 0)
            psub_count = client.get('psub', 0)

            if sub_count > 0 or psub_count > 0:
                pubsub_clients.append({
                    'id': client.get('id'),
                    'addr': client.get('addr'),
                    'name': client.get('name', 'unnamed'),
                    'channel_subscriptions': sub_count,
                    'pattern_subscriptions': psub_count,
                    'age_seconds': client.get('age'),
                    'idle_seconds': client.get('idle')
                })

        return pubsub_clients

    def get_memory_stats(self):
        """
        Get memory statistics related to Pub/Sub.
        """
        info = self.client.info('memory')
        return {
            'used_memory_human': info.get('used_memory_human'),
            'used_memory_peak_human': info.get('used_memory_peak_human'),
            'mem_fragmentation_ratio': info.get('mem_fragmentation_ratio')
        }

    def print_dashboard(self):
        """
        Print a monitoring dashboard to the console.
        """
        print("\n" + "=" * 60)
        print(f" Redis Pub/Sub Monitor - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        # Active channels
        channels = self.get_active_channels()
        print(f"\nActive Channels: {len(channels)}")

        if channels:
            subscriber_counts = self.get_subscriber_counts(*channels)
            for channel, count in sorted(subscriber_counts.items()):
                print(f"  - {channel}: {count} subscriber(s)")

        # Pattern subscriptions
        pattern_count = self.get_pattern_subscription_count()
        print(f"\nPattern Subscriptions: {pattern_count}")

        # Connected Pub/Sub clients
        pubsub_clients = self.get_client_stats()
        print(f"\nPub/Sub Clients: {len(pubsub_clients)}")

        for client in pubsub_clients[:10]:  # Show first 10
            print(f"  - {client['addr']}: "
                  f"{client['channel_subscriptions']} channels, "
                  f"{client['pattern_subscriptions']} patterns")

        # Memory stats
        memory = self.get_memory_stats()
        print(f"\nMemory Usage: {memory['used_memory_human']}")
        print(f"Peak Memory: {memory['used_memory_peak_human']}")

        print("\n" + "=" * 60)


def main():
    """
    Run continuous monitoring dashboard.
    """
    monitor = PubSubMonitor()

    print("Starting Pub/Sub monitor (Ctrl+C to stop)...")

    try:
        while True:
            monitor.print_dashboard()
            time.sleep(5)  # Update every 5 seconds

    except KeyboardInterrupt:
        print("\nMonitor stopped")


if __name__ == '__main__':
    main()
```

## Use Cases and Limitations

### Ideal Use Cases

1. **Real-time notifications**
   - Chat applications
   - Live activity feeds
   - Push notifications to connected clients

2. **Event broadcasting**
   - System-wide announcements
   - Configuration updates
   - Cache invalidation signals

3. **Real-time dashboards**
   - Metrics and monitoring data
   - Live analytics updates
   - Stock ticker updates

4. **Microservice communication**
   - Event-driven architectures
   - Service discovery notifications
   - Health check broadcasts

5. **Gaming**
   - Real-time game state updates
   - Player action broadcasts
   - Match coordination

### Limitations

1. **No message persistence**
   - Messages are lost if no subscribers are listening
   - Cannot replay historical messages
   - No delivery guarantees

2. **No acknowledgment mechanism**
   - Publishers don't know if messages were processed
   - No retry logic for failed deliveries
   - Fire-and-forget only

3. **Scaling challenges**
   - All messages go to all subscribers (no load balancing)
   - In cluster mode, messages broadcast to all nodes
   - Memory usage grows with subscriber count

4. **No message filtering**
   - Subscribers receive all messages on subscribed channels
   - Filtering must be done client-side
   - Pattern matching is limited to channel names

5. **Connection requirements**
   - Subscribers must maintain persistent connections
   - Network disconnects cause message loss
   - No offline message queuing

### When NOT to Use Redis Pub/Sub

- **Mission-critical messages**: Use Redis Streams or dedicated message brokers
- **Message queues with workers**: Use Redis Lists or Streams with consumer groups
- **Large message payloads**: Redis is optimized for small messages
- **Long-term message storage**: Use a database or message broker with persistence
- **Complex routing logic**: Consider RabbitMQ or Apache Kafka

## Best Practices

### 1. Channel Naming Conventions

```bash
# Use hierarchical naming with colons as separators
# Format: <domain>:<entity>:<action>

# Good examples:
user:123:notifications
order:created
system:alerts:critical
metrics:cpu:server01

# Avoid:
userNotifications     # No hierarchy
user-123-notifications # Inconsistent separator
USER:NOTIFICATIONS    # Mixed case
```

### 2. Message Structure

```python
# Always use structured messages with metadata
import json
from datetime import datetime
import uuid

def create_message(event_type, payload):
    """
    Create a well-structured message with metadata.
    """
    return json.dumps({
        # Unique identifier for tracking
        'id': str(uuid.uuid4()),

        # Event classification
        'type': event_type,

        # ISO 8601 timestamp
        'timestamp': datetime.utcnow().isoformat() + 'Z',

        # Schema version for backwards compatibility
        'version': '1.0',

        # Actual payload
        'data': payload
    })

# Usage
message = create_message('user.signup', {
    'user_id': '12345',
    'email': 'user@example.com'
})
```

### 3. Error Handling and Reconnection

```python
import redis
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RobustSubscriber:
    """
    Subscriber with automatic reconnection and error handling.
    """

    def __init__(self, host='localhost', port=6379):
        self.host = host
        self.port = port
        self.client = None
        self.pubsub = None
        self.max_retries = 5
        self.retry_delay = 1

    def connect(self):
        """
        Establish connection with retry logic.
        """
        retries = 0

        while retries < self.max_retries:
            try:
                self.client = redis.Redis(
                    host=self.host,
                    port=self.port,
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True
                )

                # Test connection
                self.client.ping()
                self.pubsub = self.client.pubsub()

                logger.info("Connected to Redis")
                return True

            except redis.ConnectionError as e:
                retries += 1
                logger.warning(f"Connection failed (attempt {retries}): {e}")
                time.sleep(self.retry_delay * retries)

        logger.error("Max connection retries exceeded")
        return False

    def subscribe_with_handler(self, channels, handler):
        """
        Subscribe to channels with automatic reconnection.
        """
        while True:
            try:
                if not self.pubsub:
                    if not self.connect():
                        time.sleep(5)
                        continue

                # Subscribe to channels
                for channel in channels:
                    self.pubsub.subscribe(channel)

                logger.info(f"Subscribed to: {channels}")

                # Listen for messages
                for message in self.pubsub.listen():
                    if message['type'] == 'message':
                        try:
                            handler(message['channel'], message['data'])
                        except Exception as e:
                            logger.error(f"Handler error: {e}")
                            # Continue listening despite handler errors

            except redis.ConnectionError as e:
                logger.warning(f"Connection lost: {e}")
                self.pubsub = None
                time.sleep(self.retry_delay)

            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                time.sleep(self.retry_delay)
```

### 4. Resource Management

```python
# Always clean up resources properly
class ManagedSubscriber:
    def __enter__(self):
        self.client = redis.Redis(decode_responses=True)
        self.pubsub = self.client.pubsub()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.pubsub:
            self.pubsub.close()
        if self.client:
            self.client.close()

# Usage with context manager
with ManagedSubscriber() as subscriber:
    subscriber.pubsub.subscribe('channel')
    # ... use subscriber
# Automatically cleaned up
```

### 5. Message Size Limits

```python
# Keep messages small - Redis is optimized for small payloads
MAX_MESSAGE_SIZE = 1024 * 1024  # 1 MB recommended max

def publish_safely(client, channel, message):
    """
    Publish with message size validation.
    """
    serialized = json.dumps(message)

    if len(serialized) > MAX_MESSAGE_SIZE:
        raise ValueError(
            f"Message too large: {len(serialized)} bytes "
            f"(max: {MAX_MESSAGE_SIZE})"
        )

    return client.publish(channel, serialized)

# For large data, store separately and publish reference
def publish_large_data(client, channel, large_data):
    """
    Store large data separately and publish reference.
    """
    # Generate unique key
    data_key = f"data:{uuid.uuid4()}"

    # Store large data with expiry
    client.setex(data_key, 3600, json.dumps(large_data))

    # Publish reference to the data
    reference = {
        'type': 'data_reference',
        'key': data_key,
        'size': len(json.dumps(large_data))
    }

    return client.publish(channel, json.dumps(reference))
```

### 6. Security Considerations

```bash
# In redis.conf, configure security settings:

# Require authentication
requirepass your_strong_password_here

# Bind to specific interfaces only
bind 127.0.0.1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# Enable TLS (Redis 6+)
tls-port 6379
port 0
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
```

### 7. Performance Optimization

```python
# Use pipelines for multiple operations
def publish_batch(client, messages):
    """
    Publish multiple messages efficiently using pipeline.
    """
    pipe = client.pipeline()

    for channel, message in messages:
        pipe.publish(channel, json.dumps(message))

    # Execute all commands at once
    results = pipe.execute()

    return results

# Avoid blocking operations in message handlers
import asyncio

async def async_handler(channel, message):
    """
    Non-blocking message handler using asyncio.
    """
    # Process message asynchronously
    await asyncio.sleep(0)  # Yield control
    # ... process message
```

## Conclusion

Redis Pub/Sub provides a powerful, lightweight solution for real-time messaging between applications. Its simplicity and low latency make it ideal for scenarios where immediate message delivery is more important than guaranteed delivery.

Key takeaways:

1. **Understand the trade-offs**: Redis Pub/Sub is fire-and-forget; use Redis Streams for persistence
2. **Design for failure**: Implement reconnection logic and handle message loss gracefully
3. **Monitor actively**: Track channel activity, subscriber counts, and memory usage
4. **Follow naming conventions**: Use hierarchical channel names for maintainability
5. **Keep messages small**: Store large data separately and publish references
6. **Secure your deployment**: Use authentication, TLS, and proper network configuration

For production deployments, consider combining Redis Pub/Sub with other Redis features or complementary technologies based on your specific reliability and scalability requirements.

---

## Monitor Your Redis Infrastructure with OneUptime

Maintaining a reliable Redis Pub/Sub system requires comprehensive monitoring and alerting. [OneUptime](https://oneuptime.com) provides enterprise-grade infrastructure monitoring that helps you:

- **Monitor Redis health**: Track connection status, memory usage, and command latency
- **Set up intelligent alerts**: Get notified immediately when Redis nodes become unreachable or performance degrades
- **Visualize Pub/Sub metrics**: Create custom dashboards showing channel activity, subscriber counts, and message throughput
- **Track historical data**: Analyze trends and identify patterns in your messaging infrastructure
- **Incident management**: Coordinate responses to Redis outages with built-in incident workflows
- **Uptime monitoring**: Ensure your Redis-dependent services remain available 24/7

With OneUptime, you can proactively identify issues before they impact your users and maintain the reliability your real-time applications demand. Start monitoring your Redis infrastructure today at [https://oneuptime.com](https://oneuptime.com).

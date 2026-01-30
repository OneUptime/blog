# How to Implement RabbitMQ Connection Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RabbitMQ, Reliability, Connection, Resilience

Description: Build resilient RabbitMQ clients with automatic connection recovery, topology restoration, and exponential backoff strategies.

---

RabbitMQ connections fail. Network partitions happen, brokers restart, and nodes go down for maintenance. Production applications need automatic recovery that handles these scenarios without manual intervention. This guide covers connection recovery patterns that keep your message queues running reliably.

## Why Connection Recovery Matters

| Scenario | Without Recovery | With Recovery |
|----------|------------------|---------------|
| Broker restart | Application crashes | Reconnects automatically |
| Network blip | Messages lost | Resumes after reconnection |
| Cluster failover | Manual restart needed | Transparent failover |
| Rolling updates | Downtime | Zero message loss |

## Connection Recovery State Machine

The recovery process follows a state machine pattern. Understanding these states helps you debug connection issues and implement proper monitoring.

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: connect()
    Connecting --> Connected: connection established
    Connecting --> Waiting: connection failed
    Waiting --> Connecting: backoff elapsed
    Connected --> Recovering: connection lost
    Recovering --> Connected: recovery complete
    Recovering --> Waiting: recovery failed
    Connected --> Disconnected: close()

    note right of Waiting
        Exponential backoff
        with jitter
    end note

    note right of Recovering
        Restore channels,
        exchanges, queues,
        and bindings
    end note
```

## Basic Recovery in Node.js

The `amqplib` library provides built-in connection events but no automatic recovery. This wrapper adds retry logic with exponential backoff.

```javascript
const amqp = require('amqplib');

class RabbitMQConnection {
  constructor(options = {}) {
    this.url = options.url || 'amqp://localhost';
    this.maxRetries = options.maxRetries || 10;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.factor = options.factor || 2;

    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.retryCount = 0;
  }

  async connect() {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    while (this.retryCount < this.maxRetries) {
      try {
        console.log(`Connecting to RabbitMQ (attempt ${this.retryCount + 1})...`);

        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();

        // Set up connection error handlers
        this.connection.on('error', (err) => {
          console.error('Connection error:', err.message);
        });

        this.connection.on('close', () => {
          console.log('Connection closed, attempting recovery...');
          this.connection = null;
          this.channel = null;
          this.scheduleReconnect();
        });

        console.log('Connected to RabbitMQ');
        this.retryCount = 0;
        this.isConnecting = false;
        return;

      } catch (error) {
        this.retryCount++;
        const delay = this.calculateDelay();

        console.error(
          `Connection failed: ${error.message}. ` +
          `Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    this.isConnecting = false;
    throw new Error(`Failed to connect after ${this.maxRetries} attempts`);
  }

  calculateDelay() {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.initialDelay * Math.pow(this.factor, this.retryCount - 1),
      this.maxDelay
    );

    // Add jitter (0.5 to 1.5 multiplier)
    const jitter = 0.5 + Math.random();
    return Math.floor(exponentialDelay * jitter);
  }

  scheduleReconnect() {
    if (!this.isConnecting) {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err.message);
      });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async publish(exchange, routingKey, message) {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const content = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchange, routingKey, content, {
      persistent: true,
    });
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

// Usage
const rabbit = new RabbitMQConnection({
  url: process.env.RABBITMQ_URL,
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
});

await rabbit.connect();
```

## Topology Recovery

When a connection recovers, you need to recreate exchanges, queues, and bindings. This class tracks your topology and restores it after reconnection.

```javascript
class RabbitMQWithTopologyRecovery {
  constructor(options = {}) {
    this.url = options.url || 'amqp://localhost';
    this.connection = null;
    this.channel = null;

    // Track topology for recovery
    this.exchanges = new Map();
    this.queues = new Map();
    this.bindings = [];
    this.consumers = new Map();

    this.isRecovering = false;
  }

  async connect() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    this.connection.on('close', () => this.handleDisconnect());

    // Restore topology if this is a reconnection
    if (this.exchanges.size > 0 || this.queues.size > 0) {
      await this.recoverTopology();
    }
  }

  async handleDisconnect() {
    if (this.isRecovering) return;

    this.isRecovering = true;
    console.log('Connection lost, starting recovery...');

    // Exponential backoff reconnection
    let delay = 1000;
    const maxDelay = 30000;

    while (true) {
      try {
        await this.connect();
        console.log('Recovery complete');
        this.isRecovering = false;
        return;
      } catch (error) {
        console.error(`Recovery failed: ${error.message}`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  async recoverTopology() {
    console.log('Recovering topology...');

    // Recover exchanges
    for (const [name, options] of this.exchanges) {
      await this.channel.assertExchange(name, options.type, options.options);
      console.log(`Recovered exchange: ${name}`);
    }

    // Recover queues
    for (const [name, options] of this.queues) {
      await this.channel.assertQueue(name, options);
      console.log(`Recovered queue: ${name}`);
    }

    // Recover bindings
    for (const binding of this.bindings) {
      await this.channel.bindQueue(
        binding.queue,
        binding.exchange,
        binding.routingKey
      );
      console.log(`Recovered binding: ${binding.queue} -> ${binding.exchange}`);
    }

    // Recover consumers
    for (const [queue, consumer] of this.consumers) {
      await this.channel.consume(queue, consumer.callback, consumer.options);
      console.log(`Recovered consumer on queue: ${queue}`);
    }
  }

  // Topology declaration methods that track state
  async assertExchange(name, type, options = {}) {
    this.exchanges.set(name, { type, options });
    return this.channel.assertExchange(name, type, options);
  }

  async assertQueue(name, options = {}) {
    this.queues.set(name, options);
    return this.channel.assertQueue(name, options);
  }

  async bindQueue(queue, exchange, routingKey) {
    this.bindings.push({ queue, exchange, routingKey });
    return this.channel.bindQueue(queue, exchange, routingKey);
  }

  async consume(queue, callback, options = {}) {
    this.consumers.set(queue, { callback, options });
    return this.channel.consume(queue, callback, options);
  }
}
```

## Recovery in Python with Pika

Pika requires manual recovery implementation. This class provides automatic reconnection with topology restoration.

```python
import pika
import time
import threading
import json
from typing import Callable, Dict, List, Optional

class ResilientRabbitMQ:
    def __init__(
        self,
        host: str = 'localhost',
        port: int = 5672,
        username: str = 'guest',
        password: str = 'guest',
        max_retries: int = 10,
        initial_delay: float = 1.0,
        max_delay: float = 30.0
    ):
        self.host = host
        self.port = port
        self.credentials = pika.PlainCredentials(username, password)
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay

        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[pika.channel.Channel] = None

        # Topology tracking
        self.exchanges: Dict[str, dict] = {}
        self.queues: Dict[str, dict] = {}
        self.bindings: List[dict] = []
        self.consumers: Dict[str, dict] = {}

        self._lock = threading.Lock()
        self._is_recovering = False

    def connect(self) -> None:
        """Establish connection with retry logic."""
        delay = self.initial_delay

        for attempt in range(1, self.max_retries + 1):
            try:
                print(f"Connecting to RabbitMQ (attempt {attempt})...")

                parameters = pika.ConnectionParameters(
                    host=self.host,
                    port=self.port,
                    credentials=self.credentials,
                    heartbeat=60,
                    blocked_connection_timeout=300
                )

                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()

                # Enable publisher confirms
                self.channel.confirm_delivery()

                print("Connected to RabbitMQ")

                # Restore topology if reconnecting
                if self.exchanges or self.queues:
                    self._recover_topology()

                return

            except pika.exceptions.AMQPConnectionError as e:
                print(f"Connection failed: {e}")

                if attempt < self.max_retries:
                    # Add jitter
                    jittered_delay = delay * (0.5 + random.random())
                    print(f"Retrying in {jittered_delay:.1f}s...")
                    time.sleep(jittered_delay)
                    delay = min(delay * 2, self.max_delay)

        raise Exception(f"Failed to connect after {self.max_retries} attempts")

    def _recover_topology(self) -> None:
        """Restore exchanges, queues, bindings, and consumers."""
        print("Recovering topology...")

        # Recover exchanges
        for name, config in self.exchanges.items():
            self.channel.exchange_declare(
                exchange=name,
                exchange_type=config['type'],
                durable=config.get('durable', True),
                auto_delete=config.get('auto_delete', False)
            )
            print(f"Recovered exchange: {name}")

        # Recover queues
        for name, config in self.queues.items():
            self.channel.queue_declare(
                queue=name,
                durable=config.get('durable', True),
                exclusive=config.get('exclusive', False),
                auto_delete=config.get('auto_delete', False)
            )
            print(f"Recovered queue: {name}")

        # Recover bindings
        for binding in self.bindings:
            self.channel.queue_bind(
                queue=binding['queue'],
                exchange=binding['exchange'],
                routing_key=binding['routing_key']
            )
            print(f"Recovered binding: {binding['queue']} -> {binding['exchange']}")

        # Recover consumers
        for queue, config in self.consumers.items():
            self.channel.basic_consume(
                queue=queue,
                on_message_callback=config['callback'],
                auto_ack=config.get('auto_ack', False)
            )
            print(f"Recovered consumer on queue: {queue}")

    def declare_exchange(
        self,
        name: str,
        exchange_type: str = 'topic',
        durable: bool = True
    ) -> None:
        """Declare exchange and track for recovery."""
        self.exchanges[name] = {
            'type': exchange_type,
            'durable': durable
        }
        self.channel.exchange_declare(
            exchange=name,
            exchange_type=exchange_type,
            durable=durable
        )

    def declare_queue(
        self,
        name: str,
        durable: bool = True,
        exclusive: bool = False
    ) -> None:
        """Declare queue and track for recovery."""
        self.queues[name] = {
            'durable': durable,
            'exclusive': exclusive
        }
        self.channel.queue_declare(
            queue=name,
            durable=durable,
            exclusive=exclusive
        )

    def bind_queue(
        self,
        queue: str,
        exchange: str,
        routing_key: str
    ) -> None:
        """Bind queue to exchange and track for recovery."""
        self.bindings.append({
            'queue': queue,
            'exchange': exchange,
            'routing_key': routing_key
        })
        self.channel.queue_bind(
            queue=queue,
            exchange=exchange,
            routing_key=routing_key
        )

    def publish(
        self,
        exchange: str,
        routing_key: str,
        message: dict,
        retry_on_failure: bool = True
    ) -> bool:
        """Publish message with automatic retry on connection failure."""
        body = json.dumps(message).encode()
        properties = pika.BasicProperties(
            delivery_mode=2,  # Persistent
            content_type='application/json'
        )

        try:
            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=body,
                properties=properties,
                mandatory=True
            )
            return True

        except (pika.exceptions.ConnectionClosed,
                pika.exceptions.ChannelClosed) as e:
            print(f"Publish failed: {e}")

            if retry_on_failure:
                self._handle_disconnect()
                return self.publish(
                    exchange, routing_key, message,
                    retry_on_failure=False
                )
            return False

    def _handle_disconnect(self) -> None:
        """Handle disconnection and trigger recovery."""
        with self._lock:
            if self._is_recovering:
                return
            self._is_recovering = True

        try:
            print("Connection lost, recovering...")
            self.connect()
        finally:
            self._is_recovering = False

    def close(self) -> None:
        """Close connection gracefully."""
        if self.connection and self.connection.is_open:
            self.connection.close()


# Usage
rabbit = ResilientRabbitMQ(
    host='rabbitmq.example.com',
    username='app',
    password='secret'
)

rabbit.connect()
rabbit.declare_exchange('events', 'topic')
rabbit.declare_queue('order-processor')
rabbit.bind_queue('order-processor', 'events', 'orders.*')

rabbit.publish('events', 'orders.created', {'order_id': '12345'})
```

## Recovery in Go with amqp091-go

Go's `amqp091-go` library uses channels (the Go kind) to notify about connection state changes. This pattern leverages goroutines for non-blocking recovery.

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "math"
    "math/rand"
    "sync"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
)

type Exchange struct {
    Name    string
    Type    string
    Durable bool
}

type Queue struct {
    Name    string
    Durable bool
}

type Binding struct {
    Queue      string
    Exchange   string
    RoutingKey string
}

type ResilientConnection struct {
    url          string
    conn         *amqp.Connection
    channel      *amqp.Channel

    exchanges    []Exchange
    queues       []Queue
    bindings     []Binding

    maxRetries   int
    initialDelay time.Duration
    maxDelay     time.Duration

    mu           sync.RWMutex
    isConnected  bool
    closeChan    chan struct{}
}

func NewResilientConnection(url string) *ResilientConnection {
    return &ResilientConnection{
        url:          url,
        maxRetries:   10,
        initialDelay: 1 * time.Second,
        maxDelay:     30 * time.Second,
        exchanges:    make([]Exchange, 0),
        queues:       make([]Queue, 0),
        bindings:     make([]Binding, 0),
        closeChan:    make(chan struct{}),
    }
}

func (r *ResilientConnection) Connect() error {
    delay := r.initialDelay

    for attempt := 1; attempt <= r.maxRetries; attempt++ {
        log.Printf("Connecting to RabbitMQ (attempt %d)...", attempt)

        conn, err := amqp.Dial(r.url)
        if err != nil {
            log.Printf("Connection failed: %v", err)

            if attempt < r.maxRetries {
                jitter := 0.5 + rand.Float64()
                sleepDuration := time.Duration(float64(delay) * jitter)
                log.Printf("Retrying in %v...", sleepDuration)
                time.Sleep(sleepDuration)

                delay = time.Duration(math.Min(
                    float64(delay*2),
                    float64(r.maxDelay),
                ))
            }
            continue
        }

        channel, err := conn.Channel()
        if err != nil {
            conn.Close()
            continue
        }

        r.mu.Lock()
        r.conn = conn
        r.channel = channel
        r.isConnected = true
        r.mu.Unlock()

        log.Println("Connected to RabbitMQ")

        // Recover topology
        if err := r.recoverTopology(); err != nil {
            log.Printf("Topology recovery failed: %v", err)
        }

        // Start connection monitor
        go r.monitorConnection()

        return nil
    }

    return fmt.Errorf("failed to connect after %d attempts", r.maxRetries)
}

func (r *ResilientConnection) monitorConnection() {
    notifyClose := make(chan *amqp.Error)
    r.conn.NotifyClose(notifyClose)

    select {
    case err := <-notifyClose:
        if err != nil {
            log.Printf("Connection closed: %v", err)
        }

        r.mu.Lock()
        r.isConnected = false
        r.mu.Unlock()

        // Trigger reconnection
        r.handleDisconnect()

    case <-r.closeChan:
        return
    }
}

func (r *ResilientConnection) handleDisconnect() {
    log.Println("Starting recovery...")

    if err := r.Connect(); err != nil {
        log.Printf("Recovery failed: %v", err)
    }
}

func (r *ResilientConnection) recoverTopology() error {
    log.Println("Recovering topology...")

    // Recover exchanges
    for _, ex := range r.exchanges {
        err := r.channel.ExchangeDeclare(
            ex.Name,
            ex.Type,
            ex.Durable,
            false, // auto-delete
            false, // internal
            false, // no-wait
            nil,
        )
        if err != nil {
            return fmt.Errorf("failed to recover exchange %s: %w", ex.Name, err)
        }
        log.Printf("Recovered exchange: %s", ex.Name)
    }

    // Recover queues
    for _, q := range r.queues {
        _, err := r.channel.QueueDeclare(
            q.Name,
            q.Durable,
            false, // auto-delete
            false, // exclusive
            false, // no-wait
            nil,
        )
        if err != nil {
            return fmt.Errorf("failed to recover queue %s: %w", q.Name, err)
        }
        log.Printf("Recovered queue: %s", q.Name)
    }

    // Recover bindings
    for _, b := range r.bindings {
        err := r.channel.QueueBind(
            b.Queue,
            b.RoutingKey,
            b.Exchange,
            false,
            nil,
        )
        if err != nil {
            return fmt.Errorf("failed to recover binding: %w", err)
        }
        log.Printf("Recovered binding: %s -> %s", b.Queue, b.Exchange)
    }

    return nil
}

func (r *ResilientConnection) DeclareExchange(
    name, exchangeType string,
    durable bool,
) error {
    r.exchanges = append(r.exchanges, Exchange{
        Name:    name,
        Type:    exchangeType,
        Durable: durable,
    })

    return r.channel.ExchangeDeclare(
        name,
        exchangeType,
        durable,
        false,
        false,
        false,
        nil,
    )
}

func (r *ResilientConnection) DeclareQueue(name string, durable bool) error {
    r.queues = append(r.queues, Queue{
        Name:    name,
        Durable: durable,
    })

    _, err := r.channel.QueueDeclare(
        name,
        durable,
        false,
        false,
        false,
        nil,
    )
    return err
}

func (r *ResilientConnection) BindQueue(
    queue, exchange, routingKey string,
) error {
    r.bindings = append(r.bindings, Binding{
        Queue:      queue,
        Exchange:   exchange,
        RoutingKey: routingKey,
    })

    return r.channel.QueueBind(queue, routingKey, exchange, false, nil)
}

func (r *ResilientConnection) Publish(
    exchange, routingKey string,
    message interface{},
) error {
    r.mu.RLock()
    if !r.isConnected {
        r.mu.RUnlock()
        return fmt.Errorf("not connected")
    }
    r.mu.RUnlock()

    body, err := json.Marshal(message)
    if err != nil {
        return err
    }

    return r.channel.Publish(
        exchange,
        routingKey,
        false,
        false,
        amqp.Publishing{
            DeliveryMode: amqp.Persistent,
            ContentType:  "application/json",
            Body:         body,
        },
    )
}

func (r *ResilientConnection) Close() {
    close(r.closeChan)
    if r.conn != nil {
        r.conn.Close()
    }
}

func main() {
    rabbit := NewResilientConnection("amqp://guest:guest@localhost:5672/")

    if err := rabbit.Connect(); err != nil {
        log.Fatal(err)
    }
    defer rabbit.Close()

    rabbit.DeclareExchange("events", "topic", true)
    rabbit.DeclareQueue("order-processor", true)
    rabbit.BindQueue("order-processor", "events", "orders.*")

    message := map[string]string{"order_id": "12345"}
    rabbit.Publish("events", "orders.created", message)
}
```

## Recovery in Java with RabbitMQ Client

The official Java client has built-in automatic recovery. You can enable and configure it through connection factory settings.

```java
import com.rabbitmq.client.*;
import java.io.IOException;
import java.util.concurrent.TimeoutException;

public class ResilientRabbitMQ {
    private Connection connection;
    private Channel channel;
    private final ConnectionFactory factory;

    public ResilientRabbitMQ(String host, String username, String password) {
        factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setUsername(username);
        factory.setPassword(password);

        // Enable automatic recovery
        factory.setAutomaticRecoveryEnabled(true);

        // Set recovery interval (default is 5 seconds)
        factory.setNetworkRecoveryInterval(5000);

        // Enable topology recovery (exchanges, queues, bindings, consumers)
        factory.setTopologyRecoveryEnabled(true);

        // Connection timeout
        factory.setConnectionTimeout(30000);

        // Heartbeat interval (helps detect dead connections)
        factory.setRequestedHeartbeat(60);
    }

    public void connect() throws IOException, TimeoutException {
        connection = factory.newConnection();
        channel = connection.createChannel();

        // Add recovery listeners for monitoring
        ((Recoverable) connection).addRecoveryListener(new RecoveryListener() {
            @Override
            public void handleRecovery(Recoverable recoverable) {
                System.out.println("Connection recovered");
            }

            @Override
            public void handleRecoveryStarted(Recoverable recoverable) {
                System.out.println("Connection recovery started");
            }
        });

        // Add shutdown listener
        connection.addShutdownListener(cause -> {
            if (cause.isHardError()) {
                System.out.println("Connection lost: " + cause.getMessage());
            }
        });

        System.out.println("Connected to RabbitMQ");
    }

    public void declareExchange(String name, String type) throws IOException {
        channel.exchangeDeclare(name, type, true);
    }

    public void declareQueue(String name) throws IOException {
        channel.queueDeclare(name, true, false, false, null);
    }

    public void bindQueue(
        String queue,
        String exchange,
        String routingKey
    ) throws IOException {
        channel.queueBind(queue, exchange, routingKey);
    }

    public void publish(
        String exchange,
        String routingKey,
        byte[] message
    ) throws IOException {
        AMQP.BasicProperties properties = new AMQP.BasicProperties.Builder()
            .deliveryMode(2) // Persistent
            .contentType("application/json")
            .build();

        channel.basicPublish(exchange, routingKey, properties, message);
    }

    public void close() throws IOException, TimeoutException {
        if (channel != null && channel.isOpen()) {
            channel.close();
        }
        if (connection != null && connection.isOpen()) {
            connection.close();
        }
    }

    public static void main(String[] args) throws Exception {
        ResilientRabbitMQ rabbit = new ResilientRabbitMQ(
            "localhost",
            "guest",
            "guest"
        );

        rabbit.connect();
        rabbit.declareExchange("events", "topic");
        rabbit.declareQueue("order-processor");
        rabbit.bindQueue("order-processor", "events", "orders.*");

        String message = "{\"order_id\": \"12345\"}";
        rabbit.publish("events", "orders.created", message.getBytes());

        rabbit.close();
    }
}
```

## Backoff Strategy Comparison

Different backoff strategies have different characteristics. Choose based on your workload and failure patterns.

```mermaid
graph TD
    A[Retry Strategies] --> B[Fixed Delay]
    A --> C[Linear Backoff]
    A --> D[Exponential Backoff]
    A --> E[Exponential + Jitter]

    B --> B1[1s, 1s, 1s, 1s]
    C --> C1[1s, 2s, 3s, 4s]
    D --> D1[1s, 2s, 4s, 8s]
    E --> E1[0.7s, 2.3s, 3.1s, 9.5s]

    style E fill:#90EE90
    style E1 fill:#90EE90
```

| Strategy | Pros | Cons | Use When |
|----------|------|------|----------|
| **Fixed delay** | Simple, predictable | Can overwhelm recovering service | Internal services with low traffic |
| **Linear backoff** | Gradual pressure reduction | Synchronized retries still possible | Moderate failure scenarios |
| **Exponential backoff** | Good pressure reduction | Deterministic timing | Single client systems |
| **Exponential + jitter** | Prevents thundering herd | Less predictable | Multiple clients, production systems |

## Connection Health Monitoring

Monitor your connections to detect problems before they cause message loss.

```javascript
class RabbitMQHealthMonitor {
  constructor(connection, options = {}) {
    this.connection = connection;
    this.checkInterval = options.checkInterval || 30000;
    this.metrics = {
      connected: false,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      reconnectCount: 0,
      totalDowntime: 0,
    };

    this.setupEventHandlers();
    this.startHealthCheck();
  }

  setupEventHandlers() {
    this.connection.on('connect', () => {
      this.metrics.connected = true;
      this.metrics.lastConnectedAt = Date.now();

      if (this.metrics.lastDisconnectedAt) {
        const downtime = Date.now() - this.metrics.lastDisconnectedAt;
        this.metrics.totalDowntime += downtime;
      }
    });

    this.connection.on('disconnect', () => {
      this.metrics.connected = false;
      this.metrics.lastDisconnectedAt = Date.now();
      this.metrics.reconnectCount++;
    });
  }

  startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  async performHealthCheck() {
    try {
      // Send a simple command to verify connection
      await this.connection.channel.checkQueue('health-check-queue');

      return {
        status: 'healthy',
        metrics: this.getMetrics(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        metrics: this.getMetrics(),
      };
    }
  }

  getMetrics() {
    const now = Date.now();
    const uptime = this.metrics.lastConnectedAt
      ? now - this.metrics.lastConnectedAt
      : 0;

    return {
      connected: this.metrics.connected,
      uptime,
      reconnectCount: this.metrics.reconnectCount,
      totalDowntime: this.metrics.totalDowntime,
      availability: this.calculateAvailability(),
    };
  }

  calculateAvailability() {
    if (!this.metrics.lastConnectedAt) return 0;

    const totalTime = Date.now() - this.metrics.lastConnectedAt +
      this.metrics.totalDowntime;
    const uptimeMs = totalTime - this.metrics.totalDowntime;

    return (uptimeMs / totalTime) * 100;
  }

  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// Prometheus metrics for observability
const prometheus = require('prom-client');

const rabbitConnected = new prometheus.Gauge({
  name: 'rabbitmq_connected',
  help: 'RabbitMQ connection status (1 = connected, 0 = disconnected)',
});

const rabbitReconnects = new prometheus.Counter({
  name: 'rabbitmq_reconnect_total',
  help: 'Total number of RabbitMQ reconnections',
});

const rabbitDowntime = new prometheus.Counter({
  name: 'rabbitmq_downtime_seconds_total',
  help: 'Total RabbitMQ connection downtime in seconds',
});
```

## Handling Consumer Recovery

Consumers need special handling during recovery. Messages in flight when the connection drops may be redelivered.

```javascript
class ResilientConsumer {
  constructor(connection, queue, options = {}) {
    this.connection = connection;
    this.queue = queue;
    this.prefetch = options.prefetch || 10;
    this.processedIds = new Set();
    this.idExpiryMs = options.idExpiryMs || 3600000; // 1 hour
  }

  async start(handler) {
    await this.connection.channel.prefetch(this.prefetch);

    await this.connection.channel.consume(
      this.queue,
      async (msg) => {
        if (!msg) return;

        const messageId = msg.properties.messageId ||
          this.hashMessage(msg.content);

        // Check for duplicate (redelivery after recovery)
        if (this.processedIds.has(messageId)) {
          console.log(`Skipping duplicate message: ${messageId}`);
          this.connection.channel.ack(msg);
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content, msg);

          // Mark as processed
          this.processedIds.add(messageId);
          this.scheduleIdExpiry(messageId);

          this.connection.channel.ack(msg);

        } catch (error) {
          console.error('Message processing failed:', error);

          // Requeue on first failure, reject on redelivery
          const requeue = !msg.fields.redelivered;
          this.connection.channel.nack(msg, false, requeue);
        }
      },
      { noAck: false }
    );
  }

  hashMessage(content) {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  scheduleIdExpiry(messageId) {
    setTimeout(() => {
      this.processedIds.delete(messageId);
    }, this.idExpiryMs);
  }
}
```

## Production Checklist

Before deploying to production, verify your recovery implementation handles these scenarios:

| Test | Method | Expected Behavior |
|------|--------|-------------------|
| Broker restart | `docker restart rabbitmq` | Auto-reconnect, restore topology |
| Network partition | `iptables -A INPUT -p tcp --dport 5672 -j DROP` | Detect via heartbeat, reconnect |
| Channel error | Publish to non-existent exchange | Channel recovery, retry publish |
| Consumer cancel | Delete queue while consuming | Recreate queue, resume consuming |
| Cluster failover | Stop primary node | Connect to secondary node |

## Summary

| Component | Recovery Strategy |
|-----------|-------------------|
| **Connection** | Exponential backoff with jitter |
| **Topology** | Track and restore exchanges, queues, bindings |
| **Consumers** | Deduplicate redelivered messages |
| **Publishers** | Retry with publisher confirms |
| **Health** | Monitor and expose metrics |

Reliable RabbitMQ connections require explicit recovery handling in most client libraries. By implementing exponential backoff, topology tracking, and consumer deduplication, you can build messaging systems that survive broker restarts, network failures, and cluster failovers without losing messages.

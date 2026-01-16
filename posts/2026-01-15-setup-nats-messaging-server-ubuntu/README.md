# How to Set Up NATS Messaging Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, NATS, Messaging, Pub/Sub, Microservices, Tutorial

Description: Complete guide to installing and configuring NATS messaging system on Ubuntu.

---

## Introduction

NATS is a lightweight, high-performance messaging system designed for cloud-native applications, microservices architectures, and IoT messaging. Known for its simplicity and speed, NATS provides a simple yet powerful publish/subscribe messaging model along with request/reply patterns. In this comprehensive guide, we will walk through setting up NATS on Ubuntu, configuring it for production use, and exploring its various features including JetStream for persistence.

## Understanding NATS

### What is NATS?

NATS (Neural Autonomic Transport System) is an open-source messaging system written in Go. It was designed with the following principles in mind:

- **Simplicity**: NATS has a straightforward text-based protocol
- **Performance**: Capable of handling millions of messages per second
- **Scalability**: Easy to cluster and scale horizontally
- **Security**: Built-in authentication and TLS support
- **Resiliency**: Automatic reconnection and self-healing clusters

### NATS Architecture

NATS consists of several key components:

1. **NATS Server**: The core message broker
2. **Core NATS**: Basic publish/subscribe and request/reply messaging
3. **JetStream**: Persistence layer for streaming and exactly-once delivery
4. **NATS CLI**: Command-line tools for administration and testing

### Why Choose NATS?

- **Ultra-low latency**: Measured in microseconds
- **Small footprint**: Single binary, minimal resource usage
- **Cloud-native**: Perfect for Kubernetes and containerized environments
- **No external dependencies**: Runs standalone without databases or ZooKeeper
- **Multi-language support**: Clients available for 40+ programming languages

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 20.04 LTS or later (this guide uses Ubuntu 22.04/24.04)
- Root or sudo access
- Basic familiarity with the terminal
- At least 1GB RAM and 10GB disk space

```bash
# Update your system first
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget gnupg2 software-properties-common
```

## Installing NATS Server

There are several methods to install NATS on Ubuntu. We will cover the most common approaches.

### Method 1: Download Pre-built Binary (Recommended)

This method provides the latest stable version directly from the official releases.

```bash
# Define the version to install
# Check https://github.com/nats-io/nats-server/releases for latest version
NATS_VERSION="2.10.22"

# Download the NATS server binary for Linux AMD64
wget https://github.com/nats-io/nats-server/releases/download/v${NATS_VERSION}/nats-server-v${NATS_VERSION}-linux-amd64.tar.gz

# Extract the archive
tar -xzf nats-server-v${NATS_VERSION}-linux-amd64.tar.gz

# Move the binary to a system-wide location
sudo mv nats-server-v${NATS_VERSION}-linux-amd64/nats-server /usr/local/bin/

# Verify the installation
nats-server --version
# Output: nats-server: v2.10.22

# Clean up downloaded files
rm -rf nats-server-v${NATS_VERSION}-linux-amd64*
```

### Method 2: Using Go (Build from Source)

If you need the absolute latest features or want to customize the build:

```bash
# Install Go if not already installed
sudo apt install -y golang-go

# Set up Go environment
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Install NATS server using Go
go install github.com/nats-io/nats-server/v2@latest

# Verify installation
nats-server --version
```

### Method 3: Using Docker

For containerized deployments:

```bash
# Pull the official NATS image
docker pull nats:latest

# Run NATS server in a container
docker run -d \
  --name nats-server \
  -p 4222:4222 \
  -p 8222:8222 \
  -p 6222:6222 \
  nats:latest

# Verify it's running
docker ps | grep nats
```

### Creating a System User and Directories

For a proper production setup, create a dedicated user and directories:

```bash
# Create a system user for NATS (no login shell for security)
sudo useradd --system --no-create-home --shell /bin/false nats

# Create directories for NATS
# Configuration directory
sudo mkdir -p /etc/nats

# Data directory for JetStream persistence
sudo mkdir -p /var/lib/nats/jetstream

# Log directory
sudo mkdir -p /var/log/nats

# PID file directory
sudo mkdir -p /var/run/nats

# Set ownership to the nats user
sudo chown -R nats:nats /var/lib/nats
sudo chown -R nats:nats /var/log/nats
sudo chown -R nats:nats /var/run/nats
```

## Configuration File

NATS uses a configuration file for advanced settings. Let's create a comprehensive configuration.

### Basic Configuration

Create the main configuration file:

```bash
sudo nano /etc/nats/nats-server.conf
```

Add the following configuration:

```hcl
# /etc/nats/nats-server.conf
# NATS Server Configuration File
# Documentation: https://docs.nats.io/running-a-nats-service/configuration

# ==============================================================================
# Server Identification
# ==============================================================================

# Unique name for this server instance
# Useful for identifying servers in clusters and monitoring
server_name: "nats-ubuntu-01"

# ==============================================================================
# Network Configuration
# ==============================================================================

# Client connection port
# This is where client applications connect to publish/subscribe
port: 4222

# Host/IP to bind to
# Use 0.0.0.0 to listen on all interfaces, or specific IP for security
host: "0.0.0.0"

# HTTP monitoring port
# Provides server statistics and health endpoints
http_port: 8222

# Cluster port for server-to-server communication
# Used when running multiple NATS servers in a cluster
cluster {
    port: 6222
    name: "nats-cluster"
}

# ==============================================================================
# Connection Limits
# ==============================================================================

# Maximum number of client connections
max_connections: 65536

# Maximum payload size in bytes (default: 1MB)
# Increase for larger messages, but be mindful of memory usage
max_payload: 1048576

# Maximum pending bytes for a single connection
max_pending: 67108864

# Maximum control line length
max_control_line: 4096

# ==============================================================================
# Timeouts and Intervals
# ==============================================================================

# Ping interval - how often server pings clients
ping_interval: "2m"

# Maximum outstanding pings before connection is closed
ping_max: 2

# Time to wait for client to send CONNECT after TCP connection
write_deadline: "10s"

# ==============================================================================
# Logging Configuration
# ==============================================================================

# Enable debug logging (verbose, use only for troubleshooting)
debug: false

# Enable trace logging (very verbose, shows all protocol messages)
trace: false

# Log timestamp format
logtime: true

# Log file path
log_file: "/var/log/nats/nats-server.log"

# Log file size limit for rotation (in bytes)
log_size_limit: 104857600

# PID file location
pid_file: "/var/run/nats/nats-server.pid"

# ==============================================================================
# JetStream Configuration (Persistence)
# ==============================================================================

jetstream {
    # Enable JetStream
    # Required for persistence, streams, and exactly-once delivery

    # Storage directory for JetStream data
    store_dir: "/var/lib/nats/jetstream"

    # Maximum memory storage (in bytes)
    # This is for in-memory streams/consumers
    max_mem: 1073741824  # 1GB

    # Maximum file storage (in bytes)
    # This is for file-based persistent streams
    max_file: 10737418240  # 10GB

    # Domain name for JetStream
    # Useful in super-cluster setups
    domain: "local"
}

# ==============================================================================
# Security - TLS Configuration (Optional but Recommended)
# ==============================================================================

# Uncomment and configure for TLS encryption
# tls {
#     cert_file: "/etc/nats/certs/server.crt"
#     key_file: "/etc/nats/certs/server.key"
#     ca_file: "/etc/nats/certs/ca.crt"
#     verify: true
#     timeout: 2
# }
```

### Validate Configuration

Before starting the server, validate the configuration:

```bash
# Check configuration syntax
nats-server -c /etc/nats/nats-server.conf --dry-run

# If valid, you'll see:
# nats-server: configuration file /etc/nats/nats-server.conf is valid
```

## Setting Up Systemd Service

Create a systemd service file for automatic startup and management:

```bash
sudo nano /etc/systemd/system/nats-server.service
```

Add the following content:

```ini
[Unit]
# Service description
Description=NATS Server - High Performance Messaging System
Documentation=https://docs.nats.io

# Start after network is available
After=network-online.target
Wants=network-online.target

[Service]
# Run as the dedicated nats user
User=nats
Group=nats

# Service type - simple means systemd considers service started when exec starts
Type=simple

# The command to start NATS server
ExecStart=/usr/local/bin/nats-server -c /etc/nats/nats-server.conf

# Reload configuration on SIGHUP
ExecReload=/bin/kill -HUP $MAINPID

# Graceful shutdown
ExecStop=/bin/kill -SIGTERM $MAINPID

# Restart policy
Restart=on-failure
RestartSec=5

# Security hardening options
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/nats /var/log/nats /var/run/nats

# Resource limits
LimitNOFILE=65536
LimitNPROC=65536

# Standard output and error logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nats-server

[Install]
# Start on multi-user target (normal boot)
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable NATS to start on boot
sudo systemctl enable nats-server

# Start NATS server
sudo systemctl start nats-server

# Check status
sudo systemctl status nats-server

# View logs
sudo journalctl -u nats-server -f
```

## Core NATS: Publish/Subscribe

The publish/subscribe pattern is the foundation of NATS messaging. Publishers send messages to subjects, and subscribers receive messages from subjects they're interested in.

### Subject-Based Messaging

NATS uses a subject-based addressing scheme:

- Subjects are strings like `orders.new`, `sensors.temp.room1`
- Wildcards:
  - `*` matches a single token: `orders.*` matches `orders.new`, `orders.processed`
  - `>` matches one or more tokens: `sensors.>` matches `sensors.temp.room1`, `sensors.humidity.floor2.room5`

### Basic Publish/Subscribe Example

First, install the NATS CLI tool for testing:

```bash
# Download NATS CLI
NATS_CLI_VERSION="0.1.5"
wget https://github.com/nats-io/natscli/releases/download/v${NATS_CLI_VERSION}/nats-${NATS_CLI_VERSION}-linux-amd64.tar.gz

# Extract and install
tar -xzf nats-${NATS_CLI_VERSION}-linux-amd64.tar.gz
sudo mv nats-${NATS_CLI_VERSION}-linux-amd64/nats /usr/local/bin/

# Verify installation
nats --version

# Clean up
rm -rf nats-${NATS_CLI_VERSION}-linux-amd64*
```

Test basic pub/sub:

```bash
# Terminal 1: Subscribe to a subject
# The subscriber will wait for messages on the "test.subject" subject
nats sub test.subject

# Terminal 2: Publish a message
# This sends a message to all subscribers of "test.subject"
nats pub test.subject "Hello, NATS!"

# You should see the message appear in Terminal 1
```

### Wildcard Subscriptions

```bash
# Subscribe to all messages under "sensors" hierarchy
nats sub "sensors.>"

# In another terminal, publish to different subjects
nats pub sensors.temperature.room1 "22.5"
nats pub sensors.humidity.room1 "45"
nats pub sensors.pressure.building1 "1013.25"

# All messages will be received by the wildcard subscriber
```

### Queue Groups (Load Balancing)

Queue groups allow multiple subscribers to share the workload:

```bash
# Terminal 1: Subscribe as part of queue group "workers"
nats sub --queue workers tasks.process

# Terminal 2: Another subscriber in the same queue group
nats sub --queue workers tasks.process

# Terminal 3: Publish multiple messages
for i in {1..10}; do
    nats pub tasks.process "Task $i"
done

# Messages will be distributed evenly between the two subscribers
# Each message is delivered to only ONE subscriber in the queue group
```

## Request/Reply Patterns

NATS supports request/reply messaging, which is essential for synchronous communication patterns like RPC (Remote Procedure Call).

### Basic Request/Reply

```bash
# Terminal 1: Create a responder service
# This subscribes to "math.add" and replies to each request
nats reply math.add "Result: 42"

# Terminal 2: Send a request and wait for reply
nats request math.add "2 + 2"
# Output: Result: 42
```

### Request/Reply with the NATS Protocol

The request/reply pattern works by:

1. Client generates a unique inbox (reply-to subject)
2. Client subscribes to the inbox
3. Client publishes request with reply-to set to inbox
4. Service receives request, processes it, publishes reply to inbox
5. Client receives reply on inbox

## JetStream for Persistence

JetStream adds persistence, replay, and exactly-once delivery to NATS. It's essential for applications that need durable messaging.

### Creating Streams

A stream is a message store with defined retention policies:

```bash
# Create a stream for order events
# - Name: ORDERS
# - Subjects: orders.> (all order-related messages)
# - Retention: limits (keeps messages based on limits)
# - Storage: file (persistent storage)
# - Max messages: 1 million
# - Max age: 24 hours

nats stream add ORDERS \
    --subjects "orders.>" \
    --retention limits \
    --storage file \
    --max-msgs 1000000 \
    --max-age 24h \
    --max-bytes 1073741824 \
    --discard old \
    --dupe-window 2m \
    --replicas 1
```

### Stream Configuration Options

```bash
# List all streams
nats stream ls

# View stream details
nats stream info ORDERS

# View stream configuration
nats stream config ORDERS

# Stream report (shows real-time statistics)
nats stream report
```

### Creating Consumers

Consumers are views into streams that track delivery progress:

```bash
# Create a durable push consumer
# - Name: order-processor
# - Delivery subject: where messages are pushed
# - Ack policy: explicit (require acknowledgment)
# - Max deliver: 3 (retry up to 3 times)
# - Ack wait: 30 seconds (time to acknowledge)

nats consumer add ORDERS order-processor \
    --ack explicit \
    --deliver all \
    --max-deliver 3 \
    --ack-wait 30s \
    --replay instant \
    --filter ""

# Create a pull consumer (recommended for most use cases)
nats consumer add ORDERS order-worker \
    --pull \
    --ack explicit \
    --deliver all \
    --max-deliver 5 \
    --ack-wait 60s \
    --max-pending 1000
```

### Publishing to Streams

```bash
# Publish messages to the ORDERS stream
nats pub orders.new '{"order_id": "ORD-001", "customer": "john@example.com", "total": 99.99}'
nats pub orders.new '{"order_id": "ORD-002", "customer": "jane@example.com", "total": 149.99}'
nats pub orders.processed '{"order_id": "ORD-001", "status": "shipped"}'

# View stream messages
nats stream view ORDERS

# Get specific message by sequence number
nats stream get ORDERS 1
```

### Consuming from Streams

```bash
# Consume messages using pull consumer
# This fetches the next available message
nats consumer next ORDERS order-worker

# Consume multiple messages in batch
nats consumer next ORDERS order-worker --count 10

# Subscribe and process messages continuously
nats consumer sub ORDERS order-processor
```

### Stream Retention Policies

```bash
# Create a work queue stream (message deleted after acknowledgment)
nats stream add TASKS \
    --subjects "tasks.>" \
    --retention workqueue \
    --storage file \
    --max-msgs -1 \
    --max-age 7d

# Create an interest-based stream (message deleted when no consumers)
nats stream add EVENTS \
    --subjects "events.>" \
    --retention interest \
    --storage memory \
    --max-msgs 100000

# Create a limits-based stream with size limits
nats stream add LOGS \
    --subjects "logs.>" \
    --retention limits \
    --storage file \
    --max-bytes 5368709120 \
    --discard old
```

## Client Libraries

NATS has official client libraries for many programming languages. Here are examples for the most popular ones.

### Python Client (nats-py)

```python
#!/usr/bin/env python3
"""
NATS Python Client Example
Demonstrates pub/sub, request/reply, and JetStream

Installation:
    pip install nats-py

Documentation:
    https://github.com/nats-io/nats.py
"""

import asyncio
import json
from datetime import datetime
from nats.aio.client import Client as NATS
from nats.js.api import StreamConfig, ConsumerConfig, AckPolicy, DeliverPolicy


async def basic_pubsub_example():
    """
    Basic publish/subscribe example.
    Shows how to connect, subscribe, and publish messages.
    """
    # Create NATS client instance
    nc = NATS()

    # Connect to NATS server
    # Default URL is nats://localhost:4222
    await nc.connect(
        servers=["nats://localhost:4222"],
        reconnect_time_wait=2,  # Wait 2 seconds between reconnection attempts
        max_reconnect_attempts=5,  # Try to reconnect 5 times
        name="python-subscriber"  # Client name for monitoring
    )
    print(f"Connected to NATS at {nc.connected_url.netloc}")

    # Message counter for tracking received messages
    received_messages = []

    async def message_handler(msg):
        """
        Callback function that processes received messages.
        Called automatically when a message arrives on subscribed subject.
        """
        subject = msg.subject
        data = msg.data.decode()  # Decode bytes to string
        print(f"Received on '{subject}': {data}")
        received_messages.append(data)

    # Subscribe to a subject with wildcard
    # This will receive messages on any subject starting with "sensors."
    subscription = await nc.subscribe("sensors.>", cb=message_handler)
    print("Subscribed to 'sensors.>'")

    # Publish some test messages
    # Messages are published as bytes
    await nc.publish("sensors.temperature.room1", b"22.5")
    await nc.publish("sensors.humidity.room1", b"45")
    await nc.publish("sensors.co2.room1", b"420")

    # Give time for messages to be processed
    await asyncio.sleep(1)

    # Unsubscribe when done
    await subscription.unsubscribe()

    # Close connection gracefully
    await nc.drain()  # Drain ensures all pending messages are processed
    print(f"Total messages received: {len(received_messages)}")


async def request_reply_example():
    """
    Request/Reply pattern example.
    Shows synchronous-style communication over NATS.
    """
    nc = NATS()
    await nc.connect(servers=["nats://localhost:4222"])

    # Set up a service that responds to requests
    async def math_service(msg):
        """
        Service handler that processes math operations.
        Receives a request and sends a reply.
        """
        try:
            # Parse the request data
            data = json.loads(msg.data.decode())
            operation = data.get("operation")
            a = data.get("a", 0)
            b = data.get("b", 0)

            # Perform the calculation
            if operation == "add":
                result = a + b
            elif operation == "multiply":
                result = a * b
            elif operation == "subtract":
                result = a - b
            else:
                result = None

            # Send the response
            response = json.dumps({"result": result, "success": True})
            await msg.respond(response.encode())

        except Exception as e:
            # Send error response
            error_response = json.dumps({"error": str(e), "success": False})
            await msg.respond(error_response.encode())

    # Subscribe to handle math requests
    await nc.subscribe("math.calculate", cb=math_service)
    print("Math service is running...")

    # Make requests to the service
    # request() publishes a message and waits for a reply
    request_data = json.dumps({"operation": "add", "a": 10, "b": 20})
    response = await nc.request(
        "math.calculate",
        request_data.encode(),
        timeout=5.0  # Wait up to 5 seconds for reply
    )
    print(f"Request: {request_data}")
    print(f"Response: {response.data.decode()}")

    # Another request
    request_data = json.dumps({"operation": "multiply", "a": 7, "b": 8})
    response = await nc.request("math.calculate", request_data.encode(), timeout=5.0)
    print(f"Request: {request_data}")
    print(f"Response: {response.data.decode()}")

    await nc.drain()


async def jetstream_example():
    """
    JetStream example showing persistent messaging.
    Demonstrates streams, consumers, and exactly-once delivery.
    """
    nc = NATS()
    await nc.connect(servers=["nats://localhost:4222"])

    # Get JetStream context
    js = nc.jetstream()

    # Create or update a stream
    # Streams store messages and allow replay
    try:
        stream_config = StreamConfig(
            name="EVENTS",
            subjects=["events.>"],  # Capture all event subjects
            retention="limits",  # Keep messages based on limits
            max_msgs=10000,  # Maximum 10,000 messages
            max_age=86400,  # Messages expire after 24 hours (in seconds)
            storage="file",  # Persist to disk
            num_replicas=1  # Single replica (increase for HA)
        )
        await js.add_stream(config=stream_config)
        print("Stream 'EVENTS' created successfully")
    except Exception as e:
        print(f"Stream may already exist: {e}")

    # Publish messages to the stream
    # js.publish() returns an acknowledgment with stream info
    for i in range(5):
        event = {
            "event_id": f"EVT-{i+1:04d}",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "user.action",
            "data": {"action": "click", "element": f"button-{i}"}
        }
        ack = await js.publish(
            "events.user.action",
            json.dumps(event).encode(),
            headers={"Nats-Msg-Id": f"msg-{i}"}  # For deduplication
        )
        print(f"Published event {i+1}, stream seq: {ack.seq}")

    # Create a pull consumer
    # Pull consumers let you fetch messages on demand
    consumer_config = ConsumerConfig(
        durable_name="event-processor",  # Durable name for persistence
        ack_policy=AckPolicy.EXPLICIT,  # Must explicitly acknowledge
        deliver_policy=DeliverPolicy.ALL,  # Start from first message
        max_deliver=3,  # Retry up to 3 times
        ack_wait=30  # 30 seconds to acknowledge
    )

    try:
        await js.add_consumer("EVENTS", consumer_config)
        print("Consumer 'event-processor' created")
    except Exception as e:
        print(f"Consumer may already exist: {e}")

    # Fetch and process messages
    # Pull subscription allows batch fetching
    psub = await js.pull_subscribe("events.>", "event-processor")

    # Fetch up to 5 messages with 5 second timeout
    messages = await psub.fetch(5, timeout=5)

    for msg in messages:
        print(f"Processing: {msg.data.decode()}")
        # Acknowledge the message after processing
        await msg.ack()
        print(f"  Acknowledged seq: {msg.metadata.sequence.stream}")

    # Get stream info
    stream_info = await js.stream_info("EVENTS")
    print(f"\nStream Stats:")
    print(f"  Messages: {stream_info.state.messages}")
    print(f"  Bytes: {stream_info.state.bytes}")
    print(f"  First seq: {stream_info.state.first_seq}")
    print(f"  Last seq: {stream_info.state.last_seq}")

    await nc.drain()


async def queue_group_example():
    """
    Queue group example for load balancing.
    Multiple subscribers share the workload.
    """
    nc = NATS()
    await nc.connect(servers=["nats://localhost:4222"])

    worker_id = 1
    processed = []

    async def worker(msg):
        """Worker that processes tasks from the queue."""
        task = msg.data.decode()
        print(f"Worker {worker_id} processing: {task}")
        processed.append(task)
        await asyncio.sleep(0.1)  # Simulate work

    # Subscribe to task queue with queue group
    # Messages are distributed among workers in the same queue group
    await nc.subscribe(
        "tasks.process",
        queue="task-workers",  # Queue group name
        cb=worker
    )

    print(f"Worker {worker_id} ready (queue group: task-workers)")

    # Keep running until interrupted
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass

    await nc.drain()


if __name__ == "__main__":
    print("=" * 60)
    print("NATS Python Client Examples")
    print("=" * 60)

    # Run basic pub/sub example
    print("\n--- Basic Pub/Sub Example ---")
    asyncio.run(basic_pubsub_example())

    # Run request/reply example
    print("\n--- Request/Reply Example ---")
    asyncio.run(request_reply_example())

    # Run JetStream example
    print("\n--- JetStream Example ---")
    asyncio.run(jetstream_example())
```

### Go Client (nats.go)

```go
// NATS Go Client Example
// Demonstrates pub/sub, request/reply, and JetStream
//
// Installation:
//     go get github.com/nats-io/nats.go
//
// Documentation:
//     https://github.com/nats-io/nats.go

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
)

// Event represents an event structure for our examples
type Event struct {
	EventID   string    `json:"event_id"`
	Timestamp time.Time `json:"timestamp"`
	Type      string    `json:"type"`
	Data      any       `json:"data"`
}

func main() {
	// Run all examples
	fmt.Println("========================================")
	fmt.Println("NATS Go Client Examples")
	fmt.Println("========================================")

	basicPubSubExample()
	requestReplyExample()
	jetStreamExample()
}

// basicPubSubExample demonstrates basic publish/subscribe pattern
func basicPubSubExample() {
	fmt.Println("\n--- Basic Pub/Sub Example ---")

	// Connect to NATS server
	// nats.Connect returns a connection object and error
	nc, err := nats.Connect(
		nats.DefaultURL, // nats://localhost:4222
		nats.Name("go-pubsub-client"),                 // Client name for monitoring
		nats.ReconnectWait(2*time.Second),             // Wait between reconnects
		nats.MaxReconnects(5),                         // Max reconnection attempts
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			log.Printf("Disconnected: %v", err)
		}),
		nats.ReconnectHandler(func(_ *nats.Conn) {
			log.Println("Reconnected to NATS")
		}),
	)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer nc.Close()

	fmt.Printf("Connected to %s\n", nc.ConnectedUrl())

	// Channel to signal when messages are received
	done := make(chan bool)
	messageCount := 0

	// Subscribe to a subject with a callback
	// The callback is invoked for each received message
	sub, err := nc.Subscribe("sensors.*", func(msg *nats.Msg) {
		fmt.Printf("Received on '%s': %s\n", msg.Subject, string(msg.Data))
		messageCount++
		if messageCount >= 3 {
			done <- true
		}
	})
	if err != nil {
		log.Fatalf("Failed to subscribe: %v", err)
	}
	defer sub.Unsubscribe()

	fmt.Println("Subscribed to 'sensors.*'")

	// Publish messages to different subjects
	// Publish is fire-and-forget for Core NATS
	subjects := []string{"sensors.temperature", "sensors.humidity", "sensors.pressure"}
	values := []string{"22.5", "45", "1013.25"}

	for i, subject := range subjects {
		err := nc.Publish(subject, []byte(values[i]))
		if err != nil {
			log.Printf("Failed to publish: %v", err)
		}
		fmt.Printf("Published to '%s': %s\n", subject, values[i])
	}

	// Flush to ensure messages are sent
	nc.Flush()

	// Wait for messages to be received
	select {
	case <-done:
		fmt.Printf("Received %d messages\n", messageCount)
	case <-time.After(5 * time.Second):
		fmt.Println("Timeout waiting for messages")
	}
}

// requestReplyExample demonstrates request/reply pattern
func requestReplyExample() {
	fmt.Println("\n--- Request/Reply Example ---")

	nc, err := nats.Connect(nats.DefaultURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer nc.Close()

	// Set up a responder service
	// Subscribe creates a subscription that handles incoming requests
	_, err = nc.Subscribe("api.echo", func(msg *nats.Msg) {
		// msg.Reply contains the inbox to respond to
		response := fmt.Sprintf("Echo: %s", string(msg.Data))

		// Respond sends a reply back to the requester
		if err := msg.Respond([]byte(response)); err != nil {
			log.Printf("Failed to respond: %v", err)
		}
	})
	if err != nil {
		log.Fatalf("Failed to subscribe: %v", err)
	}

	fmt.Println("Echo service is running...")

	// Make a request and wait for reply
	// Request() is synchronous - it blocks until reply is received or timeout
	requestData := "Hello, NATS!"
	reply, err := nc.Request("api.echo", []byte(requestData), 5*time.Second)
	if err != nil {
		log.Fatalf("Request failed: %v", err)
	}

	fmt.Printf("Request: %s\n", requestData)
	fmt.Printf("Reply: %s\n", string(reply.Data))

	// JSON request/reply example
	type CalcRequest struct {
		Operation string  `json:"operation"`
		A         float64 `json:"a"`
		B         float64 `json:"b"`
	}

	type CalcResponse struct {
		Result  float64 `json:"result"`
		Success bool    `json:"success"`
	}

	// Calculator service
	_, _ = nc.Subscribe("api.calculate", func(msg *nats.Msg) {
		var req CalcRequest
		if err := json.Unmarshal(msg.Data, &req); err != nil {
			msg.Respond([]byte(`{"success": false}`))
			return
		}

		var result float64
		switch req.Operation {
		case "add":
			result = req.A + req.B
		case "multiply":
			result = req.A * req.B
		case "subtract":
			result = req.A - req.B
		default:
			msg.Respond([]byte(`{"success": false}`))
			return
		}

		resp := CalcResponse{Result: result, Success: true}
		respData, _ := json.Marshal(resp)
		msg.Respond(respData)
	})

	// Make a calculation request
	calcReq := CalcRequest{Operation: "add", A: 10, B: 20}
	reqData, _ := json.Marshal(calcReq)

	calcReply, err := nc.Request("api.calculate", reqData, 5*time.Second)
	if err != nil {
		log.Fatalf("Calculation request failed: %v", err)
	}

	var calcResp CalcResponse
	json.Unmarshal(calcReply.Data, &calcResp)
	fmt.Printf("Calculation: %v + %v = %v\n", calcReq.A, calcReq.B, calcResp.Result)
}

// jetStreamExample demonstrates JetStream persistence features
func jetStreamExample() {
	fmt.Println("\n--- JetStream Example ---")

	// Connect with JetStream enabled
	nc, err := nats.Connect(nats.DefaultURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer nc.Close()

	// Create JetStream context
	// JetStream provides persistence and exactly-once delivery
	js, err := nc.JetStream(
		nats.PublishAsyncMaxPending(256), // Max pending async publishes
	)
	if err != nil {
		log.Fatalf("Failed to get JetStream context: %v", err)
	}

	// Create or update a stream
	streamName := "GO_EVENTS"
	streamConfig := &nats.StreamConfig{
		Name:        streamName,
		Description: "Events stream for Go examples",
		Subjects:    []string{"go.events.>"},
		Retention:   nats.LimitsPolicy,    // Keep messages based on limits
		MaxMsgs:     10000,                // Max messages
		MaxAge:      24 * time.Hour,       // Max age
		Storage:     nats.FileStorage,     // Persist to disk
		Replicas:    1,                    // Number of replicas
		Discard:     nats.DiscardOld,      // Discard old messages when full
		Duplicates:  2 * time.Minute,      // Duplicate detection window
	}

	stream, err := js.AddStream(streamConfig)
	if err != nil {
		// Stream might already exist, try to update
		stream, err = js.UpdateStream(streamConfig)
		if err != nil {
			log.Fatalf("Failed to create/update stream: %v", err)
		}
	}
	fmt.Printf("Stream '%s' ready (messages: %d)\n", stream.Config.Name, stream.State.Msgs)

	// Publish messages to the stream
	// JetStream publish returns an acknowledgment
	for i := 1; i <= 5; i++ {
		event := Event{
			EventID:   fmt.Sprintf("GO-EVT-%04d", i),
			Timestamp: time.Now().UTC(),
			Type:      "go.example",
			Data:      map[string]any{"iteration": i},
		}

		eventData, _ := json.Marshal(event)

		// Publish with message ID for deduplication
		ack, err := js.Publish(
			"go.events.example",
			eventData,
			nats.MsgId(fmt.Sprintf("go-msg-%d", i)), // Deduplication ID
		)
		if err != nil {
			log.Printf("Failed to publish: %v", err)
			continue
		}

		fmt.Printf("Published event %d, stream: %s, seq: %d\n",
			i, ack.Stream, ack.Sequence)
	}

	// Create a durable consumer
	consumerName := "go-event-processor"
	consumerConfig := &nats.ConsumerConfig{
		Durable:       consumerName,           // Durable name for persistence
		AckPolicy:     nats.AckExplicitPolicy, // Require explicit acknowledgment
		DeliverPolicy: nats.DeliverAllPolicy,  // Deliver all available messages
		MaxDeliver:    3,                      // Max redelivery attempts
		AckWait:       30 * time.Second,       // Time to acknowledge
		FilterSubject: "go.events.>",          // Filter subject
	}

	consumer, err := js.AddConsumer(streamName, consumerConfig)
	if err != nil {
		// Consumer might exist, get info
		consumer, err = js.ConsumerInfo(streamName, consumerName)
		if err != nil {
			log.Fatalf("Failed to create/get consumer: %v", err)
		}
	}
	fmt.Printf("Consumer '%s' ready (pending: %d)\n",
		consumer.Config.Durable, consumer.NumPending)

	// Subscribe using pull consumer
	// Pull subscriptions let you fetch messages on demand
	sub, err := js.PullSubscribe(
		"go.events.>",
		consumerName,
		nats.Bind(streamName, consumerName), // Bind to existing consumer
	)
	if err != nil {
		log.Fatalf("Failed to create pull subscription: %v", err)
	}

	// Fetch messages in batch
	messages, err := sub.Fetch(5, nats.MaxWait(5*time.Second))
	if err != nil {
		log.Printf("Failed to fetch messages: %v", err)
	}

	fmt.Printf("\nProcessing %d messages:\n", len(messages))
	for _, msg := range messages {
		var event Event
		json.Unmarshal(msg.Data, &event)

		// Get message metadata
		meta, _ := msg.Metadata()

		fmt.Printf("  Seq %d: %s (stream: %s, consumer: %s)\n",
			meta.Sequence.Stream,
			event.EventID,
			meta.Stream,
			meta.Consumer)

		// Acknowledge the message
		// This tells JetStream the message was processed successfully
		if err := msg.Ack(); err != nil {
			log.Printf("Failed to ack: %v", err)
		}
	}

	// Get updated stream info
	streamInfo, _ := js.StreamInfo(streamName)
	fmt.Printf("\nStream Stats:\n")
	fmt.Printf("  Messages: %d\n", streamInfo.State.Msgs)
	fmt.Printf("  Bytes: %d\n", streamInfo.State.Bytes)
	fmt.Printf("  First Seq: %d\n", streamInfo.State.FirstSeq)
	fmt.Printf("  Last Seq: %d\n", streamInfo.State.LastSeq)
}
```

### Node.js Client (nats.js)

```javascript
/**
 * NATS Node.js Client Example
 * Demonstrates pub/sub, request/reply, and JetStream
 *
 * Installation:
 *     npm install nats
 *
 * Documentation:
 *     https://github.com/nats-io/nats.js
 */

const { connect, StringCodec, JSONCodec, AckPolicy, DeliverPolicy } = require('nats');

// Codecs for encoding/decoding messages
const sc = StringCodec();  // For string messages
const jc = JSONCodec();    // For JSON messages

/**
 * Basic Publish/Subscribe Example
 * Shows how to connect, subscribe, and publish messages
 */
async function basicPubSubExample() {
    console.log('\n--- Basic Pub/Sub Example ---');

    // Connect to NATS server
    // connect() returns a promise that resolves to a connection
    const nc = await connect({
        servers: ['nats://localhost:4222'],
        name: 'nodejs-pubsub-client',      // Client name for monitoring
        reconnect: true,                    // Auto-reconnect on disconnect
        reconnectTimeWait: 2000,           // Wait 2 seconds between reconnects
        maxReconnectAttempts: 5,           // Max reconnection attempts
    });

    console.log(`Connected to ${nc.getServer()}`);

    // Track received messages
    const messages = [];

    // Subscribe to a subject pattern
    // Subscription returns an async iterator
    const sub = nc.subscribe('sensors.*', {
        callback: (err, msg) => {
            if (err) {
                console.error('Subscription error:', err);
                return;
            }
            const data = sc.decode(msg.data);
            console.log(`Received on '${msg.subject}': ${data}`);
            messages.push({ subject: msg.subject, data });
        }
    });

    console.log(`Subscribed to 'sensors.*'`);

    // Publish messages
    // publish() returns void, messages are fire-and-forget
    const readings = [
        { subject: 'sensors.temperature', value: '22.5' },
        { subject: 'sensors.humidity', value: '45' },
        { subject: 'sensors.pressure', value: '1013.25' }
    ];

    for (const reading of readings) {
        nc.publish(reading.subject, sc.encode(reading.value));
        console.log(`Published to '${reading.subject}': ${reading.value}`);
    }

    // Flush to ensure messages are sent
    await nc.flush();

    // Wait for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Unsubscribe and close
    sub.unsubscribe();
    console.log(`Total messages received: ${messages.length}`);

    // Drain closes the connection gracefully
    await nc.drain();
}

/**
 * Request/Reply Example
 * Shows synchronous-style communication over NATS
 */
async function requestReplyExample() {
    console.log('\n--- Request/Reply Example ---');

    const nc = await connect({ servers: ['nats://localhost:4222'] });

    // Create a simple echo service
    // Subscribe with a callback that responds to requests
    const echoSub = nc.subscribe('api.echo', {
        callback: (err, msg) => {
            if (err) return;

            const request = sc.decode(msg.data);
            const response = `Echo: ${request}`;

            // Reply to the message if it has a reply subject
            if (msg.reply) {
                msg.respond(sc.encode(response));
            }
        }
    });

    console.log('Echo service is running...');

    // Make a request
    // request() returns a promise that resolves to the reply message
    const requestData = 'Hello, NATS!';
    const reply = await nc.request('api.echo', sc.encode(requestData), {
        timeout: 5000  // 5 second timeout
    });

    console.log(`Request: ${requestData}`);
    console.log(`Reply: ${sc.decode(reply.data)}`);

    // JSON-based calculator service
    const calcSub = nc.subscribe('api.calculate', {
        callback: (err, msg) => {
            if (err) return;

            try {
                const req = jc.decode(msg.data);
                let result;

                switch (req.operation) {
                    case 'add':
                        result = req.a + req.b;
                        break;
                    case 'multiply':
                        result = req.a * req.b;
                        break;
                    case 'subtract':
                        result = req.a - req.b;
                        break;
                    default:
                        msg.respond(jc.encode({ success: false, error: 'Unknown operation' }));
                        return;
                }

                msg.respond(jc.encode({ result, success: true }));
            } catch (e) {
                msg.respond(jc.encode({ success: false, error: e.message }));
            }
        }
    });

    // Make a calculation request
    const calcRequest = { operation: 'add', a: 10, b: 20 };
    const calcReply = await nc.request('api.calculate', jc.encode(calcRequest), {
        timeout: 5000
    });
    const calcResponse = jc.decode(calcReply.data);

    console.log(`Calculation: ${calcRequest.a} + ${calcRequest.b} = ${calcResponse.result}`);

    // Clean up
    echoSub.unsubscribe();
    calcSub.unsubscribe();
    await nc.drain();
}

/**
 * JetStream Example
 * Shows persistent messaging with streams and consumers
 */
async function jetStreamExample() {
    console.log('\n--- JetStream Example ---');

    const nc = await connect({ servers: ['nats://localhost:4222'] });

    // Get JetStream Manager for administrative operations
    const jsm = await nc.jetstreamManager();

    // Get JetStream context for publish/subscribe
    const js = nc.jetstream();

    // Stream configuration
    const streamName = 'NODE_EVENTS';
    const streamConfig = {
        name: streamName,
        description: 'Events stream for Node.js examples',
        subjects: ['node.events.>'],
        retention: 'limits',        // RetentionPolicy.Limits
        max_msgs: 10000,
        max_age: 86400000000000,   // 24 hours in nanoseconds
        storage: 'file',           // StorageType.File
        num_replicas: 1,
        discard: 'old',            // DiscardPolicy.Old
        duplicate_window: 120000000000  // 2 minutes in nanoseconds
    };

    // Create or update the stream
    try {
        await jsm.streams.add(streamConfig);
        console.log(`Stream '${streamName}' created`);
    } catch (e) {
        // Stream might exist, try to update
        try {
            await jsm.streams.update(streamName, streamConfig);
            console.log(`Stream '${streamName}' updated`);
        } catch (updateErr) {
            console.log(`Stream '${streamName}' already exists`);
        }
    }

    // Publish messages to the stream
    // JetStream publish returns a PubAck with stream information
    for (let i = 1; i <= 5; i++) {
        const event = {
            event_id: `NODE-EVT-${String(i).padStart(4, '0')}`,
            timestamp: new Date().toISOString(),
            type: 'node.example',
            data: { iteration: i }
        };

        const ack = await js.publish(
            'node.events.example',
            jc.encode(event),
            {
                msgID: `node-msg-${i}`  // For deduplication
            }
        );

        console.log(`Published event ${i}, stream: ${ack.stream}, seq: ${ack.seq}`);
    }

    // Create a durable consumer
    const consumerName = 'node-event-processor';
    const consumerConfig = {
        durable_name: consumerName,
        ack_policy: AckPolicy.Explicit,    // Require explicit acknowledgment
        deliver_policy: DeliverPolicy.All, // Deliver all available messages
        max_deliver: 3,                     // Max redelivery attempts
        ack_wait: 30000000000,             // 30 seconds in nanoseconds
        filter_subject: 'node.events.>'
    };

    try {
        await jsm.consumers.add(streamName, consumerConfig);
        console.log(`Consumer '${consumerName}' created`);
    } catch (e) {
        console.log(`Consumer '${consumerName}' may already exist`);
    }

    // Create a pull subscription
    // Pull subscriptions let you fetch messages on demand
    const psub = await js.pullSubscribe('node.events.>', {
        stream: streamName,
        config: { durable_name: consumerName }
    });

    // Fetch messages in batch
    console.log('\nFetching messages...');
    const messages = await psub.fetch({
        max_messages: 5,
        expires: 5000  // 5 second timeout
    });

    // Process messages using async iterator
    for await (const msg of messages) {
        const event = jc.decode(msg.data);
        const meta = msg.info;

        console.log(`  Seq ${meta.streamSequence}: ${event.event_id}`);

        // Acknowledge the message
        msg.ack();
    }

    // Get stream info
    const streamInfo = await jsm.streams.info(streamName);
    console.log('\nStream Stats:');
    console.log(`  Messages: ${streamInfo.state.messages}`);
    console.log(`  Bytes: ${streamInfo.state.bytes}`);
    console.log(`  First Seq: ${streamInfo.state.first_seq}`);
    console.log(`  Last Seq: ${streamInfo.state.last_seq}`);

    await nc.drain();
}

/**
 * Queue Group Example
 * Shows load balancing across multiple subscribers
 */
async function queueGroupExample() {
    console.log('\n--- Queue Group Example ---');

    const nc = await connect({ servers: ['nats://localhost:4222'] });

    const processedTasks = [];

    // Create multiple workers in the same queue group
    // Messages are distributed among workers in the group
    const worker1 = nc.subscribe('tasks.process', {
        queue: 'task-workers',  // Queue group name
        callback: (err, msg) => {
            if (err) return;
            const task = sc.decode(msg.data);
            console.log(`Worker 1 processing: ${task}`);
            processedTasks.push({ worker: 1, task });
        }
    });

    const worker2 = nc.subscribe('tasks.process', {
        queue: 'task-workers',
        callback: (err, msg) => {
            if (err) return;
            const task = sc.decode(msg.data);
            console.log(`Worker 2 processing: ${task}`);
            processedTasks.push({ worker: 2, task });
        }
    });

    console.log('Workers ready (queue group: task-workers)');

    // Publish tasks
    for (let i = 1; i <= 10; i++) {
        nc.publish('tasks.process', sc.encode(`Task-${i}`));
    }

    await nc.flush();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Count tasks per worker
    const worker1Count = processedTasks.filter(t => t.worker === 1).length;
    const worker2Count = processedTasks.filter(t => t.worker === 2).length;

    console.log(`\nTask distribution:`);
    console.log(`  Worker 1: ${worker1Count} tasks`);
    console.log(`  Worker 2: ${worker2Count} tasks`);

    worker1.unsubscribe();
    worker2.unsubscribe();
    await nc.drain();
}

// Main execution
async function main() {
    console.log('========================================');
    console.log('NATS Node.js Client Examples');
    console.log('========================================');

    try {
        await basicPubSubExample();
        await requestReplyExample();
        await jetStreamExample();
        await queueGroupExample();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
```

## Authentication

NATS supports multiple authentication mechanisms. Here are the most common configurations.

### Token Authentication

Simple shared token authentication:

```bash
# Edit the NATS configuration
sudo nano /etc/nats/nats-server.conf
```

Add authentication configuration:

```hcl
# /etc/nats/nats-server.conf

# Simple token authentication
# All clients must provide this token to connect
authorization {
    token: "s3cr3t_t0k3n_h3r3"
}
```

Connect with token:

```bash
# Using NATS CLI with token
nats pub test "Hello" --server nats://s3cr3t_t0k3n_h3r3@localhost:4222

# Or using the --creds flag
nats pub test "Hello" -s nats://localhost:4222 --user "" --password "s3cr3t_t0k3n_h3r3"
```

### Username/Password Authentication

```hcl
# /etc/nats/nats-server.conf

# Multiple users with different permissions
authorization {
    # Default permissions for users without explicit permissions
    default_permissions {
        publish = ["public.>"]
        subscribe = ["public.>"]
    }

    users = [
        # Admin user with full access
        {
            user: "admin"
            password: "$2a$11$..."  # Use nats-server --gen-password to generate
            permissions: {
                publish: ">"      # Can publish to any subject
                subscribe: ">"    # Can subscribe to any subject
            }
        }

        # Publisher user - can only publish to specific subjects
        {
            user: "publisher"
            password: "$2a$11$..."
            permissions: {
                publish: ["events.>", "logs.>"]
                subscribe: ["_INBOX.>"]  # For request/reply
            }
        }

        # Subscriber user - read-only access
        {
            user: "subscriber"
            password: "$2a$11$..."
            permissions: {
                publish: ["_INBOX.>"]
                subscribe: ["events.>", "notifications.>"]
            }
        }

        # Service user - specific service permissions
        {
            user: "order-service"
            password: "$2a$11$..."
            permissions: {
                publish: ["orders.>", "_INBOX.>"]
                subscribe: ["orders.>", "inventory.>"]
                # Allow responses to any reply subject
                allow_responses: true
            }
        }
    ]
}
```

Generate password hashes:

```bash
# Generate a bcrypt password hash
nats-server --gen-password
# Enter your password when prompted
# Copy the generated hash to your config
```

### NKey Authentication

NKeys provide public-key authentication without transmitting secrets:

```bash
# Install nk tool for generating keys
go install github.com/nats-io/nkeys/nk@latest

# Generate a user key pair
nk -gen user -pubout
# Output:
# SUACSSL3UAHUDXKFSNVUZRF5UHPMWZ6BFDTJ7M6USDXIEDNPPQYYYCU3VY  (seed - keep secret)
# UAHJZJFBSE3LN3JGVLWKTXA4UNLJY5LYYG4LRHXN5JJJHQSXGDNX3KRZ  (public key)

# Generate an operator key (for system administration)
nk -gen operator -pubout
```

Configure NKey authentication:

```hcl
# /etc/nats/nats-server.conf

authorization {
    users = [
        # User authenticated by NKey public key
        {
            # Public key (starts with U for user)
            nkey: "UAHJZJFBSE3LN3JGVLWKTXA4UNLJY5LYYG4LRHXN5JJJHQSXGDNX3KRZ"
            permissions: {
                publish: ["app.>"]
                subscribe: ["app.>", "_INBOX.>"]
            }
        }
    ]
}
```

### JWT/Account-Based Authentication

For multi-tenant environments, use accounts with JWTs:

```bash
# Install nsc (NATS Security CLI)
curl -L https://github.com/nats-io/nsc/releases/download/v2.8.6/nsc-linux-amd64.zip -o nsc.zip
unzip nsc.zip
sudo mv nsc /usr/local/bin/

# Initialize NSC
nsc init -n MyOrg

# Create an operator
nsc add operator MyOperator

# Create an account
nsc add account MyAccount

# Create a user
nsc add user MyUser

# Generate credentials file
nsc generate creds -a MyAccount -n MyUser > myuser.creds
```

Configure account resolver:

```hcl
# /etc/nats/nats-server.conf

# Operator JWT
operator: /etc/nats/operator.jwt

# System account (for monitoring)
system_account: ACSYSTEM...

# Account resolver - where to find account JWTs
resolver: {
    type: full
    dir: "/etc/nats/jwt"
    allow_delete: false
    interval: "2m"
}
```

## Clustering and High Availability

NATS supports clustering for high availability and scalability. Messages published to any server are routed to subscribers on all servers.

### Basic Cluster Configuration

Configure three NATS servers to form a cluster:

**Server 1 (nats-1.conf):**

```hcl
# /etc/nats/nats-1.conf
# NATS Server 1 Configuration

server_name: "nats-1"
port: 4222
http_port: 8222

# Cluster configuration
cluster {
    name: "nats-cluster"
    port: 6222

    # Routes to other servers in the cluster
    routes = [
        nats://nats-2.example.com:6222
        nats://nats-3.example.com:6222
    ]

    # Cluster authorization (optional but recommended)
    authorization {
        user: cluster_user
        password: cluster_secret_password
        timeout: 2
    }
}

# JetStream with cluster-aware configuration
jetstream {
    store_dir: "/var/lib/nats/jetstream"
    max_mem: 1G
    max_file: 10G
}

# Logging
log_file: "/var/log/nats/nats-server.log"
```

**Server 2 (nats-2.conf):**

```hcl
# /etc/nats/nats-2.conf
server_name: "nats-2"
port: 4222
http_port: 8222

cluster {
    name: "nats-cluster"
    port: 6222

    routes = [
        nats://nats-1.example.com:6222
        nats://nats-3.example.com:6222
    ]

    authorization {
        user: cluster_user
        password: cluster_secret_password
        timeout: 2
    }
}

jetstream {
    store_dir: "/var/lib/nats/jetstream"
    max_mem: 1G
    max_file: 10G
}

log_file: "/var/log/nats/nats-server.log"
```

**Server 3 (nats-3.conf):**

```hcl
# /etc/nats/nats-3.conf
server_name: "nats-3"
port: 4222
http_port: 8222

cluster {
    name: "nats-cluster"
    port: 6222

    routes = [
        nats://nats-1.example.com:6222
        nats://nats-2.example.com:6222
    ]

    authorization {
        user: cluster_user
        password: cluster_secret_password
        timeout: 2
    }
}

jetstream {
    store_dir: "/var/lib/nats/jetstream"
    max_mem: 1G
    max_file: 10G
}

log_file: "/var/log/nats/nats-server.log"
```

### JetStream Replication

For JetStream high availability, configure stream replication:

```bash
# Create a replicated stream
nats stream add ORDERS \
    --subjects "orders.>" \
    --retention limits \
    --storage file \
    --max-msgs 1000000 \
    --replicas 3  # Replicate across 3 servers
```

### Verify Cluster Status

```bash
# Check cluster status
nats server info

# List all servers in the cluster
nats server list

# Check cluster routes
nats server report jetstream

# View cluster health
curl http://localhost:8222/varz | jq '.cluster'
```

### Client Connection with Cluster Failover

```python
# Python client with cluster failover
import asyncio
from nats.aio.client import Client as NATS

async def cluster_client():
    nc = NATS()

    # Connect with multiple servers for failover
    await nc.connect(
        servers=[
            "nats://nats-1.example.com:4222",
            "nats://nats-2.example.com:4222",
            "nats://nats-3.example.com:4222"
        ],
        reconnect_time_wait=2,
        max_reconnect_attempts=-1,  # Infinite reconnects
        name="cluster-client"
    )

    print(f"Connected to {nc.connected_url.netloc}")

    # Client will automatically failover to another server
    # if the current connection is lost

    await nc.drain()

asyncio.run(cluster_client())
```

## NATS CLI Tools

The NATS CLI provides powerful tools for administration and debugging.

### Essential Commands

```bash
# ============================================================
# Connection and Server Information
# ============================================================

# Check connection to NATS server
nats server ping

# View server information
nats server info

# List all servers (in cluster)
nats server list

# Check server health
nats server check connection

# ============================================================
# Publishing and Subscribing
# ============================================================

# Subscribe to a subject
nats sub "events.>"

# Subscribe with queue group
nats sub --queue workers "tasks.>"

# Publish a message
nats pub events.user.login '{"user": "john", "ip": "192.168.1.1"}'

# Publish with headers
nats pub --header "X-Request-ID:12345" events.test "Hello"

# Request/Reply
nats request api.users.get '{"id": 1}' --timeout 5s

# Reply to requests (service mode)
nats reply api.ping "PONG"

# ============================================================
# Stream Management
# ============================================================

# List all streams
nats stream ls

# Create a stream interactively
nats stream add

# Create a stream with options
nats stream add ORDERS \
    --subjects "orders.>" \
    --retention limits \
    --storage file \
    --max-msgs 1000000 \
    --max-age 24h \
    --max-bytes 1G \
    --replicas 1

# View stream information
nats stream info ORDERS

# View stream configuration
nats stream config ORDERS

# View messages in a stream
nats stream view ORDERS

# Get a specific message by sequence
nats stream get ORDERS 42

# Purge all messages from a stream
nats stream purge ORDERS

# Delete a stream
nats stream rm ORDERS

# Stream report (statistics)
nats stream report

# ============================================================
# Consumer Management
# ============================================================

# List consumers for a stream
nats consumer ls ORDERS

# Create a consumer interactively
nats consumer add ORDERS

# Create a pull consumer
nats consumer add ORDERS order-processor \
    --pull \
    --ack explicit \
    --deliver all \
    --max-deliver 3 \
    --ack-wait 30s

# View consumer information
nats consumer info ORDERS order-processor

# Fetch next message from consumer
nats consumer next ORDERS order-processor

# Fetch multiple messages
nats consumer next ORDERS order-processor --count 10

# Subscribe to a consumer
nats consumer sub ORDERS order-processor

# Delete a consumer
nats consumer rm ORDERS order-processor

# ============================================================
# Account and Context Management
# ============================================================

# List available contexts
nats context ls

# Create a context for a specific server
nats context add production \
    --server nats://prod.example.com:4222 \
    --description "Production NATS cluster"

# Select a context
nats context select production

# Show current context
nats context info

# ============================================================
# Benchmarking
# ============================================================

# Benchmark publishing
nats bench test --pub 1 --msgs 1000000 --size 128

# Benchmark subscribe
nats bench test --sub 1 --msgs 1000000

# Benchmark request/reply
nats bench test --pub 1 --sub 1 --msgs 10000 --request

# ============================================================
# Monitoring and Debugging
# ============================================================

# Watch all messages on a subject
nats sub ">" --trace

# Event monitoring
nats events

# Latency testing
nats rtt
```

### Creating Shell Aliases

For convenience, create aliases for common operations:

```bash
# Add to ~/.bashrc or ~/.zshrc

# NATS aliases
alias ns='nats server'
alias nst='nats stream'
alias nc='nats consumer'
alias np='nats pub'
alias nsub='nats sub'
alias nreq='nats request'

# Quick stream info
alias nstls='nats stream ls'
alias nstreport='nats stream report'

# Quick consumer commands
alias ncls='nats consumer ls'
alias ncnext='nats consumer next'

# Server health check
alias nhealth='nats server ping && nats server check connection'
```

## Monitoring NATS

Monitoring is essential for production NATS deployments. NATS provides several monitoring endpoints and integrations.

### HTTP Monitoring Endpoints

NATS exposes monitoring endpoints on the HTTP port (default 8222):

```bash
# General server information
curl http://localhost:8222/varz | jq

# Connection information
curl http://localhost:8222/connz | jq

# Routing information (cluster)
curl http://localhost:8222/routez | jq

# Gateway information (super-cluster)
curl http://localhost:8222/gatewayz | jq

# Subscription information
curl http://localhost:8222/subsz | jq

# JetStream information
curl http://localhost:8222/jsz | jq

# Account information
curl http://localhost:8222/accountz | jq

# Health check endpoint
curl http://localhost:8222/healthz
```

### Key Metrics to Monitor

```bash
# Create a monitoring script
cat << 'EOF' > /usr/local/bin/nats-metrics.sh
#!/bin/bash
# NATS Metrics Collection Script
# Run periodically via cron for monitoring

NATS_HOST="${NATS_HOST:-localhost}"
NATS_HTTP_PORT="${NATS_HTTP_PORT:-8222}"
METRICS_FILE="/var/log/nats/metrics.log"

# Fetch metrics
VARZ=$(curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/varz")
CONNZ=$(curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/connz")
JSZ=$(curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/jsz")

# Extract key metrics
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CONNECTIONS=$(echo "$VARZ" | jq -r '.connections // 0')
TOTAL_CONNECTIONS=$(echo "$VARZ" | jq -r '.total_connections // 0')
IN_MSGS=$(echo "$VARZ" | jq -r '.in_msgs // 0')
OUT_MSGS=$(echo "$VARZ" | jq -r '.out_msgs // 0')
IN_BYTES=$(echo "$VARZ" | jq -r '.in_bytes // 0')
OUT_BYTES=$(echo "$VARZ" | jq -r '.out_bytes // 0')
SLOW_CONSUMERS=$(echo "$VARZ" | jq -r '.slow_consumers // 0')
SUBSCRIPTIONS=$(echo "$VARZ" | jq -r '.subscriptions // 0')
MEM_USAGE=$(echo "$VARZ" | jq -r '.mem // 0')
CPU_USAGE=$(echo "$VARZ" | jq -r '.cpu // 0')

# JetStream metrics
JS_STREAMS=$(echo "$JSZ" | jq -r '.streams // 0')
JS_CONSUMERS=$(echo "$JSZ" | jq -r '.consumers // 0')
JS_MESSAGES=$(echo "$JSZ" | jq -r '.messages // 0')
JS_BYTES=$(echo "$JSZ" | jq -r '.bytes // 0')

# Log metrics
echo "${TIMESTAMP},${CONNECTIONS},${IN_MSGS},${OUT_MSGS},${IN_BYTES},${OUT_BYTES},${SLOW_CONSUMERS},${SUBSCRIPTIONS},${MEM_USAGE},${CPU_USAGE},${JS_STREAMS},${JS_CONSUMERS},${JS_MESSAGES},${JS_BYTES}" >> "$METRICS_FILE"

# Alert on slow consumers (indicates backpressure)
if [ "$SLOW_CONSUMERS" -gt 0 ]; then
    echo "WARNING: ${SLOW_CONSUMERS} slow consumers detected at ${TIMESTAMP}"
fi

# Alert on high memory usage (>80% of max)
MAX_MEM=$(echo "$VARZ" | jq -r '.max_memory // 0')
if [ "$MAX_MEM" -gt 0 ]; then
    MEM_PCT=$((MEM_USAGE * 100 / MAX_MEM))
    if [ "$MEM_PCT" -gt 80 ]; then
        echo "WARNING: Memory usage at ${MEM_PCT}% at ${TIMESTAMP}"
    fi
fi
EOF

chmod +x /usr/local/bin/nats-metrics.sh

# Add to crontab (every minute)
# crontab -e
# * * * * * /usr/local/bin/nats-metrics.sh
```

### Prometheus Integration

NATS can export metrics in Prometheus format using the NATS Prometheus Exporter:

```bash
# Install Prometheus NATS Exporter
wget https://github.com/nats-io/prometheus-nats-exporter/releases/download/v0.15.0/prometheus-nats-exporter-v0.15.0-linux-amd64.tar.gz
tar -xzf prometheus-nats-exporter-v0.15.0-linux-amd64.tar.gz
sudo mv prometheus-nats-exporter /usr/local/bin/

# Run the exporter
prometheus-nats-exporter \
    -varz "http://localhost:8222" \
    -connz "http://localhost:8222" \
    -jsz "http://localhost:8222" \
    -port 7777

# Prometheus metrics available at http://localhost:7777/metrics
```

Create a systemd service for the exporter:

```bash
sudo nano /etc/systemd/system/nats-exporter.service
```

```ini
[Unit]
Description=Prometheus NATS Exporter
After=nats-server.service

[Service]
User=nats
ExecStart=/usr/local/bin/prometheus-nats-exporter \
    -varz "http://localhost:8222" \
    -connz "http://localhost:8222" \
    -jsz "http://localhost:8222" \
    -port 7777
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Grafana Dashboard

Create a Grafana dashboard for NATS metrics. Here's a sample dashboard JSON snippet:

```json
{
  "title": "NATS Server Dashboard",
  "panels": [
    {
      "title": "Active Connections",
      "type": "stat",
      "targets": [
        {
          "expr": "nats_varz_connections",
          "legendFormat": "Connections"
        }
      ]
    },
    {
      "title": "Message Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(nats_varz_in_msgs[5m])",
          "legendFormat": "Incoming"
        },
        {
          "expr": "rate(nats_varz_out_msgs[5m])",
          "legendFormat": "Outgoing"
        }
      ]
    },
    {
      "title": "JetStream Storage",
      "type": "gauge",
      "targets": [
        {
          "expr": "nats_jsz_bytes",
          "legendFormat": "Used"
        }
      ]
    },
    {
      "title": "Slow Consumers",
      "type": "stat",
      "targets": [
        {
          "expr": "nats_varz_slow_consumers",
          "legendFormat": "Count"
        }
      ]
    }
  ]
}
```

### Health Check Script

Create a comprehensive health check script:

```bash
cat << 'EOF' > /usr/local/bin/nats-healthcheck.sh
#!/bin/bash
# NATS Health Check Script
# Returns 0 if healthy, 1 if unhealthy

set -e

NATS_HOST="${NATS_HOST:-localhost}"
NATS_HTTP_PORT="${NATS_HTTP_PORT:-8222}"
NATS_PORT="${NATS_PORT:-4222}"

echo "=== NATS Health Check ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Check HTTP endpoint
echo "1. Checking HTTP endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${NATS_HOST}:${NATS_HTTP_PORT}/healthz")
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "   HTTP endpoint: OK"
else
    echo "   HTTP endpoint: FAILED (status: $HTTP_STATUS)"
    exit 1
fi

# Check client port
echo "2. Checking client port..."
if nc -z "$NATS_HOST" "$NATS_PORT" 2>/dev/null; then
    echo "   Client port: OK"
else
    echo "   Client port: FAILED"
    exit 1
fi

# Check server info
echo "3. Checking server info..."
VARZ=$(curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/varz")
SERVER_NAME=$(echo "$VARZ" | jq -r '.server_name // "unknown"')
VERSION=$(echo "$VARZ" | jq -r '.version // "unknown"')
UPTIME=$(echo "$VARZ" | jq -r '.uptime // "unknown"')
echo "   Server: $SERVER_NAME"
echo "   Version: $VERSION"
echo "   Uptime: $UPTIME"

# Check JetStream
echo "4. Checking JetStream..."
JSZ=$(curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/jsz")
JS_ENABLED=$(echo "$JSZ" | jq -r '.disabled // true')
if [ "$JS_ENABLED" = "false" ] || [ "$JS_ENABLED" = "null" ]; then
    STREAMS=$(echo "$JSZ" | jq -r '.streams // 0')
    CONSUMERS=$(echo "$JSZ" | jq -r '.consumers // 0')
    echo "   JetStream: Enabled"
    echo "   Streams: $STREAMS"
    echo "   Consumers: $CONSUMERS"
else
    echo "   JetStream: Disabled or not configured"
fi

# Check for slow consumers
echo "5. Checking for issues..."
SLOW_CONSUMERS=$(echo "$VARZ" | jq -r '.slow_consumers // 0')
if [ "$SLOW_CONSUMERS" -gt 0 ]; then
    echo "   WARNING: $SLOW_CONSUMERS slow consumers detected"
fi

# Check cluster status
CLUSTER_INFO=$(curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/routez")
ROUTES=$(echo "$CLUSTER_INFO" | jq -r '.num_routes // 0')
if [ "$ROUTES" -gt 0 ]; then
    echo "6. Cluster status..."
    echo "   Connected routes: $ROUTES"
fi

echo ""
echo "=== Health Check Complete: HEALTHY ==="
exit 0
EOF

chmod +x /usr/local/bin/nats-healthcheck.sh
```

## Troubleshooting

### Common Issues and Solutions

**Issue: Connection refused**

```bash
# Check if NATS is running
systemctl status nats-server

# Check if port is listening
ss -tlnp | grep 4222

# Check firewall rules
sudo ufw status
sudo ufw allow 4222/tcp  # If needed
```

**Issue: Authentication failures**

```bash
# Test with debug logging
nats-server -c /etc/nats/nats-server.conf -DV

# Verify credentials
nats server ping --user admin --password your_password
```

**Issue: Slow consumers**

```bash
# Check for slow consumers
curl http://localhost:8222/connz?subs=1 | jq '.connections[] | select(.slow_consumer == true)'

# Identify problematic subscriptions
nats server report connections --sort pending
```

**Issue: JetStream storage full**

```bash
# Check JetStream storage
nats server report jetstream

# Purge old messages from a stream
nats stream purge ORDERS --keep 10000

# Delete old streams
nats stream rm OLD_STREAM
```

**Issue: Cluster not forming**

```bash
# Check cluster routes
curl http://localhost:8222/routez | jq

# Verify cluster configuration
nats-server -c /etc/nats/nats-server.conf --dry-run

# Check logs for route errors
journalctl -u nats-server | grep -i route
```

### Debug Logging

Enable debug logging temporarily:

```bash
# Send SIGUSR1 to toggle debug logging
sudo kill -SIGUSR1 $(cat /var/run/nats/nats-server.pid)

# Or restart with debug enabled
sudo systemctl stop nats-server
nats-server -c /etc/nats/nats-server.conf -DV

# Check logs
tail -f /var/log/nats/nats-server.log
```

## Conclusion

NATS is a powerful, lightweight messaging system that excels in cloud-native and microservices environments. In this guide, we covered:

- **Installation**: Multiple methods to install NATS on Ubuntu
- **Configuration**: Comprehensive configuration file with explanations
- **Core NATS**: Basic publish/subscribe and request/reply patterns
- **JetStream**: Persistence, streams, and consumers for durable messaging
- **Client Libraries**: Examples in Python, Go, and Node.js
- **Authentication**: Token, username/password, and NKey authentication
- **Clustering**: High availability configuration
- **CLI Tools**: Essential commands for administration
- **Monitoring**: HTTP endpoints, Prometheus integration, and health checks

NATS's simplicity, performance, and reliability make it an excellent choice for building distributed systems. Whether you're building microservices, IoT applications, or real-time data pipelines, NATS provides the messaging infrastructure you need.

## Monitor Your NATS Infrastructure with OneUptime

While setting up and configuring NATS is important, monitoring its health and performance in production is equally critical. [OneUptime](https://oneuptime.com) provides comprehensive monitoring solutions that can help you:

- **Uptime Monitoring**: Monitor NATS server availability and get instant alerts when servers become unreachable
- **Performance Metrics**: Track message rates, connection counts, and JetStream storage usage
- **Custom Health Checks**: Create custom health check scripts that verify NATS cluster health
- **Alert Management**: Configure intelligent alerting with escalation policies to ensure issues are addressed promptly
- **Incident Management**: Track and manage incidents when NATS issues occur
- **Status Pages**: Keep your users informed about NATS-dependent service status

With OneUptime, you can ensure your NATS messaging infrastructure remains healthy and performant, catching issues before they impact your applications and users.

# How to Run EMQX MQTT Broker in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, EMQX, MQTT, IoT, Message Queues, DevOps

Description: Set up the EMQX MQTT broker in Docker for IoT messaging with clustering, authentication, and WebSocket support.

---

EMQX is one of the most widely deployed MQTT brokers in the world. It handles millions of concurrent connections, making it the go-to choice for IoT platforms, connected vehicles, and real-time messaging systems. EMQX supports MQTT 3.1, 3.1.1, and 5.0 protocols along with WebSocket connections, which means it works with everything from tiny microcontrollers to web browsers.

Running EMQX in Docker lets you set up a complete MQTT infrastructure in minutes. This guide covers single-node development setups, cluster configurations, and production-ready deployments.

## Quick Start

Get EMQX running with a single command:

```bash
# Start EMQX with the dashboard exposed
docker run -d \
  --name emqx \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 8883:8883 \
  -p 18083:18083 \
  emqx/emqx:5.7
```

Here is what each port does:

- **1883** - MQTT TCP listener (standard MQTT)
- **8083** - MQTT WebSocket listener
- **8084** - MQTT WebSocket Secure (WSS) listener
- **8883** - MQTT over TLS/SSL
- **18083** - EMQX Dashboard (web management UI)

Access the dashboard at `http://localhost:18083`. The default credentials are `admin` / `public`.

## Docker Compose Setup

For a proper development environment, use Docker Compose:

```yaml
# docker-compose.yml - EMQX MQTT broker for development
version: "3.8"

services:
  emqx:
    image: emqx/emqx:5.7
    ports:
      # Standard MQTT protocol
      - "1883:1883"
      # MQTT over WebSocket
      - "8083:8083"
      # MQTT over WebSocket Secure
      - "8084:8084"
      # MQTT over TLS
      - "8883:8883"
      # Dashboard web UI
      - "18083:18083"
    volumes:
      # Persist EMQX data (retained messages, sessions, etc.)
      - emqx_data:/opt/emqx/data
      # Persist logs
      - emqx_log:/opt/emqx/log
    environment:
      # Set the node name for clustering
      EMQX_NAME: emqx
      # Set the dashboard admin password
      EMQX_DASHBOARD__DEFAULT_PASSWORD: "my_secure_password"
    healthcheck:
      test: ["CMD", "emqx", "ctl", "status"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  emqx_data:
  emqx_log:
```

Start the broker:

```bash
# Launch EMQX
docker compose up -d

# Verify the broker is running
docker compose exec emqx emqx ctl status
```

## Testing with MQTT Clients

Install the `mosquitto-clients` package or use the `eclipse-mosquitto` Docker image to test:

```bash
# Subscribe to a topic in one terminal
docker run --rm -it --network host eclipse-mosquitto \
  mosquitto_sub -h localhost -p 1883 -t "sensors/temperature" -v

# Publish a message in another terminal
docker run --rm --network host eclipse-mosquitto \
  mosquitto_pub -h localhost -p 1883 -t "sensors/temperature" -m '{"value": 23.5, "unit": "celsius"}'
```

You can also test using Python with the `paho-mqtt` library:

```python
# mqtt_publisher.py - Publish sensor data to EMQX
import paho.mqtt.client as mqtt
import json
import time
import random

# Connect to EMQX broker
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="sensor-001")
client.connect("localhost", 1883, 60)

# Publish simulated temperature readings every 2 seconds
while True:
    payload = json.dumps({
        "sensor_id": "sensor-001",
        "temperature": round(random.uniform(18.0, 30.0), 1),
        "humidity": round(random.uniform(40.0, 80.0), 1),
        "timestamp": time.time()
    })
    client.publish("sensors/room1/data", payload, qos=1)
    print(f"Published: {payload}")
    time.sleep(2)
```

```python
# mqtt_subscriber.py - Subscribe to sensor data from EMQX
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc, properties):
    print(f"Connected with result code {rc}")
    # Subscribe to all sensor topics using a wildcard
    client.subscribe("sensors/#", qos=1)

def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())
    print(f"Topic: {msg.topic} | Data: {data}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="data-collector")
client.on_connect = on_connect
client.on_message = on_message

client.connect("localhost", 1883, 60)
client.loop_forever()
```

## Configuring Authentication

By default, EMQX allows anonymous connections. For production, you should enable authentication. EMQX supports several authentication backends.

Configure password-based authentication via environment variables:

```yaml
# docker-compose.yml - EMQX with built-in authentication
version: "3.8"

services:
  emqx:
    image: emqx/emqx:5.7
    ports:
      - "1883:1883"
      - "8083:8083"
      - "18083:18083"
    volumes:
      - emqx_data:/opt/emqx/data
    environment:
      EMQX_NAME: emqx
      # Disable anonymous access
      EMQX_ALLOW_ANONYMOUS: "false"
      EMQX_DASHBOARD__DEFAULT_PASSWORD: "admin_password"
    restart: unless-stopped

volumes:
  emqx_data:
```

After starting, use the REST API to add users:

```bash
# Add an MQTT user via the EMQX REST API
curl -s -X POST http://localhost:18083/api/v5/authentication \
  -H "Content-Type: application/json" \
  -u "admin:admin_password" \
  -d '{
    "mechanism": "password_based",
    "backend": "built_in_database",
    "user_id_type": "username",
    "password_hash_algorithm": {
      "name": "sha256",
      "salt_position": "suffix"
    }
  }'

# Add a user to the built-in database
curl -s -X POST http://localhost:18083/api/v5/authentication/password_based:built_in_database/users \
  -H "Content-Type: application/json" \
  -u "admin:admin_password" \
  -d '{
    "user_id": "device001",
    "password": "device_secret"
  }'
```

## Setting Up an EMQX Cluster

For high availability and higher throughput, run multiple EMQX nodes as a cluster:

```yaml
# docker-compose-cluster.yml - Three-node EMQX cluster
version: "3.8"

services:
  emqx1:
    image: emqx/emqx:5.7
    hostname: emqx1
    environment:
      EMQX_NAME: emqx
      EMQX_HOST: emqx1
      EMQX_CLUSTER__DISCOVERY_STRATEGY: static
      EMQX_CLUSTER__STATIC__SEEDS: "[emqx@emqx1,emqx@emqx2,emqx@emqx3]"
      EMQX_DASHBOARD__DEFAULT_PASSWORD: "admin123"
    ports:
      - "1883:1883"
      - "18083:18083"
    volumes:
      - emqx1_data:/opt/emqx/data
    networks:
      - emqx-net

  emqx2:
    image: emqx/emqx:5.7
    hostname: emqx2
    environment:
      EMQX_NAME: emqx
      EMQX_HOST: emqx2
      EMQX_CLUSTER__DISCOVERY_STRATEGY: static
      EMQX_CLUSTER__STATIC__SEEDS: "[emqx@emqx1,emqx@emqx2,emqx@emqx3]"
    volumes:
      - emqx2_data:/opt/emqx/data
    networks:
      - emqx-net

  emqx3:
    image: emqx/emqx:5.7
    hostname: emqx3
    environment:
      EMQX_NAME: emqx
      EMQX_HOST: emqx3
      EMQX_CLUSTER__DISCOVERY_STRATEGY: static
      EMQX_CLUSTER__STATIC__SEEDS: "[emqx@emqx1,emqx@emqx2,emqx@emqx3]"
    volumes:
      - emqx3_data:/opt/emqx/data
    networks:
      - emqx-net

networks:
  emqx-net:

volumes:
  emqx1_data:
  emqx2_data:
  emqx3_data:
```

Verify the cluster formed correctly:

```bash
# Check cluster status from any node
docker compose exec emqx1 emqx ctl cluster status
```

## EMQX with Data Integration

EMQX has a built-in rule engine that can forward MQTT messages to databases and other services. Here is an example with PostgreSQL:

```yaml
# docker-compose.yml - EMQX with PostgreSQL for data persistence
version: "3.8"

services:
  emqx:
    image: emqx/emqx:5.7
    ports:
      - "1883:1883"
      - "18083:18083"
    volumes:
      - emqx_data:/opt/emqx/data
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - iot-network

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: iot_data
      POSTGRES_USER: emqx
      POSTGRES_PASSWORD: emqx_secret
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emqx -d iot_data"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - iot-network

networks:
  iot-network:

volumes:
  emqx_data:
  pg_data:
```

Create the database schema for storing sensor data:

```sql
-- init.sql - Create tables for IoT data storage
CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sensor_data_client ON sensor_data(client_id);
CREATE INDEX idx_sensor_data_topic ON sensor_data(topic);
```

## Useful Management Commands

```bash
# View connected clients
docker compose exec emqx emqx ctl clients list

# View active subscriptions
docker compose exec emqx emqx ctl subscriptions list

# View broker metrics
docker compose exec emqx emqx ctl metrics

# View topic statistics
docker compose exec emqx emqx ctl topics list

# Kick a specific client
docker compose exec emqx emqx ctl clients kick "device001"
```

## Summary

EMQX is a production-grade MQTT broker that runs smoothly in Docker. Its built-in dashboard, rule engine, and clustering support make it significantly more feature-rich than lightweight alternatives. For IoT projects, EMQX handles the full lifecycle from device authentication through message routing to data persistence, all configurable through its web dashboard or REST API. Start with the single-node Docker Compose setup for development, and move to the cluster configuration when you need high availability.

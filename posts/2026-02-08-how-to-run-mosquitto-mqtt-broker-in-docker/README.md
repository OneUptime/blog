# How to Run Mosquitto MQTT Broker in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Mosquitto, MQTT, IoT, Message Queues, DevOps

Description: Deploy the Eclipse Mosquitto MQTT broker in Docker with authentication, TLS encryption, and persistent message storage.

---

Eclipse Mosquitto is a lightweight, open-source MQTT message broker. It implements MQTT protocol versions 5.0, 3.1.1, and 3.1, and it is the most popular MQTT broker for small-to-medium deployments. Mosquitto uses minimal resources, making it suitable for running on everything from a Raspberry Pi to a cloud server.

Docker makes Mosquitto deployment predictable and portable. This guide walks through setting up Mosquitto in Docker, from a basic development configuration to a secured production setup with authentication and TLS.

## Quick Start

Run Mosquitto with default settings:

```bash
# Start Mosquitto with default configuration
docker run -d \
  --name mosquitto \
  -p 1883:1883 \
  -p 9001:9001 \
  eclipse-mosquitto:2
```

Port 1883 handles standard MQTT connections. Port 9001 is for MQTT over WebSockets.

However, Mosquitto 2.x requires explicit configuration to allow connections. Without a config file, it only listens on localhost inside the container. Let's set it up properly.

## Project Structure

Create the directory structure for Mosquitto configuration and data:

```bash
# Create project directories
mkdir -p mosquitto-docker/{config,data,log}
```

## Basic Configuration

Create the Mosquitto configuration file:

```
# mosquitto-docker/config/mosquitto.conf - Basic Mosquitto configuration

# Listen on all interfaces for standard MQTT
listener 1883
protocol mqtt

# WebSocket listener on port 9001
listener 9001
protocol websockets

# Allow anonymous connections (development only)
allow_anonymous true

# Persistence settings - retain messages across restarts
persistence true
persistence_location /mosquitto/data/

# Log settings
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type all
```

## Docker Compose Setup

```yaml
# docker-compose.yml - Mosquitto MQTT broker
version: "3.8"

services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      # Standard MQTT protocol
      - "1883:1883"
      # MQTT over WebSocket
      - "9001:9001"
    volumes:
      # Mount configuration file
      - ./config/mosquitto.conf:/mosquitto/config/mosquitto.conf
      # Persist message data
      - ./data:/mosquitto/data
      # Persist log files
      - ./log:/mosquitto/log
    restart: unless-stopped
```

Start the broker:

```bash
# Launch Mosquitto
docker compose up -d

# Check the logs
docker compose logs -f mosquitto
```

## Testing the Broker

Test publish and subscribe using the Mosquitto command-line tools:

```bash
# Open a subscriber in one terminal - listens to all topics under "home/"
docker exec mosquitto mosquitto_sub -t "home/#" -v

# Publish a message in another terminal
docker exec mosquitto mosquitto_pub -t "home/livingroom/temperature" -m '{"value": 22.5}'

# Publish with QoS 1 (at least once delivery)
docker exec mosquitto mosquitto_pub -t "home/livingroom/temperature" -m '{"value": 23.0}' -q 1

# Publish a retained message (new subscribers will receive it immediately)
docker exec mosquitto mosquitto_pub -t "home/livingroom/status" -m "online" -r
```

## Adding Password Authentication

For anything beyond local testing, enable authentication. First, create a password file:

```bash
# Create a password file with an initial user
docker exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd device1

# Add more users without the -c flag (which creates a new file)
docker exec mosquitto mosquitto_passwd /mosquitto/config/passwd device2
docker exec mosquitto mosquitto_passwd /mosquitto/config/passwd webapp
```

Update the configuration to require authentication:

```
# mosquitto-docker/config/mosquitto.conf - Secured configuration

listener 1883
protocol mqtt

listener 9001
protocol websockets

# Require username/password authentication
allow_anonymous false
password_file /mosquitto/config/passwd

# Persistence settings
persistence true
persistence_location /mosquitto/data/

# Log settings
log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
```

Restart Mosquitto to apply changes:

```bash
# Restart the container to reload configuration
docker compose restart mosquitto

# Test with authentication
docker exec mosquitto mosquitto_pub -t "test" -m "hello" -u device1 -P "your_password"
docker exec mosquitto mosquitto_sub -t "test" -u webapp -P "your_password"
```

## Adding Access Control Lists (ACLs)

ACLs let you control which users can publish or subscribe to specific topics:

```
# mosquitto-docker/config/acl.conf - Topic access control rules

# device1 can publish to its own sensor topics and subscribe to commands
user device1
topic readwrite home/device1/#
topic read commands/device1/#

# device2 has access to its own topics only
user device2
topic readwrite home/device2/#
topic read commands/device2/#

# webapp can read all home topics and write commands
user webapp
topic read home/#
topic write commands/#
```

Add the ACL file to the Mosquitto configuration:

```
# Add this line to mosquitto.conf
acl_file /mosquitto/config/acl.conf
```

Update Docker Compose to mount the ACL file:

```yaml
# Updated volumes section
    volumes:
      - ./config/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./config/acl.conf:/mosquitto/config/acl.conf
      - ./data:/mosquitto/data
      - ./log:/mosquitto/log
```

## Enabling TLS Encryption

For production deployments, encrypt MQTT traffic with TLS. First, generate certificates (or use Let's Encrypt):

```bash
# Generate a self-signed CA and server certificate for testing
mkdir -p mosquitto-docker/config/certs

# Create CA key and certificate
openssl genrsa -out config/certs/ca.key 2048
openssl req -new -x509 -days 365 -key config/certs/ca.key -out config/certs/ca.crt \
  -subj "/CN=Mosquitto CA"

# Create server key and certificate signing request
openssl genrsa -out config/certs/server.key 2048
openssl req -new -key config/certs/server.key -out config/certs/server.csr \
  -subj "/CN=mqtt.example.com"

# Sign the server certificate with the CA
openssl x509 -req -in config/certs/server.csr -CA config/certs/ca.crt \
  -CAkey config/certs/ca.key -CAcreateserial -out config/certs/server.crt -days 365
```

Update the configuration for TLS:

```
# mosquitto-docker/config/mosquitto.conf - With TLS encryption

# Standard MQTT over TLS on port 8883
listener 8883
protocol mqtt
cafile /mosquitto/config/certs/ca.crt
certfile /mosquitto/config/certs/server.crt
keyfile /mosquitto/config/certs/server.key
require_certificate false

# Secure WebSocket on port 8884
listener 8884
protocol websockets
cafile /mosquitto/config/certs/ca.crt
certfile /mosquitto/config/certs/server.crt
keyfile /mosquitto/config/certs/server.key

# Keep an unencrypted listener for internal Docker network traffic
listener 1883 127.0.0.1
protocol mqtt

allow_anonymous false
password_file /mosquitto/config/passwd

persistence true
persistence_location /mosquitto/data/

log_dest stdout
```

Update Docker Compose to expose the TLS port:

```yaml
# docker-compose.yml - Mosquitto with TLS
version: "3.8"

services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "8883:8883"
      - "8884:8884"
    volumes:
      - ./config:/mosquitto/config
      - ./data:/mosquitto/data
      - ./log:/mosquitto/log
    restart: unless-stopped
```

Test the TLS connection:

```bash
# Connect with TLS using the CA certificate
docker exec mosquitto mosquitto_pub \
  -h localhost -p 8883 \
  --cafile /mosquitto/config/certs/ca.crt \
  -t "test/tls" -m "encrypted message" \
  -u device1 -P "your_password"
```

## Mosquitto with Monitoring

Add a Prometheus exporter for monitoring Mosquitto metrics:

```yaml
# docker-compose.yml - Mosquitto with metrics monitoring
version: "3.8"

services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
    volumes:
      - ./config:/mosquitto/config
      - ./data:/mosquitto/data
    restart: unless-stopped

  mosquitto-exporter:
    image: sapcc/mosquitto-exporter:latest
    ports:
      - "9234:9234"
    environment:
      # Point the exporter at the Mosquitto broker
      MQTT_BROKER: tcp://mosquitto:1883
      MQTT_USER: webapp
      MQTT_PASS: your_password
    depends_on:
      - mosquitto
    restart: unless-stopped
```

## Bridging Two Mosquitto Brokers

Connect two Mosquitto instances so messages flow between them:

```
# mosquitto-bridge.conf - Bridge configuration for edge-to-cloud sync
connection cloud-bridge
address cloud-mqtt.example.com:8883

# Topics to bridge: forward all sensor data to the cloud broker
topic home/# out 1

# Authentication for the remote broker
remote_username bridge-user
remote_password bridge-secret

# TLS settings for the bridge connection
bridge_cafile /mosquitto/config/certs/ca.crt
bridge_tls_version tlsv1.2

# Reconnect settings
restart_timeout 10 30
```

## Useful Commands

```bash
# View active connections
docker compose logs mosquitto | grep "New connection"

# Monitor all messages flowing through the broker
docker exec mosquitto mosquitto_sub -t "#" -v -u admin -P admin_pass

# Check Mosquitto version and build info
docker exec mosquitto mosquitto -h

# View retained messages on a topic
docker exec mosquitto mosquitto_sub -t "home/+/status" -v -u admin -P admin_pass --retained-only
```

## Summary

Mosquitto is the best choice when you need a lightweight, standards-compliant MQTT broker. Its small footprint makes it ideal for edge computing, home automation, and IoT projects where resource usage matters. The Docker setup keeps configuration portable, and features like ACLs, TLS encryption, and broker bridging give you the building blocks for a secure, distributed MQTT infrastructure. Start with the basic Docker Compose setup for development and add authentication and TLS when moving toward production.

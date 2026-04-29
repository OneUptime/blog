# How to Set Up MQTT Broker (Mosquitto) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MQTT, Mosquitto, IoT, Portainer, Docker, Messaging, Pub-Sub

Description: Deploy Eclipse Mosquitto as a secured MQTT broker using Portainer, configure authentication and TLS, and connect IoT clients to a production-ready message bus.

---

MQTT is the backbone messaging protocol of IoT deployments. Eclipse Mosquitto is the most widely used open-source MQTT broker. Deploying it via Portainer gives you a manageable, persistent broker with easy configuration updates.

## Step 1: Prepare the Configuration Files

Before creating the Portainer stack, prepare the Mosquitto configuration on the host:

```bash
# Create the config directory structure on the host

mkdir -p /opt/mosquitto/{config,data,log,certs}

# Create password file for authentication
# Bind-mount the config directory so the password file is written to the host
docker run --rm -it -v /opt/mosquitto/config:/mosquitto/config eclipse-mosquitto:2.0 \
  mosquitto_passwd -c /mosquitto/config/passwd iot-client
# Enter the password when prompted; the file is created at /opt/mosquitto/config/passwd
```

Create the main configuration file:

```conf
# /opt/mosquitto/config/mosquitto.conf
# Eclipse Mosquitto configuration for production use

listener 1883
# Require username/password for all connections
allow_anonymous false
password_file /mosquitto/config/passwd

# TLS listener (recommended for production)
listener 8883
cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
tls_version tlsv1.2

# WebSocket listener
listener 9001
protocol websockets

# Persistence settings - messages survive broker restart
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# Connection limits
max_connections 1000
max_inflight_messages 100
```

## Step 2: Deploy via Portainer Stack

```yaml
# mosquitto-stack.yml
version: "3.8"

services:
  mosquitto:
    image: eclipse-mosquitto:2.0
    volumes:
      # Bind-mount the config and data directories
      - /opt/mosquitto/config:/mosquitto/config:ro
      - /opt/mosquitto/data:/mosquitto/data
      - /opt/mosquitto/log:/mosquitto/log
      - /opt/mosquitto/certs:/mosquitto/certs:ro
    ports:
      - "1883:1883"    # MQTT (plaintext - restrict via firewall)
      - "8883:8883"    # MQTT over TLS
      - "9001:9001"    # MQTT over WebSocket
    restart: unless-stopped
    networks:
      - iot-net

networks:
  iot-net:
    driver: bridge
```

## Step 3: Test the Broker

Install the `mosquitto-clients` package on any machine to test:

```bash
# Subscribe to all sensor topics
mosquitto_sub -h localhost -p 1883 \
  -u iot-client -P your_password \
  -t "sensors/#" -v

# In another terminal, publish a test message
mosquitto_pub -h localhost -p 1883 \
  -u iot-client -P your_password \
  -t "sensors/temperature/room1" \
  -m '{"temp": 22.5, "unit": "celsius"}'
```

## Step 4: Configure Client Retention and QoS

MQTT supports three Quality of Service levels. Set the appropriate QoS in your publishers:

```python
# Python MQTT publisher with QoS and retention
import paho.mqtt.client as mqtt

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set("iot-client", "your_password")
client.connect("localhost", 1883)
client.loop_start()

# QoS 1 ensures at-least-once delivery
# retain=True means new subscribers get the last value immediately
info = client.publish(
    "sensors/temperature/room1",
    payload='{"temp": 22.5}',
    qos=1,
    retain=True
)
info.wait_for_publish()
client.loop_stop()
client.disconnect()
```

## Monitoring Mosquitto

Mosquitto exposes broker statistics via a special `$SYS` topic tree. Subscribe to monitor broker health:

```bash
# Subscribe to broker statistics - useful for monitoring
mosquitto_sub -h localhost -u iot-client -P your_password \
  -t "\$SYS/broker/#" -v
```

Key metrics to watch:
- `$SYS/broker/clients/connected` - active client count
- `$SYS/broker/messages/received` - total messages received
- `$SYS/broker/load/messages/received/1min` - message rate

## Summary

Mosquitto deployed via Portainer gives you a reliable, authenticated MQTT broker for IoT workloads. Portainer makes it easy to update the configuration, view logs, and restart the broker when needed.

# How to Run Node-RED in Docker for IoT Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, node-red, iot, automation, mqtt, self-hosted, low-code

Description: Deploy Node-RED in Docker to build IoT automation flows with a visual programming interface and MQTT integration.

---

Node-RED is a flow-based programming tool built on Node.js that lets you wire together IoT devices, APIs, and online services through a visual browser-based editor. You drag nodes onto a canvas, connect them with wires, and deploy automation flows without writing traditional code. Docker is the ideal way to run Node-RED because it handles the Node.js runtime and dependencies cleanly.

## What Makes Node-RED Useful

Traditional programming requires writing code, managing dependencies, and dealing with deployment pipelines. Node-RED flips this by giving you a visual canvas where data flows from left to right through connected nodes. An MQTT message arrives on the left, gets processed through function nodes in the middle, and triggers an action on the right. This approach makes IoT automation accessible to people who are not full-time developers while still being powerful enough for complex workflows.

## Prerequisites

You will need:

- A Linux server with Docker and Docker Compose installed
- At least 512 MB of RAM
- Basic understanding of MQTT if you plan to work with IoT sensors
- Optional: an MQTT broker (like Mosquitto) running on your network

## Project Setup

```bash
# Create the Node-RED project directory with a data folder
mkdir -p ~/node-red/data
cd ~/node-red
```

Set the correct permissions on the data directory. Node-RED runs as user ID 1000 inside the container:

```bash
# Set ownership so Node-RED can write to the data directory
sudo chown -R 1000:1000 ~/node-red/data
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Node-RED IoT automation platform
version: "3.8"

services:
  node-red:
    image: nodered/node-red:latest
    container_name: node-red
    restart: unless-stopped
    ports:
      # Web UI and flow editor
      - "1880:1880"
    environment:
      # Set timezone for scheduled flows
      - TZ=America/New_York
    volumes:
      # Persist flows, credentials, and installed nodes
      - ./data:/data

  # Optional: include Mosquitto MQTT broker for IoT messaging
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    restart: unless-stopped
    ports:
      # MQTT standard port
      - "1883:1883"
      # MQTT WebSocket port
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
```

If you include Mosquitto, create its configuration file:

```bash
# Create the Mosquitto config directory
mkdir -p ~/node-red/mosquitto/config
```

Write the Mosquitto configuration:

```
# mosquitto/config/mosquitto.conf
# Listen on port 1883 for standard MQTT connections
listener 1883
# Allow connections without authentication (change for production)
allow_anonymous true

# WebSocket listener on port 9001
listener 9001
protocol websockets

# Persist messages to disk
persistence true
persistence_location /mosquitto/data/
```

## Starting Node-RED

```bash
# Start Node-RED (and Mosquitto if included) in detached mode
docker compose up -d
```

Check the logs:

```bash
# Verify Node-RED started successfully
docker compose logs -f node-red
```

Open `http://<your-server-ip>:1880` in your browser. You should see the Node-RED flow editor with an empty canvas.

## Understanding the Flow Editor

The editor has three main panels:

- **Left sidebar (palette):** Available nodes organized by category - input, output, function, network, and more
- **Center canvas:** Where you build flows by dragging and connecting nodes
- **Right sidebar:** Shows node properties, debug output, and information panels

Flows execute from left to right. Input nodes receive data, function nodes process it, and output nodes send it somewhere.

## Building Your First Flow

Let us create a simple flow that reads a temperature sensor value via MQTT, checks if it exceeds a threshold, and sends a notification.

### Step 1: Add an MQTT Input Node

Drag an "mqtt in" node onto the canvas. Double-click it and configure:

- **Server:** Click the pencil icon and add your MQTT broker (localhost:1883 if using the Mosquitto container)
- **Topic:** `home/sensors/temperature`
- **QoS:** 1
- **Output:** auto-detect

### Step 2: Add a Function Node

Drag a "function" node and connect it to the MQTT input. Double-click and add this code:

```javascript
// Parse the temperature value and check against threshold
var temp = parseFloat(msg.payload);
msg.temperature = temp;

if (temp > 30) {
    msg.payload = "WARNING: Temperature is " + temp + "C - exceeds 30C threshold";
    msg.alert = true;
    return [msg, null];
} else {
    msg.payload = "Temperature normal: " + temp + "C";
    msg.alert = false;
    return [null, msg];
}
```

This function node has two outputs - one for alerts and one for normal readings.

### Step 3: Add Output Nodes

Connect the first output to an "http request" node configured to send a webhook notification. Connect the second output to a "debug" node to log normal readings.

### Step 4: Deploy

Click the red "Deploy" button in the top right corner. Your flow is now active and processing messages.

## Useful Node-RED Flows

Here is a flow that monitors a web service and alerts on downtime, exported as JSON that you can import:

```json
[
    {
        "id": "http_monitor",
        "type": "http request",
        "method": "GET",
        "url": "https://your-service.com/health",
        "ret": "txt",
        "name": "Health Check"
    },
    {
        "id": "status_check",
        "type": "switch",
        "property": "statusCode",
        "rules": [
            {"t": "neq", "v": "200"}
        ],
        "name": "Not 200?"
    },
    {
        "id": "alert_msg",
        "type": "template",
        "template": "Service down! Status code: {{statusCode}} at {{timestamp}}",
        "name": "Alert Message"
    }
]
```

## Installing Additional Nodes

Node-RED has a rich ecosystem of community nodes. Install them through the UI by going to Menu > Manage Palette > Install, or from the command line:

```bash
# Install popular Node-RED nodes from inside the container
docker exec -it node-red npm install node-red-dashboard
docker exec -it node-red npm install node-red-contrib-home-assistant-websocket
docker exec -it node-red npm install node-red-node-email
```

After installing nodes, restart Node-RED:

```bash
# Restart to load newly installed nodes
docker compose restart node-red
```

## Creating a Dashboard

The `node-red-dashboard` package adds UI widgets. After installing it, you can create real-time dashboards with gauges, charts, and buttons. Dashboard nodes appear in the palette under a new "dashboard" section. The dashboard UI is accessible at `http://<your-server-ip>:1880/ui`.

## Securing Node-RED

By default, Node-RED has no authentication. Enable it by editing the settings file:

```bash
# Generate a password hash for the settings file
docker exec -it node-red npx node-red-admin hash-pw
```

Enter your desired password and copy the resulting hash. Then edit `~/node-red/data/settings.js` and add:

```javascript
// Enable authentication for the flow editor
adminAuth: {
    type: "credentials",
    users: [{
        username: "admin",
        password: "$2b$08$YOUR_HASH_HERE",
        permissions: "*"
    }]
},
```

## Backup and Restore

```bash
# Back up all Node-RED data including flows and credentials
tar czf ~/node-red-backup-$(date +%Y%m%d).tar.gz ~/node-red/data/
```

The critical files are `flows.json` (your automation flows), `flows_cred.json` (encrypted credentials), and `settings.js` (configuration).

## Monitoring with OneUptime

Set up an HTTP monitor in OneUptime against your Node-RED instance to ensure it stays available. For critical IoT automations, downtime could mean missed sensor readings or failed alerts. OneUptime can notify you the moment Node-RED becomes unreachable.

## Wrapping Up

Node-RED in Docker gives you a powerful visual automation platform for IoT and beyond. The flow-based approach makes it quick to prototype and deploy integrations between devices, APIs, and services. Combined with MQTT for device communication and Docker for clean deployment, you have a robust foundation for any IoT automation project.

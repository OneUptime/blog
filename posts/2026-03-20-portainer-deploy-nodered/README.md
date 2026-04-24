# How to Deploy Node-RED via Portainer - Nodered

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Node-RED, IoT, Automation, Self-Hosted, Flow Programming

Description: Deploy Node-RED via Portainer as a flow-based programming tool for wiring IoT devices, APIs, and services together with a visual browser-based editor.

## Introduction

Node-RED is a flow-based programming tool originally developed by IBM for wiring IoT devices, APIs, and online services. It uses a visual browser-based editor to create flows and has a large ecosystem of community-contributed nodes. It's particularly popular for home automation alongside Home Assistant.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  nodered:
    image: nodered/node-red:latest
    container_name: nodered
    environment:
      - TZ=America/New_York
      # Enable the Projects feature if you want built-in Git support
      # - NODE_RED_ENABLE_PROJECTS=true
    volumes:
      # Node-RED data directory (flows, settings, credentials)
      - nodered_data:/data
    ports:
      - "1880:1880"
    restart: unless-stopped

volumes:
  nodered_data:
```

## Securing Node-RED

Enable authentication in `settings.js`:

```bash
# Generate a password hash
docker exec -it nodered npx node-red admin hash-pw
```

Add to `/data/settings.js`:

```javascript
adminAuth: {
    type: "credentials",
    users: [{
        username: "admin",
        password: "$2b$08$your_generated_hash",
        permissions: "*"
    }]
},
```

Then restart Node-RED:

```bash
docker restart nodered
```

## Installing Additional Nodes

Via the Node-RED UI:

1. Click the hamburger menu > **Manage palette**
2. Click **Install** tab
3. Search for and install nodes

Popular packages:
- `MQTT In` / `MQTT Out` - MQTT support is built into Node-RED
- `node-red-contrib-influxdb` - InfluxDB integration
- `node-red-contrib-home-assistant-websocket` - Home Assistant
- `node-red-contrib-postgresql` - PostgreSQL
- `node-red-dashboard` - Dashboard UI (deprecated)

Or via command line:

```bash
docker exec -w /data nodered npm install node-red-contrib-influxdb
docker restart nodered
```

## Example Flows

### MQTT to InfluxDB Pipeline

```json
[
  {
    "id": "mqtt-influx-flow",
    "type": "tab",
    "label": "MQTT to InfluxDB",
    "disabled": false,
    "info": "",
    "env": []
  },
  {
    "id": "mqtt-in",
    "type": "mqtt in",
    "z": "mqtt-influx-flow",
    "name": "Sensor Data",
    "topic": "sensors/#",
    "qos": "2",
    "datatype": "auto",
    "broker": "mosquitto-broker",
    "nl": false,
    "rap": true,
    "rh": 0,
    "inputs": 0,
    "x": 160,
    "y": 120,
    "wires": [["json-parse"]]
  },
  {
    "id": "json-parse",
    "type": "json",
    "z": "mqtt-influx-flow",
    "name": "Parse JSON",
    "property": "payload",
    "action": "",
    "pretty": false,
    "x": 360,
    "y": 120,
    "wires": [["influx-out"]]
  },
  {
    "id": "influx-out",
    "type": "influxdb out",
    "z": "mqtt-influx-flow",
    "influxdb": "influx-config",
    "name": "Store in InfluxDB",
    "measurement": "sensors",
    "precision": "",
    "retentionPolicy": "",
    "database": "",
    "precisionV18FluxV20": "ms",
    "retentionPolicyV18Flux": "",
    "org": "",
    "bucket": "",
    "x": 600,
    "y": 120,
    "wires": []
  },
  {
    "id": "mosquitto-broker",
    "type": "mqtt-broker",
    "name": "Mosquitto",
    "broker": "mosquitto",
    "port": "1883",
    "clientid": "",
    "autoConnect": true,
    "usetls": false,
    "protocolVersion": "4",
    "keepalive": "60",
    "cleansession": true,
    "birthTopic": "",
    "birthQos": "0",
    "birthRetain": "false",
    "birthPayload": "",
    "birthMsg": {},
    "closeTopic": "",
    "closeQos": "0",
    "closeRetain": "false",
    "closePayload": "",
    "closeMsg": {},
    "willTopic": "",
    "willQos": "0",
    "willRetain": "false",
    "willPayload": "",
    "willMsg": {},
    "userProps": "",
    "sessionExpiry": ""
  },
  {
    "id": "influx-config",
    "type": "influxdb",
    "hostname": "influxdb",
    "port": "8086",
    "protocol": "http",
    "database": "sensors",
    "name": "InfluxDB",
    "usetls": false,
    "tls": "",
    "influxdbVersion": "1.x",
    "url": "http://influxdb:8086",
    "rejectUnauthorized": true
  }
]
```

### HTTP Webhook to Slack

```text
HTTP In → Function → HTTP Request (Slack webhook) → HTTP Response
```

Function node:

```javascript
msg.payload = {
    text: `Webhook received: ${JSON.stringify(msg.payload)}`
};
msg.headers = {
    "Content-Type": "application/json"
};
return msg;
```

## Node-RED with Home Assistant

```yaml
version: "3.8"

services:
  nodered:
    image: nodered/node-red:latest
    volumes:
      - nodered_data:/data
    # Use host networking only if your Home Assistant instance also uses it
    network_mode: host
    restart: unless-stopped

volumes:
  nodered_data:
```

Install `node-red-contrib-home-assistant-websocket` and configure the server node with your Home Assistant Base URL.

## Conclusion

Node-RED deployed via Portainer is an excellent IoT and automation tool that complements Home Assistant and works well in any data pipeline context. Its visual flow editor makes complex integrations accessible, and the large library of community nodes covers most integration needs. For home lab users, it's an excellent glue layer connecting sensors, databases, and notification services.

# How to Deploy Node-RED for IoT Workflows via Portainer - Nodered

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Node-RED, IoT, Automation, Docker

Description: Deploy Node-RED as a visual IoT workflow automation platform using Portainer for low-code device data processing and integration.

## Introduction

Node-RED is a flow-based programming tool built on Node.js that makes it easy to wire together IoT devices, APIs, and online services. It provides a browser-based editor where you can create data processing workflows by dragging and connecting nodes. Deploying Node-RED via Portainer gives IoT teams a powerful workflow automation platform that's easy to manage and scale.

## Prerequisites

- Portainer installed with Docker
- Basic understanding of Node.js and IoT protocols
- Enough CPU and memory for the flows and extra nodes you plan to run

## Step 1: Deploy Node-RED via Portainer Stack

Create a new stack in Portainer:

```yaml
# docker-compose.yml for Node-RED

version: "3.8"

services:
  nodered:
    image: nodered/node-red:4.1.8
    container_name: nodered
    restart: always
    user: "1000"
    ports:
      - "1880:1880"
    volumes:
      # Persist Node-RED flows and settings
      - nodered-data:/data
    environment:
      - TZ=UTC
      - NODE_RED_ENABLE_PROJECTS=true
      # Credential encryption key
      - NODE_RED_CREDENTIAL_SECRET=${NODE_RED_CREDENTIAL_SECRET}
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"
    networks:
      - iot-net

volumes:
  nodered-data:

networks:
  iot-net:
    driver: bridge
```

## Step 2: Configure Node-RED Settings

Edit the persisted `/data/settings.js` file from the Node-RED container console or the mounted data directory:

```javascript
// settings.js - Node-RED configuration
module.exports = {
    // Web UI settings
    uiPort: process.env.PORT || 1880,
    
    // Flow file location
    flowFile: 'flows.json',
    
    // Credential encryption
    credentialSecret: process.env.NODE_RED_CREDENTIAL_SECRET,
    
    // Optional global objects for function nodes
    functionGlobalContext: {},
    
    // User authentication
    adminAuth: {
        type: "credentials",
        users: [{
            username: "admin",
            // Example hash for the password "password" - generate your own with: npx node-red admin hash-pw
            password: "$2a$08$zZWtXTja0fB1pzD4sHCMyOCMYz2Z6dNbM6tl8sJogENOMcxWV9DN.",
            permissions: "*"
        }]
    },
    
    // Editor settings
    editorTheme: {
        projects: {
            enabled: true // Requires git and ssh-keygen inside the container
        }
    },

    // Allow installing additional nodes from the palette manager
    externalModules: {
        palette: {
            allowInstall: true
        }
    },
    
    // Context storage
    contextStorage: {
        default: {
            module: "localfilesystem"
        }
    },
    
    // Logging
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    }
};
```

## Step 3: Install IoT-Specific Node-RED Nodes

After deployment, install additional nodes via the Portainer container console:

```bash
# Access Node-RED container via Portainer console
# Navigate to Containers > nodered > Console

cd /data

# MQTT input/output nodes are included with Node-RED

# Install InfluxDB nodes for time-series storage
npm install node-red-contrib-influxdb

# Install Modbus nodes for industrial protocols
npm install node-red-contrib-modbus

# Install OPC-UA nodes
npm install node-red-contrib-opcua

# Install FlowFuse Dashboard nodes for UI
npm install @flowfuse/node-red-dashboard

# Restart Node-RED to load new nodes
# (Portainer: Containers > nodered > Restart)
```

## Step 4: Example IoT Workflow

Here's a Node-RED flow that reads MQTT sensor data and stores it in InfluxDB:

```json
[
    {
        "id": "c2f8d6c90c0a9a51",
        "type": "tab",
        "label": "MQTT to InfluxDB",
        "disabled": false,
        "info": ""
    },
    {
        "id": "7b8e0d87a11b5d7e",
        "type": "mqtt in",
        "z": "c2f8d6c90c0a9a51",
        "name": "Sensor MQTT Input",
        "topic": "sensors/#",
        "qos": "1",
        "datatype": "auto",
        "broker": "9f4c1e8a14d1d5b2",
        "nl": false,
        "rap": true,
        "rh": 0,
        "inputs": 0,
        "x": 170,
        "y": 120,
        "wires": [["df1a43d7f6d9c3a8"]]
    },
    {
        "id": "df1a43d7f6d9c3a8",
        "type": "json",
        "z": "c2f8d6c90c0a9a51",
        "name": "Parse JSON",
        "property": "payload",
        "action": "",
        "pretty": false,
        "x": 370,
        "y": 120,
        "wires": [["8d21f8480a12b97a"]]
    },
    {
        "id": "8d21f8480a12b97a",
        "type": "function",
        "z": "c2f8d6c90c0a9a51",
        "name": "Transform for InfluxDB",
        "func": "// Transform sensor payload for the InfluxDB batch node\nconst data = msg.payload;\nconst topicParts = (msg.topic || '').split('/');\nconst deviceId = topicParts[1] || 'unknown';\n\nmsg.payload = [{\n    measurement: 'sensor_data',\n    fields: {\n        temperature: Number(data.temperature),\n        humidity: Number(data.humidity),\n        pressure: Number(data.pressure || 0)\n    },\n    tags: {\n        device_id: deviceId,\n        location: data.location || 'unknown'\n    },\n    timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date()\n}];\n\nreturn msg;",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 610,
        "y": 120,
        "wires": [["c6ad3b0a6fa6f8c7"]]
    },
    {
        "id": "c6ad3b0a6fa6f8c7",
        "type": "influxdb batch",
        "z": "c2f8d6c90c0a9a51",
        "name": "Write to InfluxDB",
        "influxdb": "a30d64fd920fe8c1",
        "x": 840,
        "y": 120,
        "wires": []
    },
    {
        "id": "9f4c1e8a14d1d5b2",
        "type": "mqtt-broker",
        "name": "MQTT Broker",
        "broker": "mqtt.example.internal",
        "port": "1883",
        "clientid": "",
        "autoConnect": true,
        "usetls": false,
        "protocolVersion": "4",
        "keepalive": "60",
        "cleansession": true,
        "autoUnsubscribe": true,
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
        "id": "a30d64fd920fe8c1",
        "type": "influxdb",
        "hostname": "influxdb",
        "port": "8086",
        "protocol": "http",
        "database": "iot",
        "name": "InfluxDB",
        "usetls": false,
        "tls": "",
        "influxdbVersion": "1.x",
        "url": "http://influxdb:8086",
        "rejectUnauthorized": true
    }
]
```

Update the MQTT broker host and InfluxDB connection details to match your environment before deploying the flow.

Import this flow via Node-RED UI: Menu > Import > Clipboard.

## Step 5: Create an Alerting Flow

Branch a second wire from the `Parse JSON` node into a function node with:

```javascript
// Function node: Check sensor thresholds
const data = msg.payload;
const topicParts = (msg.topic || '').split('/');
const deviceId = data.device_id || topicParts[1] || 'unknown';
const alerts = [];
const temperature = Number(data.temperature);

// Temperature threshold check
if (temperature > 35) {
    alerts.push({
        severity: 'critical',
        message: `HIGH TEMPERATURE: ${temperature}°C on device ${deviceId}`,
        timestamp: new Date().toISOString()
    });
} else if (temperature > 30) {
    alerts.push({
        severity: 'warning',
        message: `Elevated temperature: ${temperature}°C on device ${deviceId}`,
        timestamp: new Date().toISOString()
    });
}

if (alerts.length > 0) {
    msg.payload = alerts[0];
    return msg;
}
return null; // No alert needed
```

## Step 6: Expose Node-RED Safely

For production access, use Nginx reverse proxy configured in Portainer:

```yaml
# Add to your stack
  nginx:
    image: nginx:alpine
    restart: always
    volumes:
      - /opt/nodered/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /opt/nodered/certs:/etc/nginx/certs:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - nodered
    networks:
      - iot-net
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name nodered.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name nodered.example.com;
    
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    # Proxy to Node-RED
    location / {
        proxy_pass http://nodered:1880;
        proxy_http_version 1.1;
        # WebSocket support for Node-RED editor
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Conclusion

Node-RED deployed via Portainer provides a powerful visual programming environment for IoT data workflows. Its drag-and-drop interface makes it accessible to developers and non-developers alike, while its extensible node library supports virtually any IoT protocol and cloud service. Portainer simplifies the deployment, configuration management, and monitoring of Node-RED, making it easy to run production-grade IoT automation at scale.

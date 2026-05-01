# How to Deploy Node-RED for IoT Workflows via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node-RED, IoT, Portainer, Docker, Automation, MQTT, Workflow

Description: Deploy Node-RED on Docker using Portainer to create visual IoT data processing workflows that connect sensors, MQTT brokers, databases, and cloud services without writing code.

---

Node-RED is a flow-based visual programming tool that makes it easy to wire together IoT devices, APIs, and services. It runs on Node.js and ships as a Docker image, making it a perfect candidate for Portainer deployment.

## Step 1: Deploy Node-RED via Portainer Stack

Navigate to **Stacks > Add stack** in Portainer:

```yaml
# node-red-stack.yml

version: "3.8"

services:
  node-red:
    image: nodered/node-red:4.1.8
    environment:
      # Set timezone for accurate timestamps in flows
      - TZ=America/New_York
    volumes:
      # Persistent storage for flows and node configurations
      - node-red-data:/data
    ports:
      - "1880:1880"    # Node-RED editor and HTTP endpoints
    restart: unless-stopped
    networks:
      - iot-net

networks:
  iot-net:
    driver: bridge

volumes:
  node-red-data:
```

## Step 2: Install Additional Nodes

After deploying, access the Node-RED editor at `http://<host>:1880`. Install extra nodes via the **Palette Manager** (Menu > Manage Palette > Install):

- `node-red-contrib-aedes` - embedded MQTT broker
- `node-red-contrib-influxdb` - write directly to InfluxDB
- `@flowfuse/node-red-dashboard` - build web-based dashboards
- `node-red-contrib-postgresql` - PostgreSQL integration

Alternatively, pre-install nodes in a custom Docker image using a `package.json` and `Dockerfile`:

```json
{
  "name": "my-node-red",
  "description": "Node-RED with pre-installed IoT nodes",
  "scripts": {
    "start": "node $NODE_OPTIONS node_modules/node-red/red.js $FLOWS"
  },
  "dependencies": {
    "@flowfuse/node-red-dashboard": "1.30.2",
    "node-red-contrib-aedes": "1.2.0",
    "node-red-contrib-influxdb": "0.7.0",
    "node-red-contrib-postgresql": "0.15.4"
  }
}
```

```dockerfile
FROM nodered/node-red:4.1.8

WORKDIR /data
COPY package.json /data
RUN npm install --no-update-notifier --no-fund --only=production

WORKDIR /usr/src/node-red
```

Build this image and deploy it in Portainer instead of mounting `package.json` into `/data` at runtime.

## Step 3: Create an IoT Data Flow

Here is an example flow exported as JSON that reads MQTT sensor data published as a JSON object and writes it to InfluxDB:

```json
[
  {
    "id": "b716fdc48724e610",
    "type": "tab",
    "label": "IoT Ingest",
    "disabled": false,
    "info": ""
  },
  {
    "id": "562ec1085cc9dbf1",
    "type": "mqtt-broker",
    "name": "MQTT Broker",
    "broker": "mqtt-broker",
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
    "id": "bc4ab5cb2a050021",
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
    "rejectUnauthorized": false
  },
  {
    "id": "65e33f58d20fee33",
    "type": "mqtt in",
    "z": "b716fdc48724e610",
    "name": "Sensor Input",
    "topic": "sensors/#",
    "qos": "1",
    "datatype": "auto",
    "broker": "562ec1085cc9dbf1",
    "nl": false,
    "rap": true,
    "rh": 0,
    "x": 150,
    "y": 80,
    "wires": [["69f73915a01982c3"]]
  },
  {
    "id": "69f73915a01982c3",
    "type": "json",
    "z": "b716fdc48724e610",
    "name": "Parse JSON",
    "property": "payload",
    "action": "",
    "pretty": false,
    "x": 350,
    "y": 80,
    "wires": [["0e17644c4b3628b4"]]
  },
  {
    "id": "0e17644c4b3628b4",
    "type": "influxdb out",
    "z": "b716fdc48724e610",
    "name": "Write to InfluxDB",
    "influxdb": "bc4ab5cb2a050021",
    "measurement": "sensor_readings",
    "precision": "",
    "retentionPolicy": "",
    "database": "",
    "precisionV18FluxV20": "ms",
    "retentionPolicyV18Flux": "",
    "org": "",
    "bucket": "",
    "x": 580,
    "y": 80,
    "wires": []
  }
]
```

Import this flow via **Menu > Import > Clipboard** in the Node-RED editor.

## Step 4: Secure Node-RED

By default, Node-RED has no authentication. Enable it by editing `settings.js`:

```javascript
// /data/settings.js in the container
module.exports = {
  // Enable HTTP authentication for the editor
  adminAuth: {
    type: "credentials",
    users: [
      {
        username: "admin",
        // Generate hash: node-red admin hash-pw
        password: "$2b$08$your-bcrypt-hash-here",
        permissions: "*"
      }
    ]
  },

  // Enable HTTPS (mount certs as volumes)
  https: {
    key: require("fs").readFileSync("/certs/server.key"),
    cert: require("fs").readFileSync("/certs/server.crt")
  }
};
```

## Step 5: Backup Flows

Node-RED stores the flow definition in `/data/flows.json` and encrypted credentials in `/data/flows_cred.json` inside the container. With Portainer and Docker, you can:

1. Browse the `node-red-data` volume in Portainer and download `flows.json`, `flows_cred.json`, and `settings.js` if your environment supports volume browsing
2. Back up the underlying Docker volume on the host, since Portainer's own backup only includes Portainer configuration and stack files, not application data volumes
3. Enable Node-RED's built-in Projects feature for Git-backed flow storage

## Summary

Node-RED on Portainer is an excellent combination for IoT workflow automation. The visual flow editor lowers the barrier to building data pipelines, and Portainer makes it easy to keep the Node-RED instance running, updated, and backed up.

# How to Deploy Node-RED via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Node-RED, IoT, Automation, Docker, Self-Hosting, Flow Programming

Description: Learn how to deploy Node-RED, the browser-based flow programming tool for IoT and automation, via Portainer with persistent flow storage and credential encryption.

---

Node-RED is a visual flow-based programming tool ideal for IoT automation, home automation, and connecting APIs. It has a huge library of community nodes and integrates naturally with MQTT, Home Assistant, and hardware devices.

## Prerequisites

- Portainer running

## Compose Stack

Node-RED stores flows and credentials on disk. Mount a named volume and pass the credential secret in as an environment variable:

```yaml
version: "3.8"

services:
  nodered:
    image: nodered/node-red:latest
    restart: unless-stopped
    ports:
      - "1880:1880"
    environment:
      TZ: America/New_York
      # Set a credential secret to encrypt stored passwords
      NODE_RED_CREDENTIAL_SECRET: ${NODE_RED_CREDENTIAL_SECRET}
    volumes:
      - nodered_data:/data
    user: "1000:1000"   # Run as non-root

volumes:
  nodered_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `nodered`.
3. In Portainer's environment variables section, set `NODE_RED_CREDENTIAL_SECRET` to a strong random string.
4. Click **Deploy the stack**.

Open `http://<host>:1880` to access the Node-RED editor.

## Securing the Editor

By default, Node-RED has no authentication. Enable it by editing `/data/settings.js` inside the container:

```javascript
// In /data/settings.js, add or update:
credentialSecret: process.env.NODE_RED_CREDENTIAL_SECRET,
adminAuth: {
    type: "credentials",
    users: [{
        username: "admin",
        // Generate hash from a shell in the container: npx node-red admin hash-pw
        password: "$2b$08$...",
        permissions: "*"
    }]
},
```

Restart the container in Portainer after editing.

## Installing Extra Nodes

Install community nodes via the **Manage Palette** menu in the editor, or from a shell in the container:

```bash
# Install dashboard UI nodes from a shell in Portainer
cd /data
npm install @flowfuse/node-red-dashboard
# Then restart the container via Portainer
```

## Monitoring

Use OneUptime to monitor `http://<host>:1880` for HTTP 200. Add an alert for Node-RED downtime to catch issues before automated IoT workflows stop triggering.

# How to Deploy Rocket.Chat via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Rocket.Chat, Team Chat, Docker, Self-Hosting, MongoDB, Slack Alternative

Description: Learn how to deploy Rocket.Chat, the open-source team communication platform, via Portainer with a MongoDB backend and persistent data volumes.

---

Rocket.Chat is a feature-rich open-source messaging platform with support for channels, voice/video calls, omnichannel customer support, and a robust API. It uses MongoDB as its database. Portainer simplifies managing the Docker Compose stack.

## Prerequisites

- Portainer running
- Current Rocket.Chat starter sizing allocates 4GiB each to Rocket.Chat and MongoDB
- A URL you will actually use to access Rocket.Chat for the `ROOT_URL` setting

## Compose Stack

```yaml
version: "3.8"

services:
  mongo:
    image: mongo:8.0
    restart: unless-stopped
    # Enable replica set mode - required by Rocket.Chat
    command: mongod --oplogSize 128 --replSet rs0
    volumes:
      - mongo_data:/data/db
      - mongo_dump:/dump

  mongo-init-replica:
    image: mongo:8.0
    # One-time job to initialize the replica set
    command: >
      bash -c "until mongosh --host mongo --eval 'db.adminCommand({ ping: 1 })' >/dev/null 2>&1; do sleep 2; done; mongosh --host mongo --eval 'try { rs.status() } catch (err) { rs.initiate({_id: \"rs0\", members: [{ _id: 0, host: \"mongo:27017\" }]}) }'"
    depends_on:
      - mongo

  rocketchat:
    image: registry.rocket.chat/rocketchat/rocket.chat:8.4.0
    restart: unless-stopped
    depends_on:
      - mongo
    ports:
      - "3102:3000"
    environment:
      MONGO_URL: mongodb://mongo:27017/rocketchat?replicaSet=rs0
      ROOT_URL: http://chat.example.com:3102
      PORT: 3000
      DEPLOY_METHOD: docker

volumes:
  mongo_data:
  mongo_dump:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `rocketchat`.
3. Update `ROOT_URL` to the exact URL you will use to access Rocket.Chat, including `:3102` if you keep the port mapping above.
4. Click **Deploy the stack**.

The `mongo-init-replica` service runs once and exits, which Portainer will show as "Exited (0)" - this is normal.

Open the `ROOT_URL` you configured and complete the setup wizard.

## Integrations

Rocket.Chat integrates with hundreds of services via webhooks and native integrations. Common ones include:

- **GitHub/GitLab**: Post commit and PR notifications to channels
- **Jira**: Link issues to messages
- **Zapier/n8n**: Automate workflows

## Monitoring

Use OneUptime to monitor `<ROOT_URL>/api/info`. Rocket.Chat returns version information there when healthy. Alert on any non-200 responses to catch issues before your team notices.

# How to Deploy Wekan (Kanban Board) via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Wekan, Kanban, Docker, Self-Hosted

Description: Deploy Wekan open-source kanban board using Portainer as a self-hosted Trello alternative.

## Introduction

Wekan is an open-source, self-hosted Kanban board built with Meteor and MongoDB. It supports boards, lists, cards, labels, checklists, due dates, and file attachments - a Trello-compatible alternative for teams.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Wekan

version: "3.8"

services:
  wekan:
    image: ghcr.io/wekan/wekan:latest
    container_name: wekan
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - wekan_files:/data
    environment:
      - METEOR_REACTIVITY_ORDER=oplog,polling
      - WRITABLE_PATH=/data
      - MONGO_URL=mongodb://wekan_mongo:27017/wekan
      - MONGO_OPLOG_URL=mongodb://wekan_mongo:27017/local?replicaSet=rs0
      - ROOT_URL=http://${WEKAN_DOMAIN}:8080
      - WITH_API=true
      - BROWSER_POLICY_ENABLED=true
      - TRUSTED_URL=http://${WEKAN_DOMAIN}:8080
      - RICHER_CARD_COMMENT_EDITOR=false
      - CARD_OPENED_WEBHOOK_ENABLED=false
      - NODE_ENV=production
    depends_on:
      - wekan_mongo
    networks:
      - wekan_net

  wekan_mongo:
    image: mongo:7
    container_name: wekan_mongo
    restart: unless-stopped
    volumes:
      - wekan_mongo_data:/data/db
    command: >
      sh -c '
        mongod --oplogSize 128 --replSet rs0 --bind_ip_all --quiet &
        until mongosh --host 127.0.0.1 --quiet --eval "
          try {
            const status = rs.status();
            quit(status.ok === 1 ? 0 : 1);
          } catch (e) {
            if (
              e.codeName === \"NotYetInitialized\" ||
              e.message.includes(\"no replset config has been received\") ||
              e.message.includes(\"not yet initialized\")
            ) {
              rs.initiate({
                _id: \"rs0\",
                members: [{ _id: 0, host: \"wekan_mongo:27017\" }]
              });
              quit(1);
            }
            quit(1);
          }
        " >/dev/null 2>&1; do
          sleep 2
        done
        wait
      '
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - wekan_net

volumes:
  wekan_files:
  wekan_mongo_data:

networks:
  wekan_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
WEKAN_DOMAIN=wekan.yourdomain.com
```

## Step 3: Access Wekan

Open `http://wekan.yourdomain.com:8080` (or whatever exact `ROOT_URL` you configured) and register. The first registered user becomes the admin.

## Step 4: Create a Board

1. Click **Add Board**
2. Add lists (columns) such as "Backlog", "In Progress", "Done"
3. Create cards within lists
4. Set labels, due dates, and assign members

## Step 5: Use the REST API

```bash
# Login to get a token
TOKEN=$(curl -s -X POST http://localhost:8080/users/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "your-password"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['token'])")

USER_ID=$(curl -s -X POST http://localhost:8080/users/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "your-password"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")

# List boards
curl http://localhost:8080/api/users/${USER_ID}/boards \
  -H "Authorization: Bearer ${TOKEN}"

# Create a card (need list ID from board)
curl -X POST "http://localhost:8080/api/boards/<board-id>/lists/<list-id>/cards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"title": "New Task", "authorId": "'${USER_ID}'"}'
```

## Step 6: Back Up Wekan Data

```bash
# Backup MongoDB
docker stop wekan
docker exec wekan_mongo rm -rf /data/dump
docker exec wekan_mongo mongodump -o /data/dump
docker cp wekan_mongo:/data/dump ./dump
mv ./dump ./wekan_backup_$(date +%Y%m%d)
docker start wekan

# Restore
docker stop wekan
docker exec wekan_mongo rm -rf /data/dump
docker cp ./wekan_backup_20240101 wekan_mongo:/data/dump
docker exec wekan_mongo mongorestore --drop --dir=/data/dump
docker start wekan
```

## Conclusion

Wekan requires `ROOT_URL` to be set to the exact URL used to access the application - incorrect values cause login, redirect, translation, and upload issues. For MongoDB-backed deployments, enable a single-node replica set and set `MONGO_OPLOG_URL` so Wekan can use the oplog for real-time updates; `--oplogSize 128` sets the oplog size to 128 MB when that replica set is first initialized. For production, configure SMTP via `MAIL_URL=smtp://user:pass@host:port` and `MAIL_FROM=noreply@yourdomain.com` for email notifications.

# How to Deploy Wekan (Kanban Board) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wekan, Kanban, Portainer, Docker, Project Management, Self-Hosted

Description: Deploy Wekan open-source Kanban board via Portainer with MongoDB persistence for team task management and project tracking.

---

This guide covers deploying this self-hosted productivity application via Portainer with persistent data storage and proper configuration.

## Deploy via Portainer Stack

Navigate to **Stacks > Add Stack** in Portainer and use the following configuration:

```yaml
version: "3.8"
services:
  wekandb:
    image: mongo:7
    container_name: wekan-db
    command: >-
      sh -c 'mongod --oplogSize 128 --replSet rs0 --bind_ip_all --quiet & until mongosh --host 127.0.0.1 --quiet --eval "try { const status = rs.status(); quit(status.ok === 1 ? 0 : 1); } catch (e) { if (e.codeName === \"NotYetInitialized\" || e.message.includes(\"no replset config has been received\") || e.message.includes(\"not yet initialized\")) { rs.initiate({ _id: \"rs0\", members: [{ _id: 0, host: \"wekandb:27017\" }] }); quit(1); } quit(1); }" >/dev/null 2>&1; do sleep 2; done; wait'
    volumes:
      - wekan-db:/data/db
    healthcheck:
      test: ["CMD-SHELL", "mongosh --host 127.0.0.1 --quiet --eval 'quit(rs.status().ok === 1 ? 0 : 1)'"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped
    networks:
      - app-net

  wekan:
    image: ghcr.io/wekan/wekan:latest
    container_name: wekan-app
    environment:
      - WRITABLE_PATH=/data
      - MONGO_URL=mongodb://wekandb:27017/wekan
      - MONGO_OPLOG_URL=mongodb://wekandb:27017/local?replicaSet=rs0
      - ROOT_URL=http://your-server-ip
      - METEOR_REACTIVITY_ORDER=oplog,polling
      - WITH_API=true
    volumes:
      - wekan-files:/data
    ports:
      - "80:8080"
    depends_on:
      wekandb:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-net

volumes:
  wekan-db:
  wekan-files:

networks:
  app-net:
    driver: bridge
```

## Configuration

After deployment, access the application at the URL you set in `ROOT_URL` and complete the initial setup:

1. Visit `/sign-up` to create the first user account. The first registered user becomes the admin.
2. Create your first board and configure board settings as needed.
3. Invite team members to boards by email or allow them to self-register.
4. If you want email notifications, add `MAIL_URL` and `MAIL_FROM` to the stack configuration.

## Key Features

This application provides:

- **Kanban boards / Project tracking** - visual workflow management
- **Team collaboration** - assign tasks and track progress
- **Labels and lists** - organize work by type, status, or priority
- **Due dates and deadlines** - time-based task management
- **Comments and attachments** - rich context on each task

## Backup and Restore

Backup the application data:

```bash
# Backup Wekan MongoDB data
docker exec wekan-db sh -c 'mongodump --archive --gzip --db=wekan' > wekan-db-$(date +%Y%m%d).archive.gz

# Backup uploaded files stored at WRITABLE_PATH=/data
docker run --rm \
  -v wekan-files:/data:ro \
  -v /opt/backups:/backups \
  alpine tar czf "/backups/wekan-files-$(date +%Y%m%d).tar.gz" -C / data
```

## Summary

This self-hosted productivity tool deployed via Portainer gives your team a private, data-owned alternative to SaaS project management platforms. Portainer handles the container lifecycle, and MongoDB plus named volumes provide persistent storage for Wekan data and uploaded files.

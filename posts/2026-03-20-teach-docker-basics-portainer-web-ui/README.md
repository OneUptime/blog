# How to Teach Docker Basics Using Portainer's Web UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Education, Training, Container, DevOps

Description: Use Portainer's visual web interface as a teaching tool to explain core Docker concepts - containers, images, networks, and volumes - to students and developers new to containerization.

---

The Docker CLI is powerful but intimidating for beginners. Portainer's web UI makes many Docker concepts visible: you can see containers running, inspect their logs, browse volume contents when using Docker Swarm or the Portainer Agent, and inspect network attachments without typing a single command. This makes it an ideal teaching companion for Docker fundamentals courses.

## Core Docker Concepts Mapped to Portainer UI

| Docker Concept | Portainer Location | What to Show |
|---|---|---|
| Containers | Containers > List | Running/stopped state, resource usage |
| Images | Images > List | Image IDs, size, tags |
| Volumes | Volumes | Mount points, usage |
| Networks | Networks | Bridge/overlay network types and container attachments |
| Logs | Container > Logs | stdout/stderr streams |
| Exec | Container > Console | Live shell in container |

## Lesson 1: What is a Container?

Start by pulling and running an image through the Portainer UI:

1. Go to **Images > Pull Image**
2. Enter `nginx:alpine`
3. Click **Pull the image**

Then deploy it:

1. Go to **Containers > Add Container**
2. Name: `my-first-nginx`
3. Image: `nginx:alpine`
4. Port mapping: `8080:80`
5. Click **Deploy the container**

Navigate to `http://<host>:8080` - students immediately see their running web server.

## Lesson 2: Container Lifecycle

Show common lifecycle actions using the Portainer container list controls:

```text
Start → Stop → Restart → Remove
```

Students observe state changes in real time. Explain that stopped containers retain their writable layer until removed, while persistent application data should be kept in volumes.

## Lesson 3: Environment Variables

Deploy a long-running container with environment variables set via Portainer's **Env** tab:

```bash
# Equivalent Docker CLI for reference

docker run -d --name env-demo -e MY_NAME=Alice -e MY_ENV=development nginx:alpine
docker exec env-demo env
```

In Portainer, add the variables in the **ENV** section of the container creation form. Use the **Console** to run `env` inside the running container, selecting `/bin/ash` for Alpine-based images, and verify the variables are set.

## Lesson 4: Volumes - Persistent Data

1. Create a volume: **Volumes > Add Volume**, name it `lesson-data`
2. Deploy an Nginx container with the volume mounted at `/usr/share/nginx/html`
3. Use Portainer's volume browser, available with Docker Swarm or the Portainer Agent, to upload an `index.html` into the volume
4. Verify the page updates in the browser

Then show what happens when you remove and recreate the container with the same volume - the data persists.

## Lesson 5: Networks

Create two containers on different networks and demonstrate isolation:

1. Create a **bridge** network named `lesson-net`
2. Deploy two Alpine containers with a long-running command such as `sleep 3600` - one on `lesson-net`, one on the default bridge
3. Use the Console, selecting `/bin/ash` for Alpine, to `ping` the other container's IP address and show that cross-network traffic is blocked by default

## Lesson 6: Docker Compose with Stacks

Show a two-service application using Portainer Stacks:

```yaml
# Paste this in Stacks > Add Stack
services:
  web:
    image: nginx:alpine
    ports:
      - "8090:80"
  db:
    image: redis:7-alpine
```

Students see both containers deploy together and understand how services discover each other by name on the stack's network.

## Summary

Portainer transforms Docker theory into observable reality. Each click in the UI maps directly to a Docker API operation, so students develop intuition for what Docker is doing under the hood before they ever need to type `docker run`. Once comfortable in the UI, students naturally progress to the CLI with confidence.

# How to Teach Docker Basics Using Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Teaching, Education, Beginner

Description: Use Portainer's visual interface to teach Docker fundamentals to beginners, bridging the gap between CLI commands and container concepts.

## Introduction

Docker's command-line interface intimidates many beginners. Portainer's graphical interface makes Docker concepts visible and interactive, providing an ideal teaching tool. Students can see containers start, stop, and produce logs in real-time without memorizing commands. This guide covers a structured curriculum for teaching Docker basics using Portainer as the primary interface.

## Why Portainer for Teaching Docker

- Visual representation of abstract concepts (networks, volumes, containers)
- Immediate feedback when actions succeed or fail
- Side-by-side comparison: UI action alongside the equivalent CLI command
- No terminal anxiety for beginners from non-technical backgrounds
- Instructor can see all student environments from one dashboard

## Lesson 1: Running Your First Container

**Learning objective:** Understand what a container is and how to start one.

In Portainer: **Containers > Add Container**

```text
Image: hello-world
Name: my-first-container
Click: Deploy the container
```

After running, show the logs: **Containers > my-first-container > Logs**

CLI equivalent:
```bash
docker run --name my-first-container hello-world
docker logs my-first-container
```

Key teaching point: A container is an isolated process running from an image.

## Lesson 2: Interactive Containers

**Learning objective:** Understand the difference between foreground and background containers.

In Portainer: **Containers > Add Container**

```text
Image: ubuntu:22.04
Name: ubuntu-interactive
Console: Interactive + TTY enabled
Command: /bin/bash
Restart policy: Never
Click: Deploy
Then: Containers > ubuntu-interactive > Console
```

CLI equivalent:
```bash
docker run -it --name ubuntu-interactive ubuntu:22.04 /bin/bash
```

## Lesson 3: Port Mapping

**Learning objective:** Expose container services to the host network.

In Portainer: **Containers > Add Container**

```text
Image: nginx:alpine
Name: my-webserver
Port mapping: 8080 (host) -> 80 (container)
Click: Deploy
```

Then open a browser to `http://localhost:8080` - students see the Nginx welcome page.

CLI equivalent:
```bash
docker run -d --name my-webserver -p 8080:80 nginx:alpine
```

```bash
# Teaching script: Show port mapping effect

echo "Container is accessible at:"
echo "  Inside the container: http://localhost:80"
echo "  Published on the Docker host: http://localhost:8080"
curl -s http://localhost:8080 | grep -o '<title>.*</title>'
```

## Lesson 4: Environment Variables

**Learning objective:** Configure containers without changing the image.

In Portainer: **Containers > Add Container**

```text
Image: postgres:15-alpine
Name: my-database
Environment variables:
  POSTGRES_PASSWORD=mysecretpassword
  POSTGRES_DB=myapp
  POSTGRES_USER=appuser
Restart policy: Unless stopped
Click: Deploy
```

CLI equivalent:
```bash
docker run -d \
  --name my-database \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=myapp \
  -e POSTGRES_USER=appuser \
  postgres:15-alpine
```

Teaching point: The same image becomes a different service based on environment configuration.

## Lesson 5: Volumes and Data Persistence

**Learning objective:** Understand why data disappears when containers are removed and how to fix it.

**Demonstration of data loss:**

In Portainer:
1. Create container with `nginx:alpine`, no volumes, and Interactive + TTY enabled
2. Connect to Console using `/bin/ash`, create a file: `echo "my data" > /usr/share/nginx/html/test.txt`
3. Stop and remove the container
4. Recreate it - the file is gone

**Fix with volumes:**

In Portainer: **Volumes > Add Volume**, then **Containers > Add Container**

```text
Image: nginx:alpine
Name: nginx-with-data
Volume: mydata -> /usr/share/nginx/html (named volume)
```

CLI equivalent:
```bash
docker volume create mydata
docker run -d \
  --name nginx-with-data \
  -v mydata:/usr/share/nginx/html \
  -p 8080:80 \
  nginx:alpine
```

## Lesson 6: Multi-Container Apps with Stacks

**Learning objective:** Deploy applications that require multiple containers working together.

In Portainer: **Stacks > Add Stack**

```yaml
# Name: postgres-demo
services:
  app:
    image: adminer:5-standalone
    ports:
      - "8081:8080"
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: todopass
      POSTGRES_DB: todos
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

Show students how Portainer displays all containers in the stack, their logs, and their inter-container network.

## Lesson 7: Images and Layers

```bash
# Show image layers (CLI - good for discussion alongside Portainer)
docker history nginx:alpine

# Pull and inspect an image
docker pull python:3.11-slim
docker inspect python:3.11-slim | python3 -m json.tool | head -50

# Build a custom image
cat > Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
EOF
```

In Portainer: **Images** shows all local images with size and tags.

## Curriculum Summary

| Lesson | Portainer Feature | Docker Concept |
|--------|------------------|----------------|
| 1 | Add Container, Logs | Images and Containers |
| 2 | Console | Interactive Containers |
| 3 | Port Mapping | Network Exposure |
| 4 | Environment Variables | Configuration |
| 5 | Volumes | Data Persistence |
| 6 | Stacks | Multi-Container Apps |
| 7 | Images | Image Layers and Building |

## Conclusion

Portainer transforms Docker education by making invisible concepts visible. Students can focus on understanding what containers do rather than struggling with CLI syntax. The visual feedback loop - deploy a container, see it appear in the list, view its logs, inspect its configuration - builds intuition faster than documentation alone. As students advance, they can graduate to the CLI with a strong conceptual foundation built through the Portainer interface.

# How to Set Up Hot Reload for Development Containers in Portainer - Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Hot Reload, Development, Docker, Volume Mounts, Productivity

Description: Learn how to configure hot reload for development containers in Portainer by using bind mounts and file watchers for any language or framework.

---

Hot reload - automatically restarting or refreshing the application when code changes - is essential for productive development. This guide covers the common patterns for enabling hot reload across different tech stacks in Portainer-managed containers.

## The Core Principle: Bind Mounts

Hot reload works by mounting your source code directory from the Docker host into the container instead of copying it:

```yaml
# Key: use a bind mount (host path) instead of a COPY in Dockerfile

volumes:
  - /path/to/src:/app    # Changes on host are immediately visible inside container
  # NOT: - app_data:/app (named volumes don't reflect host file changes)
```

## Language-Specific Hot Reload Tools

| Language | Tool | Command |
|---|---|---|
| Node.js | nodemon | `nodemon server.js` |
| Python | uvicorn | `uvicorn main:app --reload` |
| Python | watchdog | `watchmedo auto-restart -d . -p '*.py' -- python app.py` |
| Go | air | `air` |
| Rust | cargo-watch | `cargo watch -x run` |
| Java/Spring | Spring Boot DevTools | `./mvnw spring-boot:run` or `./gradlew bootRun` (with DevTools) |
| Ruby/Rails | Built-in | `bin/rails server` (reloads in development between requests) |
| .NET | dotnet-watch | `dotnet watch run` |
| PHP | Built-in | `php -S 0.0.0.0:8000` (development server) |

## Generic Pattern for Any Stack

```yaml
services:
  app:
    image: <your-base-image>
    ports:
      - "8080:8080"
    volumes:
      - /path/to/src:/app                 # Bind mount source code
      - /app/node_modules                 # Exclude node_modules from bind (Node.js)
    working_dir: /app
    command: <your-hot-reload-command>
```

## Avoiding Common Pitfalls

**Problem: File changes not detected (inotify)**

On Linux, check inotify watch limits:

```bash
# Check current limit
cat /proc/sys/fs/inotify/max_user_watches

# If your project needs more watches, increase the limit, for example:
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Problem: node_modules conflicts**

Use an anonymous volume to prevent the host `node_modules` from overriding the container's:

```yaml
volumes:
  - /path/to/app:/app       # Mount source code
  - /app/node_modules       # Anonymous volume "shadows" node_modules
```

**Problem: Slow file watching on macOS**

On macOS, bind mounts on Docker Desktop can be slower. For large repositories, consider Docker Desktop Synchronized file shares to improve bind mount performance.

## Portainer Management

In Portainer, view real-time application logs while developing: **Containers > [container] > Logs** with **Auto refresh** enabled. You'll see file change detections and server restarts in real time.

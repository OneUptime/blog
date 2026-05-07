# How to Hot-Reload Code Inside a Podman Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Hot Reload, Container, Development, Live Reloading

Description: Guide to setting up hot-reload workflows inside Podman containers, covering volume mounts, file watching, polling strategies, and troubleshooting.

---

> Hot reloading inside containers should feel the same as developing on bare metal. The key is getting file change detection to work reliably across the mount boundary between your host and the container.

The typical containerized development workflow is: edit code on your host machine, have the container detect the change, and automatically rebuild or restart the application. This is called hot reloading (or live reloading), and it is the single most important feature for a productive container-based development experience. Without it, you are stuck manually rebuilding and restarting containers after every change, which destroys your feedback loop.

Podman supports hot reloading through volume mounts. You mount your source directory into the container so the running application can see your edits in real time. The challenge is that filesystem events (inotify on Linux) do not always propagate across mount boundaries, especially on macOS and Windows where containers run inside a Linux VM. This guide covers how to set up reliable hot reloading for every major language and framework.

---

## How Hot Reloading Works in Containers

Hot reloading in a container involves three components:

1. **Volume mount** - Your source code on the host is mounted into the container, so the container's filesystem reflects changes made on the host.
2. **File watcher** - A tool inside the container monitors the mounted files for changes.
3. **Rebuild/restart** - When a change is detected, the tool recompiles, restarts, or hot-swaps the updated code.

```bash
# The fundamental pattern: mount source code and run a file watcher

podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8080:8080 \
  <image> \
  <file-watcher-command>
```

## The File Watching Problem

On native Linux, Podman runs containers directly on the host kernel. Volume mounts use bind mounts, and filesystem events (inotify) propagate correctly. File watchers like `nodemon`, `watchdog`, and `inotifywait` work without any extra configuration.

On macOS and Windows, Podman runs containers inside a Linux VM. The file synchronization between the host and the VM does not always generate inotify events. This means file watchers that rely on inotify will not detect changes.

The solution is **polling**. Most file watching tools support a polling mode where they periodically check file modification times instead of relying on filesystem events.

## Setting Up Polling for Each Language

### Node.js with Nodemon

```bash
# Nodemon with polling enabled via environment variable
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v /app/node_modules \
  -w /app \
  -p 3000:3000 \
  -e CHOKIDAR_USEPOLLING=true \
  docker.io/library/node:20-slim \
  npx nodemon server.js
```

Or configure polling in `nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "js,ts,json",
  "legacyWatch": true,
  "pollingInterval": 1000
}
```

The `legacyWatch` option enables polling-based file watching in nodemon. The `CHOKIDAR_USEPOLLING` environment variable enables polling in chokidar, the underlying file watcher used by many Node.js tools including webpack and Vite.

### Node.js with Webpack Dev Server

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v /app/node_modules \
  -w /app \
  -p 3000:3000 \
  -e CHOKIDAR_USEPOLLING=true \
  -e WATCHPACK_POLLING=true \
  docker.io/library/node:20-slim \
  npx webpack serve
```

Or in `webpack.config.js`:

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  devServer: {
    host: "0.0.0.0",
    port: 3000,
    watchFiles: {
      options: {
        usePolling: true,
        interval: 1000,
      },
    },
  },
};
```

### Node.js with Vite

Vite uses chokidar internally:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v /app/node_modules \
  -w /app \
  -p 5173:5173 \
  -e CHOKIDAR_USEPOLLING=true \
  docker.io/library/node:20-slim \
  npx vite --host
```

Or in `vite.config.js`:

```javascript
// vite.config.js
export default {
  server: {
    host: "0.0.0.0",
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
};
```

### Python with Flask

Flask's debug mode includes a file watcher that supports polling via the `stat` reloader:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 5000:5000 \
  -e FLASK_DEBUG=1 \
  docker.io/library/python:3.12-slim \
  bash -c "pip install flask && flask run --host 0.0.0.0 --reload"
```

Flask uses the `stat` reloader by default, which polls for changes. This works reliably in containers without any extra configuration.

### Python with Django

Django's `runserver` also uses a stat-based reloader:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8000:8000 \
  my-django-image \
  python manage.py runserver 0.0.0.0:8000
```

If you want the stat-based polling reloader, avoid installing Watchman and `pywatchman` in the development image. If both are installed, Django uses Watchman for autoreload; `DJANGO_WATCHMAN_TIMEOUT` only changes the Watchman client timeout:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8000:8000 \
  -e DJANGO_WATCHMAN_TIMEOUT=10 \
  my-django-image \
  python manage.py runserver 0.0.0.0:8000
```

### Python with Uvicorn (FastAPI)

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8000:8000 \
  -e WATCHFILES_FORCE_POLLING=true \
  docker.io/library/python:3.12-slim \
  bash -c "pip install fastapi 'uvicorn[standard]' && uvicorn main:app --host 0.0.0.0 --reload --reload-dir /app"
```

Uvicorn's `--reload` flag uses `watchfiles` when it is installed. If `watchfiles` is not installed, Uvicorn falls back to checking modification times for `*.py` files. When using `watchfiles` across a VM-backed mount, set `WATCHFILES_FORCE_POLLING=true` if changes are not detected:

```bash
WATCHFILES_FORCE_POLLING=true uvicorn main:app --reload
```

### Go with Air

Air is the standard live-reload tool for Go:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8080:8080 \
  docker.io/library/golang:1.22 \
  bash -c "go install github.com/air-verse/air@latest && air"
```

Configure polling in `.air.toml`:

```toml
[build]
  cmd = "go build -o ./tmp/main ."
  bin = "./tmp/main"
  delay = 1000
  poll = true
  poll_interval = 500
```

### Rust with cargo-watch

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v cargo-registry:/usr/local/cargo/registry \
  -w /app \
  -p 8080:8080 \
  docker.io/library/rust:1.77-slim \
  bash -c "cargo install cargo-watch && cargo watch --poll -x run"
```

The `--poll` flag tells cargo-watch to use polling instead of inotify.

### .NET with dotnet watch

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 5000:5000 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e DOTNET_USE_POLLING_FILE_WATCHER=true \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet watch run --urls http://0.0.0.0:5000
```

The `DOTNET_USE_POLLING_FILE_WATCHER=true` environment variable is the key. Without it, `dotnet watch` relies on inotify, which may not work across mount boundaries.

### Ruby with Rails

Rails in development mode auto-reloads code on each request, but it needs to be configured for polling:

```ruby
# config/environments/development.rb
Rails.application.configure do
  config.file_watcher = ActiveSupport::FileUpdateChecker
end
```

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v gem-cache:/usr/local/bundle \
  -w /app \
  -p 3000:3000 \
  my-rails-image \
  bundle exec rails server -b 0.0.0.0
```

### PHP with Apache/Nginx

PHP served through Apache or Nginx does not need a file watcher at all. PHP re-reads the script file on every request, so changes are picked up immediately:

```bash
podman run -it --rm \
  -v $(pwd):/var/www/html:Z \
  -p 8080:80 \
  docker.io/library/php:8.3-apache
```

If you are using OPcache in development, disable it or configure it to check for file changes:

```ini
; Disable OPcache in development for immediate file changes
opcache.enable=0
```

### Java with Spring Boot DevTools

Spring Boot DevTools provides automatic restart when classpath files change:

```bash
podman run -it --rm \
  -v $(pwd)/src:/app/src:Z \
  -v maven-cache:/root/.m2 \
  -w /app \
  -p 8080:8080 \
  -e SPRING_DEVTOOLS_RESTART_POLL_INTERVAL=2s \
  -e SPRING_DEVTOOLS_RESTART_QUIET_PERIOD=1s \
  my-spring-image \
  mvn spring-boot:run
```

Make sure `spring-boot-devtools` is in your `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

## Using a Generic File Watcher

If your language or framework does not have a built-in file watcher, you can use `entr` or `inotifywait`:

```bash
# Install and use entr to re-run a command when files change
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y entr && find . -name '*.py' | entr -r python main.py"
```

Or write a simple polling script:

```bash
#!/bin/bash
# poll-reload.sh - generic polling file watcher
WATCH_DIR="${1:-.}"
COMMAND="${@:2}"
LAST_HASH=""

while true; do
  # Generate a hash of all source file timestamps
  CURRENT_HASH=$(find "$WATCH_DIR" -type f \( -name "*.py" -o -name "*.js" -o -name "*.go" \) -exec stat -c '%Y' {} \; | md5sum)

  if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
    echo "Change detected, restarting..."
    # Kill the previous process if running
    kill $PID 2>/dev/null
    $COMMAND &
    PID=$!
    LAST_HASH=$CURRENT_HASH
  fi

  sleep 2
done
```

## Optimizing Volume Mount Performance

Volume mount performance affects how quickly file changes are visible inside the container.

### On macOS

Podman on macOS uses a Linux VM. File synchronization between the host and VM can be slow for large directories. Strategies to improve it:

```bash
# Only mount the source directory, not the entire project
podman run -it --rm \
  -v $(pwd)/src:/app/src:Z \
  -p 3000:3000 \
  my-dev-image

# Exclude directories that do not need hot reloading
# Keep dependency and build output directories out of bind mounts when possible
```

### Exclude Large Directories

Never mount directories that the container manages internally (like `node_modules`, `vendor`, or `target`). Use anonymous volumes to shadow them:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v /app/node_modules \
  -v /app/.next \
  -v /app/dist \
  -p 3000:3000 \
  my-node-app
```

## Composing Hot Reload in docker-compose.yml

Here is a pattern that works across languages:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app:Z
      - /app/node_modules  # Exclude container-managed dirs
    environment:
      # Enable polling for reliable file watching
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
      DOTNET_USE_POLLING_FILE_WATCHER: "true"
```

## Troubleshooting Hot Reload

### Changes Are Not Detected

1. Verify the mount is working:

```bash
# Check that host files are visible in the container
podman exec <container_id> ls -la /app
```

2. Enable polling mode for your file watcher (see the language-specific sections above).

3. Check that you are mounting the correct directory. A common mistake is mounting the project root when the watcher only looks at a subdirectory.

### Changes Are Detected but the App Does Not Restart

1. Check the file watcher's include/exclude patterns. Some watchers ignore certain file extensions by default.

2. Make sure the watcher is monitoring the mounted path, not a different directory.

### Hot Reload Is Slow

1. Reduce the polling interval. Most tools default to 1000ms, which adds a 1-second delay to every change. You can lower it to 300-500ms.

2. Mount only the directories that need hot reloading (typically `src/`) instead of the entire project.

3. Exclude build output directories, dependency directories, and version control directories from the watcher's scope.

## Conclusion

Hot reloading inside Podman containers works reliably once you understand the file watching mechanism. On Linux, inotify events propagate through bind mounts, and most tools work without configuration. On macOS and Windows, you need polling because filesystem events do not cross the VM boundary. Every major framework and language has a way to enable polling, usually through an environment variable or a configuration flag. The other essential practice is excluding container-managed directories like `node_modules` or `target` with anonymous volumes, both for correctness and performance. With these two adjustments, developing inside a container feels the same as developing on bare metal.

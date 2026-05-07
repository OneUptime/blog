# How to Use STOPSIGNAL Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, STOPSIGNAL, Graceful Shutdown, DevOps

Description: Learn how to use the STOPSIGNAL instruction in Containerfiles for Podman to control how containers receive shutdown signals and enable graceful termination.

---

> Choosing the right stop signal is the difference between a graceful shutdown that preserves data and a hard kill that leaves your application in an inconsistent state.

When you stop a container, Podman sends a signal to the main process inside it. By default, that signal is SIGTERM. But not every application handles SIGTERM, and some need a different signal to shut down gracefully. The STOPSIGNAL instruction lets you specify exactly which signal Podman should send when stopping your container. This guide explores how to use STOPSIGNAL to ensure clean container shutdowns.

---

## What Is the STOPSIGNAL Instruction?

The STOPSIGNAL instruction sets the system call signal that will be sent to the container's PID 1 process when Podman needs to stop it. The default is SIGTERM (signal 15).

The syntax accepts either a signal name or number:

```dockerfile
STOPSIGNAL SIGQUIT
```

or

```dockerfile
STOPSIGNAL 3
```

## How Container Stopping Works

Understanding the full stop sequence is important. When you run `podman stop`, the following happens:

1. Podman sends the configured stop signal (default SIGTERM) to PID 1 in the container.
2. Podman waits for a grace period (default 10 seconds) for the process to exit.
3. If the process has not exited after the grace period, Podman sends SIGKILL to forcefully terminate it.

You can customize the grace period:

```bash
podman stop --time 30 my-container
```

The STOPSIGNAL instruction controls step 1 of this sequence.

## Common Stop Signals

Different applications expect different signals for graceful shutdown. Here are the most commonly used ones:

**SIGTERM (15)** is the default. Most well-behaved applications handle this signal to initiate a clean shutdown. It is the standard termination signal on Unix systems.

**SIGQUIT (3)** is used by applications that should dump their state or generate a core dump before exiting. Nginx uses this for graceful shutdown.

**SIGINT (2)** is the interrupt signal, equivalent to pressing Ctrl+C. Some interactive applications and development servers handle this signal.

**SIGWINCH (28)** is used by Apache HTTP Server for graceful shutdown in some configurations.

**SIGUSR1 (10)** and **SIGUSR2 (12)** are user-defined signals that applications can use for custom behaviors.

## STOPSIGNAL with Nginx

Nginx uses SIGQUIT for graceful shutdown, which allows it to finish serving active requests before terminating:

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY html/ /usr/share/nginx/html/

STOPSIGNAL SIGQUIT

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

With SIGQUIT, Nginx will stop accepting new connections but continue processing in-flight requests until they complete. This prevents clients from receiving connection reset errors during deployments.

Compare the behavior:

```bash
# Build and run

podman build -t my-nginx .
podman run -d --name web -p 8080:80 my-nginx

# Graceful stop - finishes serving active requests
podman stop web

# Check logs to verify graceful shutdown
podman logs web
```

## STOPSIGNAL with Apache

Apache HTTP Server can use SIGWINCH for a graceful stop that finishes active requests:

```dockerfile
FROM httpd:2.4-alpine

COPY httpd.conf /usr/local/apache2/conf/httpd.conf
COPY html/ /usr/local/apache2/htdocs/

STOPSIGNAL SIGWINCH

EXPOSE 80
CMD ["httpd-foreground"]
```

## STOPSIGNAL with Custom Applications

For custom applications, you need to implement signal handling. Here is a Node.js example:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Use SIGINT because our app handles it
STOPSIGNAL SIGINT

EXPOSE 3000
CMD ["node", "server.js"]
```

The corresponding Node.js application handles the signal:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello World\n');
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// Handle SIGINT for graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');

  server.close(() => {
    console.log('All connections closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if connections are not closed
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});
```

## STOPSIGNAL with Python Applications

Python applications commonly use SIGTERM, but you might want SIGINT for applications that are already written to handle it gracefully:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

STOPSIGNAL SIGINT

CMD ["python", "server.py"]
```

Python signal handling:

```python
import signal
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

server = HTTPServer(('0.0.0.0', 8000), SimpleHTTPRequestHandler)

def shutdown_handler(signum, frame):
    print(f"Received signal {signum}, shutting down...")
    threading.Thread(target=server.shutdown, daemon=True).start()

signal.signal(signal.SIGINT, shutdown_handler)
signal.signal(signal.SIGTERM, shutdown_handler)

print("Server starting on port 8000")
try:
    server.serve_forever()
finally:
    server.server_close()
    sys.exit(0)
```

## STOPSIGNAL with Java Applications

Java applications often need SIGTERM to trigger their shutdown hooks:

```dockerfile
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY target/app.jar .

# SIGTERM is the default, but being explicit is good documentation
STOPSIGNAL SIGTERM

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Java's Runtime shutdown hooks run automatically on SIGTERM:

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    System.out.println("Shutting down gracefully...");
    server.stop();
    database.close();
}));
```

## Overriding STOPSIGNAL at Runtime

You can override the stop signal when creating a container, or send a different signal manually:

```bash
# Override with a different signal
podman run -d --stop-signal SIGINT --name my-app my-image

# Or send a one-off signal manually
podman kill --signal SIGQUIT my-app
```

The `podman kill` command sends a signal without the grace period. Use `podman stop` for graceful shutdown with the timeout.

## Testing Stop Behavior

Verify your container shuts down correctly by checking the exit code and logs:

```bash
# Run the container
podman run -d --name test-app my-app

# Stop it and check the exit code
podman stop test-app
podman inspect test-app --format '{{.State.ExitCode}}'

# View shutdown logs
podman logs --tail 20 test-app

# Test with a short timeout to verify behavior under pressure
podman run -d --name test-app-2 my-app
podman stop --time 2 test-app-2
podman inspect test-app-2 --format '{{.State.ExitCode}}'
```

An exit code of 0 indicates a clean shutdown. An exit code of 137 (128 + 9) means the process was killed by SIGKILL, which means it did not shut down within the grace period.

## STOPSIGNAL in Podman Compose

You can also set the stop signal in a compose file:

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
    stop_signal: SIGQUIT
    stop_grace_period: 30s
```

The `stop_grace_period` in compose controls the same grace period as `podman stop --time`.

## Best Practices

Use STOPSIGNAL when your application requires a specific signal for graceful shutdown. Always verify that your application actually handles the configured signal. Test shutdown behavior by checking exit codes and logs. Set an appropriate stop timeout that gives your application enough time to clean up. For web servers, use the signal that lets them drain existing connections (SIGQUIT for Nginx, SIGWINCH for Apache). Document the chosen signal in your Containerfile with a comment explaining why. Prefer SIGTERM as the default unless your application has a specific reason to use a different signal. Ensure your process runs as PID 1 (use exec form for CMD/ENTRYPOINT) so it actually receives the signal.

## Conclusion

The STOPSIGNAL instruction is a small but critical detail that ensures your containers shut down cleanly. By matching the stop signal to your application's signal handling, you can prevent data loss, avoid interrupted requests, and maintain system reliability during deployments and scaling events. Pair it with appropriate timeout values and signal handlers in your application code for a complete graceful shutdown strategy.

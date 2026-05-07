# How to Use sd_notify for Auto-Update Health Checks in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, sdnotify, Health Check

Description: Learn how to use sd_notify with Podman auto-update to provide reliable health verification during image updates.

---

> Combine sd_notify readiness signals with Podman auto-update for reliable update verification that ensures new container images are working before committing to the update.

When Podman auto-update restarts a container with a new image, it needs to know whether the new version is working. The sd_notify mechanism provides this feedback loop, enabling safe updates with automatic rollback on failure.

---

## The Update Verification Flow

```text
1. Auto-update pulls new image
2. Container service restarts with new image
3. Application starts and initializes
4. Health check passes -> Podman sends READY=1 to systemd
5. systemd considers the service active
6. Update is committed
```

If step 4 fails:

```text
4. Health check fails repeatedly
5. TimeoutStartSec expires
6. systemd considers the service failed
7. Podman rolls back to the previous image
```

## Configuration with Health-Based Notification

```ini
# ~/.config/containers/systemd/api.container

[Unit]
Description=API server with update health verification

[Container]
Image=docker.io/myorg/api:latest
PublishPort=3000:3000

# Auto-update enabled
AutoUpdate=registry

# Health check for verification
HealthCmd=curl -f http://localhost:3000/health || exit 1
HealthInterval=5s
HealthTimeout=3s
HealthRetries=3
HealthStartPeriod=60s

# Signal readiness when healthy
Notify=healthy

[Service]
Type=notify
Restart=on-failure
TimeoutStartSec=120

[Install]
WantedBy=default.target
```

## Configuration with Native sd_notify

For applications that send sd_notify messages directly:

```ini
# ~/.config/containers/systemd/sd-app.container
[Unit]
Description=Application with native sd_notify

[Container]
Image=docker.io/myorg/sd-app:latest
PublishPort=3000:3000

AutoUpdate=registry
# The application sends READY=1 directly
Notify=true

[Service]
Type=notify
Restart=on-failure
TimeoutStartSec=120

[Install]
WantedBy=default.target
```

## Application-Side sd_notify Example

A Go application sending sd_notify:

```go
// Inside your container application
package main

import (
    "net"
    "net/http"
    "os"
    "time"
)

func main() {
    // Initialize the application
    setupDatabase()

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    // Start the HTTP server
    go func() {
        if err := http.ListenAndServe(":3000", nil); err != nil {
            os.Exit(1)
        }
    }()

    // Verify the server is accepting connections
    // then notify systemd
    waitForServer("127.0.0.1:3000", 10*time.Second)
    notifyReady()

    // Block forever
    select {}
}

func setupDatabase() {
    // Initialize database connections here.
}

func waitForServer(addr string, timeout time.Duration) {
    deadline := time.Now().Add(timeout)
    for time.Now().Before(deadline) {
        conn, err := net.DialTimeout("tcp", addr, time.Second)
        if err == nil {
            conn.Close()
            return
        }
        time.Sleep(200 * time.Millisecond)
    }
    os.Exit(1)
}

func notifyReady() {
    sockAddr := os.Getenv("NOTIFY_SOCKET")
    if sockAddr == "" {
        return
    }
    conn, err := net.Dial("unixgram", sockAddr)
    if err != nil {
        return
    }
    defer conn.Close()
    conn.Write([]byte("READY=1"))
}
```

## Verify the Integration

```bash
# Start the service
systemctl --user daemon-reload
systemctl --user start api.service

# Watch the service status transition
# "activating" -> health check running
# "active" -> health check passed, READY sent
watch systemctl --user status api.service

# Trigger an auto-update
podman auto-update

# Monitor the update process
journalctl --user -u api.service -f
```

## Summary

Using sd_notify with Podman auto-update creates a reliable verification loop for image updates. The `Notify=healthy` mode ties readiness to health check results, while `Notify=true` enables native sd_notify from the application. Both ensure that auto-update only commits to a new image when the application is genuinely working, with automatic rollback if it fails.

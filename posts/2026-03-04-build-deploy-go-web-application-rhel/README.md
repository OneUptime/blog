# How to Build and Deploy a Go Web Application on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Go, Golang, Web Applications, Deployment, systemd, Linux

Description: Build a Go web application and deploy it on RHEL with systemd service management, Nginx reverse proxy, and proper firewall configuration.

---

Go produces self-contained binaries that are simple to deploy. This guide covers building a Go web application and running it as a production service on RHEL.

## Build the Application

```bash
# Install Go
sudo dnf install -y golang

# Create the project
mkdir -p ~/go/src/webapp && cd ~/go/src/webapp
go mod init webapp
```

```go
// main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"
)

type HealthResponse struct {
    Status    string `json:"status"`
    Timestamp string `json:"timestamp"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    resp := HealthResponse{
        Status:    "ok",
        Timestamp: time.Now().UTC().Format(time.RFC3339),
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    mux := http.NewServeMux()
    mux.HandleFunc("/health", healthHandler)
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello from Go on RHEL\n"))
    })

    server := &http.Server{
        Addr:         ":" + port,
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    log.Printf("Starting server on port %s", port)
    log.Fatal(server.ListenAndServe())
}
```

```bash
# Build for production
CGO_ENABLED=0 go build -ldflags="-s -w" -o webapp

# Test locally
./webapp &
curl http://localhost:8080/health
kill %1
```

## Deploy the Binary

```bash
# Create a dedicated user
sudo useradd -r -s /sbin/nologin webapp

# Install the binary
sudo install -o webapp -g webapp -m 0755 webapp /usr/local/bin/webapp

# Create a configuration directory
sudo mkdir -p /etc/webapp
sudo tee /etc/webapp/env << 'ENV'
PORT=8080
ENV
sudo chown -R webapp:webapp /etc/webapp
```

## Create a Systemd Service

```bash
sudo tee /etc/systemd/system/webapp.service << 'UNIT'
[Unit]
Description=Go Web Application
After=network.target

[Service]
Type=simple
User=webapp
Group=webapp
EnvironmentFile=/etc/webapp/env
ExecStart=/usr/local/bin/webapp
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadOnlyPaths=/

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=webapp

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now webapp

# Check status
sudo systemctl status webapp
sudo journalctl -u webapp -f
```

## Configure Nginx Reverse Proxy

```bash
sudo dnf install -y nginx

sudo tee /etc/nginx/conf.d/webapp.conf << 'CONF'
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
    }
}
CONF

sudo nginx -t && sudo systemctl enable --now nginx
```

## Firewall and SELinux

```bash
# Open HTTP port
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# Allow Nginx to proxy to the Go app
sudo setsebool -P httpd_can_network_connect 1
```

## Deploy Updates

```bash
# Build new version, then replace the binary
sudo systemctl stop webapp
sudo install -o webapp -g webapp -m 0755 webapp /usr/local/bin/webapp
sudo systemctl start webapp
```

Go's single-binary deployment model makes updates straightforward and rollbacks easy by keeping previous binary versions.

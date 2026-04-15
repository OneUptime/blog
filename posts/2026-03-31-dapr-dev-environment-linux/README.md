# How to Set Up Dapr Development Environment on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Linux, Development, Setup, Ubuntu

Description: Install and configure a full Dapr development environment on Linux, covering CLI setup, Docker installation, runtime initialization, and first app execution.

---

## Overview

Linux is the most common platform for Dapr development. This guide covers setting up Dapr on Ubuntu/Debian and Fedora/RHEL distributions, including Docker and the Dapr runtime.

## Step 1: Install Docker

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker

# Fedora / RHEL
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Verify:

```bash
docker --version
docker run hello-world
```

## Step 2: Install the Dapr CLI

```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

The script installs the binary to `/usr/local/bin/dapr`. Verify:

```bash
dapr --version
# CLI version: 1.14.0
```

## Step 3: Initialize Dapr

```bash
dapr init
```

Dapr pulls and starts:
- `daprio/dapr` runtime
- `redis` container on port 6379
- `openzipkin/zipkin` container on port 9411

```bash
docker ps
ls ~/.dapr/
# bin/  components/  config.yaml
```

## Step 4: Install Development Tools

For Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g @dapr/dapr
```

For Python:

```bash
sudo apt install -y python3 python3-pip python3-venv
python3 -m venv dapr-env
source dapr-env/bin/activate
pip install dapr flask
```

For Go:

```bash
sudo apt install -y golang-go
mkdir myapp && cd myapp
go mod init myapp
go get github.com/dapr/go-sdk/client
```

## Step 5: Create a Sample Application

```python
# app.py
from dapr.clients import DaprClient

with DaprClient() as client:
    # Save state
    client.save_state(
        store_name='statestore',
        key='hello',
        value=b'world'
    )

    # Get state
    result = client.get_state(
        store_name='statestore',
        key='hello'
    )
    print(f"Value: {result.data}")
```

Run it:

```bash
dapr run --app-id python-demo python3 app.py
```

## Step 6: Verify Dapr Is Working

```bash
# Check running apps
dapr list

# Test HTTP API directly
curl http://localhost:3500/v1.0/metadata

# Check component health
curl http://localhost:3500/v1.0/healthz
```

## Step 7: Configure Systemd Service (Optional)

For persistent background services, create a systemd unit:

```bash
sudo tee /etc/systemd/system/dapr-app.service <<EOF
[Unit]
Description=My Dapr Application
After=docker.service

[Service]
User=$USER
ExecStart=/usr/local/bin/dapr run --app-id my-app --app-port 8080 node /opt/app/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now dapr-app
```

## Summary

Setting up Dapr on Linux involves three steps: install Docker, install the Dapr CLI, and run `dapr init`. The initialization process handles all dependencies including Redis and Zipkin containers. Linux is the recommended platform for Dapr development, offering the closest match to production Kubernetes environments and the best toolchain compatibility.

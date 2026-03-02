# How to Set Up Nomad for Container Orchestration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nomad, Container, DevOps, Orchestration

Description: Step-by-step guide to installing and configuring HashiCorp Nomad for container orchestration on Ubuntu, covering single-node and multi-node cluster setups.

---

Kubernetes gets all the attention, but for many workloads it brings far more complexity than you need. Nomad, HashiCorp's workload orchestrator, handles containers, VMs, and raw binaries with a simpler operational model. A Nomad cluster can be up and running in an afternoon, and the job specification format is far less verbose than Kubernetes YAML.

## What Nomad Does Differently

Nomad separates concerns clearly. The Nomad server handles scheduling - deciding which client node runs each task. Nomad clients run the actual workloads. You can run server and client on the same node for small setups, or split them for production.

Nomad doesn't care what your workload is. The same scheduler handles Docker containers, Podman containers, Java JARs, Python scripts, and system processes. You pick the task driver per job.

## Installing Nomad on Ubuntu

HashiCorp maintains an official APT repository:

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y wget gpg curl

# Add HashiCorp's GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | \
    sudo gpg --dearmit -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install
sudo apt-get update
sudo apt-get install -y nomad

# Verify the installation
nomad version
```

If you want Docker support, install Docker as well:

```bash
# Install Docker
sudo apt-get install -y docker.io

# Add the nomad user to the docker group so it can manage containers
sudo usermod -aG docker nomad

# Verify Docker is running
sudo systemctl start docker
sudo systemctl enable docker
```

## Configuring a Single-Node Server and Client

For development or small deployments, running both server and client on one node works well. Create the configuration directory structure first:

```bash
# Create directories
sudo mkdir -p /etc/nomad.d
sudo mkdir -p /opt/nomad/data
sudo mkdir -p /opt/nomad/plugins
```

Write the server configuration:

```hcl
# /etc/nomad.d/server.hcl
# Nomad server configuration

# Data directory for state
data_dir = "/opt/nomad/data"

# Bind to all interfaces
bind_addr = "0.0.0.0"

# Server-specific configuration
server {
  enabled          = true
  # Number of servers in the cluster (1 for single-node, 3 or 5 for HA)
  bootstrap_expect = 1
}

# Client configuration (running on same node as server)
client {
  enabled = true

  # Tell the client where to find servers
  servers = ["127.0.0.1:4647"]

  # Resource limits for this node
  meta {
    "node.type" = "general"
    "node.region" = "us-east"
  }
}

# Configure the Docker task driver
plugin "docker" {
  config {
    # Allow privileged containers (disable in production if not needed)
    allow_privileged = false

    # Volumes that containers are allowed to mount
    volumes {
      enabled      = true
      selinuxlabel = "z"
    }
  }
}

# Telemetry configuration
telemetry {
  publish_allocation_metrics = true
  publish_node_metrics       = true
}

# UI and API
ui {
  enabled = true
}
```

Create a systemd unit file for Nomad:

```ini
# /etc/systemd/system/nomad.service

[Unit]
Description=Nomad
Documentation=https://www.nomadproject.io/docs/
Wants=network-online.target
After=network-online.target
# Nomad should start after Docker if using the Docker driver
After=docker.service

[Service]
# Run as root since Nomad needs to manage processes and cgroups
ExecReload=/bin/kill -HUP $MAINPID
ExecStart=/usr/bin/nomad agent -config /etc/nomad.d/
KillMode=process
KillSignal=SIGINT
LimitNOFILE=65536
LimitNPROC=infinity
Restart=on-failure
RestartSec=2
TasksMax=infinity
OOMScoreAdjust=-1000

[Install]
WantedBy=multi-user.target
```

Enable and start Nomad:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nomad
sudo systemctl start nomad

# Check status
sudo systemctl status nomad

# Verify the cluster is healthy
nomad server members
nomad node status
```

## Writing Your First Job

Nomad uses job files written in HCL (the same language as Terraform). This example runs an Nginx container:

```hcl
# nginx.nomad - A simple Nginx web server job

job "nginx" {
  # Run in the default datacenter
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    # Run one instance
    count = 1

    # Expose port 80 from the container
    network {
      port "http" {
        to = 80  # Container port
        # static = 8080  # Uncomment to use a fixed host port
      }
    }

    # Health check via Consul (if integrated)
    service {
      name = "nginx"
      port = "http"

      check {
        type     = "http"
        path     = "/"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:1.25-alpine"
        ports = ["http"]

        # Mount a custom config if needed
        # volumes = ["/etc/nginx/nginx.conf:/etc/nginx/nginx.conf"]
      }

      # Resource limits for this task
      resources {
        cpu    = 200  # MHz
        memory = 128  # MB
      }

      # Environment variables
      env {
        NGINX_HOST = "example.com"
      }
    }
  }
}
```

Submit and manage the job:

```bash
# Validate the job spec before submitting
nomad job validate nginx.nomad

# Show what would change without applying
nomad job plan nginx.nomad

# Submit the job
nomad job run nginx.nomad

# Check job status
nomad job status nginx

# List all allocations for the job
nomad alloc list -job nginx

# Stream logs from a running allocation
nomad alloc logs <alloc-id> nginx

# Tail logs continuously
nomad alloc logs -f <alloc-id> nginx
```

## Multi-Node Cluster Setup

For a three-node HA cluster, use separate server and client configurations. On the server nodes:

```hcl
# /etc/nomad.d/server.hcl (on server nodes only)
data_dir  = "/opt/nomad/data"
bind_addr = "0.0.0.0"

advertise {
  # Use the node's actual IP, not 0.0.0.0
  http = "10.0.1.10"
  rpc  = "10.0.1.10"
  serf = "10.0.1.10"
}

server {
  enabled          = true
  bootstrap_expect = 3  # Total number of server nodes

  # List all server addresses for cluster formation
  server_join {
    retry_join = [
      "10.0.1.10",
      "10.0.1.11",
      "10.0.1.12"
    ]
  }
}
```

On the client nodes:

```hcl
# /etc/nomad.d/client.hcl (on worker nodes only)
data_dir  = "/opt/nomad/data"
bind_addr = "0.0.0.0"

advertise {
  http = "10.0.1.20"  # This node's IP
  rpc  = "10.0.1.20"
  serf = "10.0.1.20"
}

client {
  enabled = true

  server_join {
    retry_join = [
      "10.0.1.10",
      "10.0.1.11",
      "10.0.1.12"
    ]
  }

  # Node metadata for scheduling constraints
  meta {
    "node.type" = "worker"
    "rack"      = "rack-1"
  }
}
```

## Accessing the Web UI

Nomad includes a built-in web interface:

```bash
# The UI is available at http://server-ip:4646/ui
# If running locally, open a browser to:
# http://localhost:4646/ui

# You can also check the API directly
curl http://localhost:4646/v1/jobs
curl http://localhost:4646/v1/nodes
curl http://localhost:4646/v1/agent/self
```

## Updating and Stopping Jobs

```bash
# Update a running job (edit the .nomad file first, then re-run)
nomad job run nginx.nomad

# Scale a job up or down
nomad job scale nginx web 3

# Stop a job (keeps the job definition, stops allocations)
nomad job stop nginx

# Purge a job completely
nomad job stop -purge nginx
```

Nomad's operational simplicity makes it worth considering seriously before reaching for something heavier. The same binary runs server, client, and the CLI, deployment is a single package, and you can be running real workloads within minutes of installation.

# How to Deploy a Nomad Cluster for Workload Orchestration on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nomad, HashiCorp, Orchestration, Linux

Description: Install and configure a HashiCorp Nomad cluster on RHEL for orchestrating containers, VMs, and standalone applications.

---

HashiCorp Nomad is a workload orchestrator that can schedule containers, binaries, VMs, and Java applications. It is simpler than Kubernetes and works well for mixed workloads. Here is how to deploy a Nomad cluster on RHEL.

## Installing Nomad

```bash
# Add the HashiCorp repository
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Nomad
sudo dnf install nomad -y

# Verify the installation
nomad version
```

## Configuring a Nomad Server

Create the server configuration on your Nomad server nodes (run 3 or 5 for high availability):

```bash
# Create the data directory
sudo mkdir -p /opt/nomad/data

# Create the server configuration
sudo tee /etc/nomad.d/nomad.hcl << 'EOF'
# Nomad server configuration
datacenter = "dc1"
data_dir   = "/opt/nomad/data"

# Server settings
server {
  enabled          = true
  bootstrap_expect = 3  # Number of server nodes to form a cluster
}

# Bind to the server's IP
bind_addr = "0.0.0.0"

advertise {
  http = "192.168.1.10:4646"
  rpc  = "192.168.1.10:4647"
  serf = "192.168.1.10:4648"
}
EOF

# Enable and start Nomad
sudo systemctl enable --now nomad
```

## Joining Server Nodes

On the second and third server nodes, join the first:

```bash
# On server 2 and 3, after starting Nomad with similar config
nomad server join 192.168.1.10:4648

# Verify the cluster
nomad server members
```

## Configuring Nomad Client Nodes

On worker nodes that will run jobs:

```bash
# Install Nomad (same as above)
sudo dnf install nomad -y

# Install container runtime (for Docker driver)
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install docker-ce -y
sudo systemctl enable --now docker

# Create the client configuration
sudo tee /etc/nomad.d/nomad.hcl << 'EOF'
datacenter = "dc1"
data_dir   = "/opt/nomad/data"

# Client settings
client {
  enabled = true
  servers = ["192.168.1.10:4647", "192.168.1.11:4647", "192.168.1.12:4647"]
}

# Enable the Docker driver
plugin "docker" {
  config {
    allow_privileged = false
  }
}
EOF

sudo systemctl enable --now nomad
```

## Firewall Configuration

```bash
# Open Nomad ports on all nodes
sudo firewall-cmd --permanent --add-port=4646/tcp  # HTTP API
sudo firewall-cmd --permanent --add-port=4647/tcp  # RPC
sudo firewall-cmd --permanent --add-port=4648/tcp  # Serf gossip (TCP)
sudo firewall-cmd --permanent --add-port=4648/udp  # Serf gossip (UDP)
sudo firewall-cmd --reload
```

## Deploying a Job

```bash
# Create a simple web server job
cat > /tmp/web.nomad.hcl << 'EOF'
job "web" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 3

    network {
      port "http" {
        to = 80
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:latest"
        ports = ["http"]
      }

      resources {
        cpu    = 200   # MHz
        memory = 128   # MB
      }
    }
  }
}
EOF

# Submit the job
nomad job run /tmp/web.nomad.hcl

# Check job status
nomad job status web

# View allocations (running instances)
nomad job allocs web
```

## Scaling and Updating

```bash
# Scale the job
nomad job scale web web 5

# Update the job (edit the job file and resubmit)
# Nomad performs rolling updates by default
nomad job run /tmp/web.nomad.hcl

# View deployment status
nomad job deployments web
```

## Accessing the Nomad UI

```bash
# The Nomad UI is available at http://server-ip:4646
# Access it from your browser
echo "Nomad UI: http://192.168.1.10:4646"

# For production, put it behind a reverse proxy with authentication
```

Nomad provides a lighter-weight alternative to Kubernetes that can orchestrate both containerized and non-containerized workloads on RHEL.

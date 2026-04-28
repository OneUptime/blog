# How to Configure Nomad with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, IPv6, HashiCorp, Container Orchestration, Networking

Description: A guide to configuring HashiCorp Nomad for IPv6 networking, including client configuration, job spec with IPv6 addresses, and service discovery over IPv6.

HashiCorp Nomad supports IPv6 for both its own communication (between clients and servers) and for workloads running on the cluster. This guide covers the key configuration points for IPv6 in Nomad deployments.

## Nomad Server/Client IPv6 Configuration

```hcl
# /etc/nomad.d/nomad.hcl (client config)

data_dir  = "/opt/nomad/data"
bind_addr = "::"    # Bind to all interfaces, including IPv6

# Advertise IPv6 address for client registration

advertise {
  http = "[2001:db8::1]:4646"
  rpc  = "[2001:db8::1]:4647"
  serf = "[2001:db8::1]:4648"
}

client {
  enabled = true

  # Assign both IPv4 and IPv6 CIDR ranges
  network_interface = "eth0"

  # Reserve some IPs for static allocation
  reserved {
    cpu            = 100
    memory         = 256
    disk           = 1024
    reserved_ports = "22,80,443"
  }
}

# CNI plugins for advanced networking
plugin "docker" {
  config {
    allow_privileged = false
  }
}
```

## Nomad Job Specification with IPv6

### Basic Job with IPv6 Network

```hcl
# web.nomad

job "web" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 3

    # Request IPv6 network
    network {
      mode = "bridge"   # or "host" for host networking

      port "http" {
        static = 80
      }

      port "https" {
        static = 443
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:alpine"

        # Expose on IPv6
        ports = ["http", "https"]
      }

      resources {
        cpu    = 500
        memory = 256
      }
    }

    # Service registration with IPv6
    service {
      name = "web"
      port = "http"

      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"
      }
    }
  }
}
```

## Host Networking with IPv6

```hcl
job "ipv6-service" {
  datacenters = ["dc1"]

  group "service" {
    network {
      mode = "host"   # Use host network (direct access to host IPv6)
    }

    task "app" {
      driver = "docker"

      config {
        image        = "my-app:latest"
        network_mode = "host"
      }

      # Environment variables for IPv6 binding
      env {
        BIND_ADDR = "::"
        BIND_PORT = "8080"
      }
    }
  }
}
```

## Consul Service Discovery with IPv6

When Nomad uses Consul for service discovery, services can be discovered via IPv6:

```hcl
# In Consul configuration
bind_addr = "::"
advertise_addr = "2001:db8::2"

# Services registered by Nomad are discoverable via IPv6
# DNS: web.service.consul resolves to both IPv4 and IPv6
```

```bash
# Query Consul for IPv6 service endpoints
dig AAAA web.service.consul @[::1]:8600

# Using consul CLI
consul catalog services -node=nomad-client1
```

## Environment Template for IPv6 Addresses

```hcl
# Job template: inject node's IPv6 address into app
task "app" {
  driver = "docker"

  config {
    image = "my-app:latest"
  }

  # Use Nomad template to get node's IPv6 address
  template {
    data = <<EOT
LISTEN_ADDR={{ env "NOMAD_IP_http" }}
LISTEN_PORT={{ env "NOMAD_PORT_http" }}
NODE_IPV6={{ env "attr.unique.network.ip-address" }}
EOT
    destination = "local/config.env"
    env         = true
  }
}
```

## Verifying IPv6 Nomad Configuration

```bash
# Check Nomad server status
nomad server members | grep -E "Alive|Address"

# List nodes with their IPv6 addresses
nomad node status -verbose

# Check a job's allocation networking
nomad alloc status <alloc_id>

# Exec into an allocation to test IPv6
nomad alloc exec -task nginx <alloc_id> ip -6 addr show

# Verify service is reachable via IPv6
curl -6 http://[2001:db8::1]/
```

Nomad's flexible networking modes allow IPv6 adoption at the cluster level (IPv6 server communication) and at the workload level (host networking for direct IPv6 access or bridge networking for isolated IPv6 containers).

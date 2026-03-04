# How to Deploy a Nomad Cluster for Workload Orchestration on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Nomad

Description: Step-by-step guide on deploy a nomad cluster for workload orchestration on rhel 9 with practical examples and commands.

---

HashiCorp Nomad provides flexible workload orchestration on RHEL 9 for containers, binaries, and other task types.

## Install Nomad

```bash
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo dnf install -y nomad
```

## Configure a Server Node

```bash
sudo tee /etc/nomad.d/server.hcl <<EOF
datacenter = "dc1"
data_dir   = "/opt/nomad/data"

server {
  enabled          = true
  bootstrap_expect = 3
}

addresses {
  http = "0.0.0.0"
}
EOF
```

## Configure a Client Node

```bash
sudo tee /etc/nomad.d/client.hcl <<EOF
datacenter = "dc1"
data_dir   = "/opt/nomad/data"

client {
  enabled = true
  servers = ["10.0.1.11:4647", "10.0.1.12:4647", "10.0.1.13:4647"]
}

plugin "docker" {
  config {
    allow_privileged = false
  }
}
EOF
```

## Start Nomad

```bash
sudo systemctl enable --now nomad
```

## Deploy a Job

```hcl
# web.nomad
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
        cpu    = 200
        memory = 256
      }
    }
  }
}
```

```bash
nomad job run web.nomad
nomad job status web
```

## Conclusion

Nomad on RHEL 9 provides lightweight, flexible workload orchestration that supports containers, binaries, and other task types. It is simpler than Kubernetes for organizations that do not need the full Kubernetes feature set.


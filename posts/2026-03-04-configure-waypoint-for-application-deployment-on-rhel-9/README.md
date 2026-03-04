# How to Configure Waypoint for Application Deployment on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Waypoint, HashiCorp, Deployment, DevOps, Linux

Description: Learn how to install and configure HashiCorp Waypoint on RHEL to build, deploy, and release applications across Docker, Kubernetes, and other platforms using a consistent workflow.

---

HashiCorp Waypoint provides a consistent workflow for building, deploying, and releasing applications regardless of the target platform. Whether you deploy to Docker, Kubernetes, AWS ECS, or bare metal, Waypoint gives you the same interface. This guide covers installing and using Waypoint on RHEL.

## How Waypoint Works

Waypoint uses a single configuration file (waypoint.hcl) to define three phases:

- **Build** - creates an artifact (Docker image, binary, etc.)
- **Deploy** - pushes the artifact to a platform (Kubernetes, Docker, etc.)
- **Release** - manages traffic routing to the deployment (load balancers, DNS, etc.)

Each phase uses a plugin that handles the platform-specific details.

## Prerequisites

- RHEL with root or sudo access
- Docker or Podman installed for container builds
- A Kubernetes cluster (optional, for Kubernetes deployments)

## Installing Waypoint

```bash
# Add the HashiCorp repository
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
```

```bash
# Install Waypoint
sudo dnf install -y waypoint
```

Verify the installation:

```bash
# Check the version
waypoint version
```

## Installing the Waypoint Server

Waypoint needs a server to store state and coordinate operations. Install it using Docker:

```bash
# Install and start the Waypoint server
waypoint install -platform=docker -accept-tos
```

For Kubernetes:

```bash
# Install Waypoint server in Kubernetes
waypoint install -platform=kubernetes -accept-tos
```

The install command outputs a token that you use to authenticate.

## Setting Up a Project

Create a project directory with a waypoint.hcl file:

```bash
# Create a sample application
mkdir -p /opt/myapp
cd /opt/myapp
```

Create a simple web application:

```bash
# Create a simple Go web server
cat > main.go << 'EOF'
package main

import (
    "fmt"
    "net/http"
    "os"
)

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from Waypoint on RHEL!")
    })
    fmt.Printf("Listening on port %s\n", port)
    http.ListenAndServe(":"+port, nil)
}
EOF
```

Create a Dockerfile:

```bash
# Create a Dockerfile
cat > Dockerfile << 'EOF'
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY main.go .
RUN go build -o server main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
EOF
```

## Creating the Waypoint Configuration

```bash
# Create the waypoint.hcl configuration
cat > waypoint.hcl << 'EOF'
project = "myapp"

app "web" {
  build {
    use "docker" {}

    registry {
      use "docker" {
        image = "myapp-web"
        tag   = "latest"
        local = true
      }
    }
  }

  deploy {
    use "docker" {
      service_port = 8080
    }
  }
}
EOF
```

## Initializing the Project

```bash
# Initialize the Waypoint project
waypoint init
```

## Building and Deploying

Run the full build, deploy, and release cycle:

```bash
# Build, deploy, and release in one command
waypoint up
```

Or run each phase separately:

```bash
# Build the application
waypoint build
```

```bash
# Deploy the built artifact
waypoint deploy
```

```bash
# Release (route traffic to the deployment)
waypoint release
```

## Deploying to Kubernetes

Update the waypoint.hcl for Kubernetes deployments:

```hcl
project = "myapp"

app "web" {
  build {
    use "docker" {}

    registry {
      use "docker" {
        image = "registry.example.com/myapp-web"
        tag   = gitrefpretty()
      }
    }
  }

  deploy {
    use "kubernetes" {
      probe_path = "/health"
      replicas   = 3
      service_port = 8080

      static_environment = {
        "ENV" = "production"
      }
    }
  }

  release {
    use "kubernetes" {
      port = 80
    }
  }
}
```

## Using Variables and Environment

Waypoint supports input variables:

```hcl
variable "replicas" {
  type    = number
  default = 2
}

variable "env" {
  type    = string
  default = "staging"
}

app "web" {
  deploy {
    use "kubernetes" {
      replicas = var.replicas
      static_environment = {
        "APP_ENV" = var.env
      }
    }
  }
}
```

Set variables at runtime:

```bash
# Deploy with custom variables
waypoint up -var replicas=5 -var env=production
```

## Checking Deployment Status

```bash
# View deployment status
waypoint status
```

```bash
# View deployment logs
waypoint logs
```

```bash
# List all deployments
waypoint deployment list
```

## Running Exec Commands

```bash
# Execute a command in the running deployment
waypoint exec -- /bin/sh
```

## Viewing the UI

Waypoint includes a web UI:

```bash
# Get the UI URL
waypoint ui
```

The UI shows projects, deployments, builds, and release history.

## Destroying Deployments

```bash
# Destroy the current deployment
waypoint destroy
```

## Conclusion

HashiCorp Waypoint on RHEL provides a unified workflow for building, deploying, and releasing applications across different platforms. By defining your deployment pipeline in a single waypoint.hcl file, you get a consistent experience whether you target Docker containers, Kubernetes clusters, or cloud platforms. The built-in UI and CLI give you visibility into every phase of the deployment lifecycle.

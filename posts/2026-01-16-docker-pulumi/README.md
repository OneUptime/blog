# How to Use Docker with Pulumi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Pulumi, IaC, DevOps, Infrastructure

Description: Learn how to manage Docker resources with Pulumi using familiar programming languages like TypeScript, Python, and Go for infrastructure as code.

---

Pulumi enables managing Docker infrastructure using general-purpose programming languages, providing type safety, testing capabilities, and familiar development workflows. This guide covers using Pulumi to manage Docker containers, images, and networks.

## Getting Started

### Install Pulumi

```bash
# macOS
brew install pulumi

# Linux
curl -fsSL https://get.pulumi.com | sh

# Windows
choco install pulumi
```

### Create New Project

```bash
# TypeScript
pulumi new docker-typescript

# Python
pulumi new docker-python

# Go
pulumi new docker-go
```

## TypeScript Examples

### Basic Container

```typescript
// index.ts
import * as docker from "@pulumi/docker";

// Pull image
const nginxImage = new docker.RemoteImage("nginx", {
    name: "nginx:latest",
});

// Create container
const nginxContainer = new docker.Container("nginx", {
    image: nginxImage.imageId,
    ports: [{
        internal: 80,
        external: 8080,
    }],
});

export const containerId = nginxContainer.id;
export const containerName = nginxContainer.name;
```

### Container with Configuration

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

const config = new pulumi.Config();
const environment = config.require("environment");

// Network
const network = new docker.Network("app-network", {
    name: `app-network-${environment}`,
});

// Volume
const dataVolume = new docker.Volume("data-volume", {
    name: `app-data-${environment}`,
});

// Container
const appContainer = new docker.Container("app", {
    name: `app-${environment}`,
    image: "myapp:latest",
    networksAdvanced: [{
        name: network.name,
        aliases: ["app", "api"],
    }],
    volumes: [{
        volumeName: dataVolume.name,
        containerPath: "/data",
    }],
    envs: [
        `NODE_ENV=${environment}`,
        `DATABASE_URL=${config.requireSecret("databaseUrl")}`,
    ],
    restart: "unless-stopped",
    healthcheck: {
        tests: ["CMD", "curl", "-f", "http://localhost:3000/health"],
        interval: "30s",
        timeout: "5s",
        retries: 3,
    },
});
```

### Building Images

```typescript
import * as docker from "@pulumi/docker";

// Build and push image
const appImage = new docker.Image("app-image", {
    imageName: "registry.example.com/myapp:latest",
    build: {
        context: "./app",
        dockerfile: "./app/Dockerfile",
        args: {
            VERSION: "1.0.0",
        },
    },
    registry: {
        server: "registry.example.com",
        username: config.require("registryUser"),
        password: config.requireSecret("registryPassword"),
    },
});

// Use built image
const container = new docker.Container("app", {
    image: appImage.imageName,
    // ...
});
```

## Python Examples

### Basic Setup

```python
# __main__.py
import pulumi
import pulumi_docker as docker

# Pull image
nginx_image = docker.RemoteImage("nginx",
    name="nginx:latest"
)

# Create container
nginx_container = docker.Container("nginx",
    image=nginx_image.image_id,
    ports=[docker.ContainerPortArgs(
        internal=80,
        external=8080,
    )]
)

pulumi.export("container_id", nginx_container.id)
```

### Complete Application Stack

```python
import pulumi
from pulumi import Config
import pulumi_docker as docker

config = Config()
db_password = config.require_secret("dbPassword")
environment = config.require("environment")

# Network
network = docker.Network("app-network",
    name=f"app-network-{environment}"
)

# Volumes
postgres_volume = docker.Volume("postgres-volume",
    name=f"postgres-data-{environment}"
)

redis_volume = docker.Volume("redis-volume",
    name=f"redis-data-{environment}"
)

# PostgreSQL
postgres = docker.Container("postgres",
    name=f"postgres-{environment}",
    image="postgres:15",
    envs=[
        f"POSTGRES_PASSWORD={db_password}",
        "POSTGRES_DB=myapp",
    ],
    volumes=[docker.ContainerVolumeArgs(
        volume_name=postgres_volume.name,
        container_path="/var/lib/postgresql/data",
    )],
    networks_advanced=[docker.ContainerNetworksAdvancedArgs(
        name=network.name,
        aliases=["db", "postgres"],
    )],
    healthcheck=docker.ContainerHealthcheckArgs(
        tests=["CMD-SHELL", "pg_isready -U postgres"],
        interval="10s",
        timeout="5s",
        retries=5,
    ),
    restart="unless-stopped",
)

# Redis
redis = docker.Container("redis",
    name=f"redis-{environment}",
    image="redis:7-alpine",
    command=["redis-server", "--appendonly", "yes"],
    volumes=[docker.ContainerVolumeArgs(
        volume_name=redis_volume.name,
        container_path="/data",
    )],
    networks_advanced=[docker.ContainerNetworksAdvancedArgs(
        name=network.name,
        aliases=["redis", "cache"],
    )],
    restart="unless-stopped",
)

# Application
app = docker.Container("app",
    name=f"app-{environment}",
    image="myapp:latest",
    envs=[
        f"NODE_ENV={environment}",
        db_password.apply(lambda pwd: f"DATABASE_URL=postgresql://postgres:{pwd}@postgres:5432/myapp"),
        "REDIS_URL=redis://redis:6379",
    ],
    ports=[docker.ContainerPortArgs(
        internal=3000,
        external=3000,
    )],
    networks_advanced=[docker.ContainerNetworksAdvancedArgs(
        name=network.name,
    )],
    restart="unless-stopped",
    opts=pulumi.ResourceOptions(depends_on=[postgres, redis]),
)

# Exports
pulumi.export("app_url", "http://localhost:3000")
pulumi.export("postgres_container", postgres.id)
```

## Go Examples

### Basic Container

```go
// main.go
package main

import (
    "github.com/pulumi/pulumi-docker/sdk/v4/go/docker"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // Pull image
        image, err := docker.NewRemoteImage(ctx, "nginx", &docker.RemoteImageArgs{
            Name: pulumi.String("nginx:latest"),
        })
        if err != nil {
            return err
        }

        // Create container
        container, err := docker.NewContainer(ctx, "nginx", &docker.ContainerArgs{
            Image: image.ImageId,
            Ports: docker.ContainerPortArray{
                &docker.ContainerPortArgs{
                    Internal: pulumi.Int(80),
                    External: pulumi.Int(8080),
                },
            },
        })
        if err != nil {
            return err
        }

        ctx.Export("containerId", container.ID())
        return nil
    })
}
```

## Component Resources

### Reusable Components (TypeScript)

```typescript
// components/web-service.ts
import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

export interface WebServiceArgs {
    image: string;
    port: number;
    replicas?: number;
    environment?: Record<string, string>;
    network: docker.Network;
}

export class WebService extends pulumi.ComponentResource {
    public readonly containers: docker.Container[];
    public readonly url: pulumi.Output<string>;

    constructor(name: string, args: WebServiceArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:service:WebService", name, {}, opts);

        const replicas = args.replicas || 1;
        this.containers = [];

        for (let i = 0; i < replicas; i++) {
            const container = new docker.Container(`${name}-${i}`, {
                name: `${name}-${i}`,
                image: args.image,
                envs: Object.entries(args.environment || {}).map(([k, v]) => `${k}=${v}`),
                networksAdvanced: [{
                    name: args.network.name,
                    aliases: [name],
                }],
                restart: "unless-stopped",
            }, { parent: this });

            this.containers.push(container);
        }

        // Load balancer
        const nginx = new docker.Container(`${name}-lb`, {
            name: `${name}-lb`,
            image: "nginx:alpine",
            ports: [{
                internal: 80,
                external: args.port,
            }],
            networksAdvanced: [{
                name: args.network.name,
            }],
        }, { parent: this });

        this.url = pulumi.interpolate`http://localhost:${args.port}`;

        this.registerOutputs({
            containers: this.containers,
            url: this.url,
        });
    }
}

// Usage
const network = new docker.Network("app-network");

const api = new WebService("api", {
    image: "myapi:latest",
    port: 8080,
    replicas: 3,
    environment: {
        NODE_ENV: "production",
    },
    network: network,
});
```

## Multi-Stack Deployment

### Shared Infrastructure Stack

```typescript
// infrastructure/index.ts
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

const network = new docker.Network("shared-network", {
    name: "shared-network",
});

const postgresVolume = new docker.Volume("postgres-volume");

const postgres = new docker.Container("postgres", {
    image: "postgres:15",
    networksAdvanced: [{ name: network.name }],
    volumes: [{
        volumeName: postgresVolume.name,
        containerPath: "/var/lib/postgresql/data",
    }],
    envs: ["POSTGRES_PASSWORD=secret"],
});

export const networkName = network.name;
export const postgresHost = "postgres";
```

### Application Stack

```typescript
// app/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

const infra = new pulumi.StackReference("org/infrastructure/prod");

const app = new docker.Container("app", {
    image: "myapp:latest",
    networksAdvanced: [{
        name: infra.getOutput("networkName"),
    }],
    envs: [
        pulumi.interpolate`DATABASE_HOST=${infra.getOutput("postgresHost")}`,
    ],
});
```

## Testing

### Unit Tests (TypeScript)

```typescript
// index.test.ts
import * as pulumi from "@pulumi/pulumi";

pulumi.runtime.setMocks({
    newResource: (args) => {
        return { id: `${args.name}-id`, state: args.inputs };
    },
    call: (args) => {
        return args.inputs;
    },
});

import * as infra from "./index";

describe("Infrastructure", () => {
    it("creates container with correct image", async () => {
        const container = await new Promise<any>((resolve) => {
            pulumi.all([infra.container.image]).apply(([image]) => {
                resolve({ image });
            });
        });
        expect(container.image).toContain("nginx");
    });
});
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy with Pulumi

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Pulumi Preview
        uses: pulumi/actions@v4
        with:
          command: preview
          stack-name: prod
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}

      - name: Pulumi Deploy
        if: github.ref == 'refs/heads/main'
        uses: pulumi/actions@v4
        with:
          command: up
          stack-name: prod
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
```

## Summary

| Language | Best For |
|----------|----------|
| TypeScript | Type safety, npm ecosystem |
| Python | Data teams, quick scripts |
| Go | Performance, static typing |
| C# | .NET teams |

Pulumi brings software engineering practices to infrastructure management with real programming languages. Use familiar tools like IDEs, testing frameworks, and package managers while managing Docker infrastructure. For alternative IaC approaches, see our posts on [Docker with Terraform](https://oneuptime.com/blog/post/2026-01-16-docker-terraform/view) and [Docker with Ansible](https://oneuptime.com/blog/post/2026-01-16-docker-ansible/view).


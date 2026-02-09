# How to Use Pulumi Automation API for Dynamic Kubernetes Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Kubernetes, Automation

Description: Learn how to use Pulumi Automation API to programmatically provision Kubernetes infrastructure from applications, enabling self-service platforms and dynamic environment creation without CLI interaction.

---

Pulumi Automation API lets you run Pulumi programs from code instead of the CLI. This enables self-service infrastructure platforms where applications provision their own resources, dynamic environment creation, and infrastructure-as-a-service platforms built on Kubernetes.

This guide shows you how to build automation workflows using the Pulumi Automation API.

## Understanding Automation API

Automation API embeds Pulumi into applications. Instead of running pulumi up from a terminal, your code calls Pulumi functions directly. This enables building platforms where users click buttons to provision infrastructure, or applications that create environments on demand.

The API manages stacks, configurations, and deployments programmatically. You define infrastructure in regular Pulumi code, then use Automation API to execute it.

## Setting Up Automation API

Install dependencies:

```typescript
// package.json
{
  "name": "pulumi-automation-demo",
  "version": "1.0.0",
  "dependencies": {
    "@pulumi/pulumi": "^3.100.0",
    "@pulumi/kubernetes": "^4.8.0",
    "@pulumi/aws": "^6.15.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.0.0"
  }
}
```

Create basic automation:

```typescript
// automation/deploy.ts
import * as pulumi from "@pulumi/pulumi";
import * as automation from "@pulumi/pulumi/automation";
import * as k8s from "@pulumi/kubernetes";

// Define infrastructure as a function
async function pulumiProgram() {
  const namespace = new k8s.core.v1.Namespace("app-namespace", {
    metadata: {
      name: "my-app"
    }
  });

  const deployment = new k8s.apps.v1.Deployment("app", {
    metadata: {
      namespace: namespace.metadata.name
    },
    spec: {
      replicas: 2,
      selector: {
        matchLabels: { app: "myapp" }
      },
      template: {
        metadata: {
          labels: { app: "myapp" }
        },
        spec: {
          containers: [{
            name: "app",
            image: "nginx:latest",
            ports: [{ containerPort: 80 }]
          }]
        }
      }
    }
  });

  return {
    namespaceName: namespace.metadata.name,
    deploymentName: deployment.metadata.name
  };
}

// Run the program
async function main() {
  const stackName = "dev";
  const projectName = "my-project";

  // Create or select stack
  const stack = await automation.LocalWorkspace.createOrSelectStack({
    stackName,
    projectName,
    program: pulumiProgram
  });

  console.log("Installing plugins...");
  await stack.workspace.installPlugin("kubernetes", "v4.8.0");
  await stack.workspace.installPlugin("aws", "v6.15.0");

  console.log("Setting up stack configuration...");
  await stack.setConfig("kubernetes:kubeconfig", {
    value: process.env.KUBECONFIG || "~/.kube/config"
  });

  console.log("Refreshing stack...");
  await stack.refresh({ onOutput: console.log });

  console.log("Updating stack...");
  const upResult = await stack.up({ onOutput: console.log });

  console.log(`Update summary:
    - Resources created: ${upResult.summary.resourceChanges?.create || 0}
    - Resources updated: ${upResult.summary.resourceChanges?.update || 0}
  `);

  console.log("Outputs:", upResult.outputs);
}

main().catch(console.error);
```

Run the automation:

```bash
ts-node automation/deploy.ts
```

## Building a Self-Service API

Create a REST API for infrastructure provisioning:

```typescript
// server.ts
import express from "express";
import * as automation from "@pulumi/pulumi/automation";
import * as k8s from "@pulumi/kubernetes";

const app = express();
app.use(express.json());

// Store active stacks
const stacks = new Map<string, automation.Stack>();

// Define infrastructure template
function createInfrastructure(config: {
  appName: string;
  replicas: number;
  image: string;
}) {
  return async () => {
    const namespace = new k8s.core.v1.Namespace("namespace", {
      metadata: {
        name: config.appName
      }
    });

    const deployment = new k8s.apps.v1.Deployment("deployment", {
      metadata: {
        namespace: namespace.metadata.name,
        name: config.appName
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: { app: config.appName }
        },
        template: {
          metadata: {
            labels: { app: config.appName }
          },
          spec: {
            containers: [{
              name: "app",
              image: config.image,
              ports: [{ containerPort: 8080 }]
            }]
          }
        }
      }
    });

    const service = new k8s.core.v1.Service("service", {
      metadata: {
        namespace: namespace.metadata.name,
        name: config.appName
      },
      spec: {
        type: "LoadBalancer",
        selector: { app: config.appName },
        ports: [{
          port: 80,
          targetPort: 8080
        }]
      }
    });

    return {
      namespaceName: namespace.metadata.name,
      deploymentName: deployment.metadata.name,
      serviceName: service.metadata.name
    };
  };
}

// Create environment endpoint
app.post("/environments", async (req, res) => {
  try {
    const { name, replicas, image } = req.body;

    if (!name || !image) {
      return res.status(400).json({ error: "name and image required" });
    }

    console.log(`Creating environment: ${name}`);

    const stack = await automation.LocalWorkspace.createOrSelectStack({
      stackName: name,
      projectName: "dynamic-environments",
      program: createInfrastructure({
        appName: name,
        replicas: replicas || 2,
        image
      })
    });

    await stack.workspace.installPlugin("kubernetes", "v4.8.0");
    await stack.setConfig("kubernetes:kubeconfig", {
      value: process.env.KUBECONFIG || "~/.kube/config"
    });

    const upResult = await stack.up({ onOutput: console.log });

    stacks.set(name, stack);

    res.json({
      environment: name,
      status: "created",
      outputs: upResult.outputs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get environment status
app.get("/environments/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const stack = stacks.get(name);

    if (!stack) {
      return res.status(404).json({ error: "Environment not found" });
    }

    const info = await stack.info();
    const outputs = await stack.outputs();

    res.json({
      environment: name,
      status: info?.result || "unknown",
      lastUpdate: info?.endTime,
      outputs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update environment
app.put("/environments/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const { replicas, image } = req.body;

    let stack = stacks.get(name);

    if (!stack) {
      return res.status(404).json({ error: "Environment not found" });
    }

    // Update configuration if provided
    if (replicas) {
      await stack.setConfig("replicas", { value: replicas.toString() });
    }
    if (image) {
      await stack.setConfig("image", { value: image });
    }

    const upResult = await stack.up({ onOutput: console.log });

    res.json({
      environment: name,
      status: "updated",
      outputs: upResult.outputs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete environment
app.delete("/environments/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const stack = stacks.get(name);

    if (!stack) {
      return res.status(404).json({ error: "Environment not found" });
    }

    await stack.destroy({ onOutput: console.log });
    await stack.workspace.removeStack(name);

    stacks.delete(name);

    res.json({
      environment: name,
      status: "deleted"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List environments
app.get("/environments", async (req, res) => {
  const environments = await Promise.all(
    Array.from(stacks.keys()).map(async (name) => {
      const stack = stacks.get(name)!;
      const info = await stack.info();
      return {
        name,
        status: info?.result || "unknown",
        lastUpdate: info?.endTime
      };
    })
  );

  res.json({ environments });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Infrastructure API running on port ${PORT}`);
});
```

Use the API:

```bash
# Start server
npm start

# Create environment
curl -X POST http://localhost:3000/environments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "feature-branch-123",
    "replicas": 2,
    "image": "myapp:feature-123"
  }'

# Get status
curl http://localhost:3000/environments/feature-branch-123

# Update environment
curl -X PUT http://localhost:3000/environments/feature-branch-123 \
  -H "Content-Type: application/json" \
  -d '{"replicas": 5}'

# Delete environment
curl -X DELETE http://localhost:3000/environments/feature-branch-123
```

## Implementing Environment Templates

Create reusable templates:

```typescript
// templates/fullstack-app.ts
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";

export interface FullStackConfig {
  appName: string;
  frontendImage: string;
  backendImage: string;
  dbSize: string;
  replicas: number;
}

export function createFullStackApp(config: FullStackConfig) {
  return async () => {
    // Create namespace
    const namespace = new k8s.core.v1.Namespace("namespace", {
      metadata: {
        name: config.appName
      }
    });

    // Create RDS database
    const db = new aws.rds.Instance("database", {
      engine: "postgres",
      engineVersion: "15.4",
      instanceClass: config.dbSize,
      allocatedStorage: 20,
      username: "dbadmin",
      password: pulumi.secret("changeme"),
      skipFinalSnapshot: true
    });

    // Create database secret
    const dbSecret = new k8s.core.v1.Secret("db-credentials", {
      metadata: {
        namespace: namespace.metadata.name,
        name: "db-credentials"
      },
      stringData: {
        host: db.address,
        port: db.port.apply(p => p.toString()),
        username: db.username,
        password: db.password
      }
    });

    // Backend deployment
    const backend = new k8s.apps.v1.Deployment("backend", {
      metadata: {
        namespace: namespace.metadata.name,
        name: "backend"
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: { app: "backend" }
        },
        template: {
          metadata: {
            labels: { app: "backend" }
          },
          spec: {
            containers: [{
              name: "backend",
              image: config.backendImage,
              ports: [{ containerPort: 8080 }],
              envFrom: [{
                secretRef: {
                  name: dbSecret.metadata.name
                }
              }]
            }]
          }
        }
      }
    });

    // Backend service
    const backendService = new k8s.core.v1.Service("backend-service", {
      metadata: {
        namespace: namespace.metadata.name,
        name: "backend"
      },
      spec: {
        selector: { app: "backend" },
        ports: [{
          port: 8080,
          targetPort: 8080
        }]
      }
    });

    // Frontend deployment
    const frontend = new k8s.apps.v1.Deployment("frontend", {
      metadata: {
        namespace: namespace.metadata.name,
        name: "frontend"
      },
      spec: {
        replicas: config.replicas,
        selector: {
          matchLabels: { app: "frontend" }
        },
        template: {
          metadata: {
            labels: { app: "frontend" }
          },
          spec: {
            containers: [{
              name: "frontend",
              image: config.frontendImage,
              ports: [{ containerPort: 3000 }],
              env: [{
                name: "API_URL",
                value: `http://backend.${config.appName}.svc.cluster.local:8080`
              }]
            }]
          }
        }
      }
    });

    // Frontend service
    const frontendService = new k8s.core.v1.Service("frontend-service", {
      metadata: {
        namespace: namespace.metadata.name,
        name: "frontend"
      },
      spec: {
        type: "LoadBalancer",
        selector: { app: "frontend" },
        ports: [{
          port: 80,
          targetPort: 3000
        }]
      }
    });

    return {
      namespaceName: namespace.metadata.name,
      databaseEndpoint: db.endpoint,
      backendServiceUrl: pulumi.interpolate`http://backend.${config.appName}.svc.cluster.local:8080`,
      frontendUrl: frontendService.status.loadBalancer.ingress[0].hostname
    };
  };
}
```

Use the template:

```typescript
// Use in API endpoint
app.post("/fullstack-environments", async (req, res) => {
  const { name, frontendImage, backendImage, dbSize, replicas } = req.body;

  const stack = await automation.LocalWorkspace.createOrSelectStack({
    stackName: name,
    projectName: "fullstack-apps",
    program: createFullStackApp({
      appName: name,
      frontendImage,
      backendImage,
      dbSize: dbSize || "db.t3.small",
      replicas: replicas || 2
    })
  });

  // ... rest of deployment logic ...
});
```

## Implementing Preview Mode

Show what would change before applying:

```typescript
app.post("/environments/:name/preview", async (req, res) => {
  try {
    const { name } = req.params;
    const { replicas, image } = req.body;

    const stack = stacks.get(name) || await automation.LocalWorkspace.createOrSelectStack({
      stackName: name,
      projectName: "dynamic-environments",
      program: createInfrastructure({
        appName: name,
        replicas: replicas || 2,
        image
      })
    });

    // Run preview
    const previewResult = await stack.preview({
      onOutput: console.log
    });

    res.json({
      environment: name,
      changes: {
        create: previewResult.changeSummary.create || 0,
        update: previewResult.changeSummary.update || 0,
        delete: previewResult.changeSummary.delete || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Summary

Pulumi Automation API enables programmatic infrastructure provisioning. By embedding Pulumi in applications, you build self-service platforms where developers create environments on demand. The API manages stacks, configurations, and deployments without CLI interaction. This approach powers dynamic infrastructure platforms, preview environments for pull requests, and infrastructure-as-a-service offerings built on Kubernetes. Combined with templates and REST APIs, Automation API scales from simple deployment automation to complete platform engineering solutions.

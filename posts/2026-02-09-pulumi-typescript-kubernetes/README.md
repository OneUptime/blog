# How to Build Kubernetes Resources Using Pulumi with TypeScript for Type-Safe Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Kubernetes, TypeScript

Description: Learn how to leverage Pulumi with TypeScript to build type-safe Kubernetes infrastructure, catching errors at compile time and using familiar programming patterns for resource management.

---

Infrastructure as code traditionally uses declarative YAML or domain-specific languages. Pulumi takes a different approach by letting you use real programming languages like TypeScript. This brings compile-time type checking, IDE autocomplete, and all the tools developers already know.

For Kubernetes deployments, this approach catches configuration errors before deployment and makes complex logic easier to express. This guide shows you how to build Kubernetes resources with Pulumi and TypeScript while taking full advantage of type safety.

## Setting Up Your Pulumi TypeScript Project

First, install Pulumi and create a new TypeScript project:

```bash
# Install Pulumi CLI
curl -fsSL https://get.pulumi.com | sh

# Create new Kubernetes project
pulumi new kubernetes-typescript
```

This creates a project structure with package.json, tsconfig.json, and index.ts. The TypeScript configuration enables strict type checking, which catches errors early.

Your package.json includes the Pulumi Kubernetes SDK:

```json
{
  "name": "k8s-infrastructure",
  "version": "1.0.0",
  "dependencies": {
    "@pulumi/pulumi": "^3.100.0",
    "@pulumi/kubernetes": "^4.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

## Creating Your First Type-Safe Resources

Start with a simple namespace and deployment. Type safety means your IDE shows available fields and catches typos:

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Create a namespace with type checking
const namespace = new k8s.core.v1.Namespace("app-namespace", {
  metadata: {
    name: "production",
    labels: {
      environment: "prod",
      managedBy: "pulumi"
    }
  }
});

// Create a deployment with full type safety
const appDeployment = new k8s.apps.v1.Deployment("app-deployment", {
  metadata: {
    namespace: namespace.metadata.name,
    name: "web-app",
    labels: {
      app: "web"
    }
  },
  spec: {
    replicas: 3,
    selector: {
      matchLabels: {
        app: "web"
      }
    },
    template: {
      metadata: {
        labels: {
          app: "web"
        }
      },
      spec: {
        containers: [{
          name: "web",
          image: "nginx:1.25",
          ports: [{
            containerPort: 80,
            name: "http"
          }],
          resources: {
            requests: {
              cpu: "100m",
              memory: "128Mi"
            },
            limits: {
              cpu: "500m",
              memory: "512Mi"
            }
          },
          // TypeScript catches typos in field names
          livenessProbe: {
            httpGet: {
              path: "/health",
              port: 80
            },
            initialDelaySeconds: 10,
            periodSeconds: 5
          }
        }]
      }
    }
  }
});

// Export the deployment name
export const deploymentName = appDeployment.metadata.name;
```

If you misspell a field like `initialDelaySeconds` as `initialDelaySecond`, TypeScript catches it immediately. Your IDE shows autocomplete suggestions for all valid fields.

## Building Reusable Component Resources

Pulumi's component resources let you create reusable abstractions. Unlike Terraform modules, these are just TypeScript classes:

```typescript
// components/microservice.ts
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface MicroserviceArgs {
  namespace: pulumi.Input<string>;
  image: string;
  replicas?: number;
  port: number;
  cpu?: string;
  memory?: string;
  env?: { [key: string]: string };
}

export class Microservice extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service: k8s.core.v1.Service;
  public readonly serviceUrl: pulumi.Output<string>;

  constructor(name: string, args: MicroserviceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k8s:Microservice", name, {}, opts);

    const labels = { app: name };

    // Create deployment
    this.deployment = new k8s.apps.v1.Deployment(`${name}-deployment`, {
      metadata: {
        namespace: args.namespace,
        name: name,
        labels: labels
      },
      spec: {
        replicas: args.replicas || 2,
        selector: { matchLabels: labels },
        template: {
          metadata: { labels: labels },
          spec: {
            containers: [{
              name: name,
              image: args.image,
              ports: [{ containerPort: args.port }],
              env: Object.entries(args.env || {}).map(([name, value]) => ({
                name,
                value
              })),
              resources: {
                requests: {
                  cpu: args.cpu || "100m",
                  memory: args.memory || "128Mi"
                },
                limits: {
                  cpu: args.cpu ? `${parseInt(args.cpu) * 2}m` : "200m",
                  memory: args.memory || "256Mi"
                }
              },
              readinessProbe: {
                httpGet: {
                  path: "/ready",
                  port: args.port
                },
                initialDelaySeconds: 5,
                periodSeconds: 10
              }
            }]
          }
        }
      }
    }, { parent: this });

    // Create service
    this.service = new k8s.core.v1.Service(`${name}-service`, {
      metadata: {
        namespace: args.namespace,
        name: name,
        labels: labels
      },
      spec: {
        type: "ClusterIP",
        selector: labels,
        ports: [{
          port: args.port,
          targetPort: args.port
        }]
      }
    }, { parent: this });

    // Compute service URL
    this.serviceUrl = pulumi.interpolate`${this.service.metadata.name}.${args.namespace}.svc.cluster.local:${args.port}`;

    this.registerOutputs({
      deployment: this.deployment,
      service: this.service,
      serviceUrl: this.serviceUrl
    });
  }
}
```

This component encapsulates best practices like resource limits and readiness probes. Use it like any TypeScript class:

```typescript
// index.ts
import { Microservice } from "./components/microservice";

const apiService = new Microservice("api", {
  namespace: namespace.metadata.name,
  image: "myapp/api:v1.2.3",
  replicas: 3,
  port: 8080,
  cpu: "200m",
  memory: "256Mi",
  env: {
    DATABASE_URL: "postgres://db:5432/app",
    CACHE_ENABLED: "true"
  }
});

const workerService = new Microservice("worker", {
  namespace: namespace.metadata.name,
  image: "myapp/worker:v1.2.3",
  replicas: 2,
  port: 8081,
  env: {
    QUEUE_URL: apiService.serviceUrl
  }
});

export const apiUrl = apiService.serviceUrl;
export const workerUrl = workerService.serviceUrl;
```

The component handles all the boilerplate while exposing only the parameters you need. TypeScript ensures you provide required fields and catch missing properties at compile time.

## Working with Pulumi Outputs

Pulumi uses Output types to handle asynchronous resource creation. These are similar to Promises but designed for infrastructure dependencies:

```typescript
// Helper function using apply()
function createConfigMap(namespace: pulumi.Output<string>, data: { [key: string]: string }) {
  return new k8s.core.v1.ConfigMap("app-config", {
    metadata: {
      namespace: namespace,  // Pulumi handles the async resolution
      name: "app-config"
    },
    data: data
  });
}

// Using all() for multiple outputs
const apiEndpoint = pulumi.all([
  apiService.service.metadata.name,
  namespace.metadata.name
]).apply(([serviceName, ns]) => {
  return `http://${serviceName}.${ns}.svc.cluster.local:8080`;
});

// Interpolate for string templates
const databaseConnection = pulumi.interpolate`postgres://${dbService.service.metadata.name}:5432/app`;
```

TypeScript ensures you handle outputs correctly. If you forget to use apply() or interpolate when combining outputs, the compiler shows an error.

## Implementing Advanced Patterns with Type Safety

Build more complex patterns using TypeScript features like interfaces and generics:

```typescript
// Advanced configuration with validation
interface DatabaseConfig {
  storageSize: string;
  storageClass: string;
  version: string;
}

interface ServiceConfig {
  name: string;
  image: string;
  replicas: number;
  database?: DatabaseConfig;
}

function validateConfig(config: ServiceConfig): void {
  if (config.replicas < 1 || config.replicas > 10) {
    throw new Error("Replicas must be between 1 and 10");
  }
  if (config.database && !config.database.storageSize.match(/^\d+Gi$/)) {
    throw new Error("Storage size must be in Gi format (e.g., '10Gi')");
  }
}

function createService(config: ServiceConfig): Microservice {
  validateConfig(config);

  const env: { [key: string]: string } = {};

  // Create database if specified
  if (config.database) {
    const db = new k8s.apps.v1.StatefulSet(`${config.name}-db`, {
      metadata: {
        namespace: namespace.metadata.name,
        name: `${config.name}-db`
      },
      spec: {
        serviceName: `${config.name}-db`,
        replicas: 1,
        selector: {
          matchLabels: { app: `${config.name}-db` }
        },
        template: {
          metadata: {
            labels: { app: `${config.name}-db` }
          },
          spec: {
            containers: [{
              name: "postgres",
              image: `postgres:${config.database.version}`,
              ports: [{ containerPort: 5432 }],
              volumeMounts: [{
                name: "data",
                mountPath: "/var/lib/postgresql/data"
              }]
            }]
          }
        },
        volumeClaimTemplates: [{
          metadata: { name: "data" },
          spec: {
            accessModes: ["ReadWriteOnce"],
            storageClassName: config.database.storageClass,
            resources: {
              requests: {
                storage: config.database.storageSize
              }
            }
          }
        }]
      }
    });

    env.DATABASE_URL = pulumi.interpolate`postgres://${config.name}-db:5432/app`;
  }

  return new Microservice(config.name, {
    namespace: namespace.metadata.name,
    image: config.image,
    replicas: config.replicas,
    port: 8080,
    env: env
  });
}

// Use with type checking
const services: ServiceConfig[] = [
  {
    name: "api",
    image: "myapp/api:latest",
    replicas: 3,
    database: {
      storageSize: "20Gi",
      storageClass: "fast-ssd",
      version: "15"
    }
  },
  {
    name: "frontend",
    image: "myapp/frontend:latest",
    replicas: 5
  }
];

services.forEach(config => createService(config));
```

The type system validates your configuration before deployment. If you pass an invalid service name or forget required fields, TypeScript catches it during development.

## Handling Secrets Securely

Pulumi has built-in secret management with type-safe access:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const dbPassword = config.requireSecret("dbPassword");

const dbSecret = new k8s.core.v1.Secret("db-credentials", {
  metadata: {
    namespace: namespace.metadata.name,
    name: "db-credentials"
  },
  stringData: {
    password: dbPassword
  }
});

// Reference secret in deployment
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
          image: "myapp:latest",
          env: [{
            name: "DB_PASSWORD",
            valueFrom: {
              secretKeyRef: {
                name: dbSecret.metadata.name,
                key: "password"
              }
            }
          }]
        }]
      }
    }
  }
});
```

Set secrets using Pulumi config:

```bash
pulumi config set --secret dbPassword "super-secret-password"
```

Pulumi encrypts secrets in your state file and handles them securely during deployment.

## Testing Infrastructure Code

Since this is TypeScript, you can write unit tests:

```typescript
// tests/microservice.test.ts
import { Microservice } from "../components/microservice";
import * as pulumi from "@pulumi/pulumi";

pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
    return {
      id: args.inputs.name + "_id",
      state: args.inputs,
    };
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});

describe("Microservice", () => {
  it("creates deployment with correct replicas", async () => {
    const service = new Microservice("test", {
      namespace: "default",
      image: "nginx:latest",
      replicas: 5,
      port: 80
    });

    const replicas = await service.deployment.spec.replicas;
    expect(replicas).toBe(5);
  });

  it("applies resource limits", async () => {
    const service = new Microservice("test", {
      namespace: "default",
      image: "nginx:latest",
      port: 80,
      cpu: "200m",
      memory: "256Mi"
    });

    const container = await service.deployment.spec.template.spec.containers[0];
    expect(container.resources?.requests?.cpu).toBe("200m");
    expect(container.resources?.limits?.cpu).toBe("400m");
  });
});
```

Run tests with your preferred framework:

```bash
npm install --save-dev jest @types/jest
npx jest
```

## Summary

Pulumi with TypeScript brings type safety to Kubernetes infrastructure. You get compile-time error checking, IDE autocomplete, and the ability to use familiar programming patterns like classes and interfaces. Component resources let you build reusable abstractions with clean APIs, while the type system ensures you catch configuration errors before deployment. For teams comfortable with TypeScript, Pulumi provides a powerful alternative to YAML-based infrastructure tools.

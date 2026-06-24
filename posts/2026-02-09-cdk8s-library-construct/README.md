# How to Build a CDK8s Library Construct

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CDK8s, Kubernetes, TypeScript

Description: Learn how to create reusable CDK8s library constructs that encapsulate microservice patterns including deployment, service, ingress, and monitoring configuration for consistent application deployment.

---

Deploying microservices requires consistent patterns for deployments, services, health checks, and monitoring. CDK8s library constructs encapsulate these patterns into reusable components that teams use across projects. This eliminates boilerplate and enforces standards.

This guide shows you how to build production-ready library constructs for Kubernetes microservices.

## Creating a Basic Microservice Construct

Start with deployment and service:

```typescript
// lib/microservice.ts
import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-34";
import { Size } from "cdk8s";

export interface MicroserviceProps {
  readonly name: string;
  readonly namespace: string;
  readonly image: string;
  readonly port: number;
  readonly replicas?: number;
  readonly env?: { [key: string]: string };
  readonly resources?: {
    cpu?: string;
    memory?: string;
  };
}

export class Microservice extends Construct {
  public readonly deployment: k8s.Deployment;
  public readonly service: k8s.Service;

  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    const labels = { app: props.name };

    // Create deployment
    this.deployment = new k8s.Deployment(this, "deployment", {
      metadata: {
        name: props.name,
        namespace: props.namespace
      },
      replicas: props.replicas || 2,
      podMetadata: {
        labels
      },
      containers: [{
        image: props.image,
        portNumber: props.port,
        envVariables: props.env ? Object.entries(props.env).reduce((acc, [key, value]) => {
          acc[key] = k8s.EnvValue.fromValue(value);
          return acc;
        }, {} as Record<string, k8s.EnvValue>) : {},
        resources: {
          cpu: {
            request: k8s.Cpu.millis(parseInt(props.resources?.cpu || "100")),
            limit: k8s.Cpu.millis(parseInt(props.resources?.cpu || "100") * 2)
          },
          memory: {
            request: Size.mebibytes(parseInt(props.resources?.memory || "128")),
            limit: Size.mebibytes(parseInt(props.resources?.memory || "128") * 2)
          }
        }
      }]
    });

    // Create service
    this.service = new k8s.Service(this, "service", {
      metadata: {
        name: props.name,
        namespace: props.namespace
      },
      selector: this.deployment,
      ports: [{ port: props.port, targetPort: props.port }]
    });
  }
}
```

Use the construct:

```typescript
// main.ts
import { App, Chart } from "cdk8s";
import { Microservice } from "./lib/microservice";

const app = new App();
const chart = new Chart(app, "my-app");

new Microservice(chart, "api", {
  name: "api-service",
  namespace: "production",
  image: "myapp/api:v1.0.0",
  port: 8080,
  replicas: 3,
  env: {
    DATABASE_URL: "postgres://db:5432/app",
    LOG_LEVEL: "info"
  },
  resources: {
    cpu: "200",
    memory: "256"
  }
});

app.synth();
```

## Adding Health Checks

Extend with readiness and liveness probes:

```typescript
// lib/microservice.ts (extended)
import { Duration } from "cdk8s";

export interface MicroserviceProps {
  // ... previous props ...
  readonly healthCheck?: {
    path: string;
    initialDelaySeconds?: number;
    periodSeconds?: number;
  };
}

export class Microservice extends Construct {
  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    const container = new k8s.Container({
      image: props.image,
      portNumber: props.port,
      liveness: props.healthCheck ? k8s.Probe.fromHttpGet(props.healthCheck.path, {
        port: props.port,
        initialDelaySeconds: Duration.seconds(props.healthCheck.initialDelaySeconds || 10),
        periodSeconds: Duration.seconds(props.healthCheck.periodSeconds || 10)
      }) : undefined,
      readiness: props.healthCheck ? k8s.Probe.fromHttpGet(props.healthCheck.path, {
        port: props.port,
        initialDelaySeconds: Duration.seconds(props.healthCheck.initialDelaySeconds || 5),
        periodSeconds: Duration.seconds(props.healthCheck.periodSeconds || 5)
      }) : undefined,
      // ... other config ...
    });

    this.deployment = new k8s.Deployment(this, "deployment", {
      // ... config ...
    });
    this.deployment.attachContainer(container);
  }
}
```

## Implementing ConfigMap and Secret Support

Add configuration management:

```typescript
export interface MicroserviceProps {
  // ... previous props ...
  readonly config?: { [key: string]: string };
  readonly secrets?: { [key: string]: string };
}

export class Microservice extends Construct {
  public readonly configMap?: k8s.ConfigMap;
  public readonly secret?: k8s.Secret;

  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    // Create ConfigMap if config provided
    if (props.config) {
      this.configMap = new k8s.ConfigMap(this, "config", {
        metadata: {
          name: `${props.name}-config`,
          namespace: props.namespace
        },
        data: props.config
      });
    }

    // Create Secret if secrets provided
    if (props.secrets) {
      this.secret = new k8s.Secret(this, "secret", {
        metadata: {
          name: `${props.name}-secret`,
          namespace: props.namespace
        },
        stringData: props.secrets
      });
    }

    const container = new k8s.Container({
      image: props.image,
      portNumber: props.port
    });

    // Mount ConfigMap
    if (this.configMap) {
      container.mount("/etc/config", k8s.Volume.fromConfigMap(this, "config-volume", this.configMap));
    }

    // Add secrets as env vars
    if (this.secret) {
      Object.keys(props.secrets!).forEach(key => {
        container.env.addVariable(
          key,
          k8s.EnvValue.fromSecretValue({ secret: this.secret!, key })
        );
      });
    }

    this.deployment = new k8s.Deployment(this, "deployment", {
      metadata: {
        name: props.name,
        namespace: props.namespace
      }
    });
    this.deployment.attachContainer(container);
  }
}
```

## Adding Ingress Support

Include external access:

```typescript
export interface MicroserviceProps {
  // ... previous props ...
  readonly ingress?: {
    host: string;
    path?: string;
    tls?: boolean;
    annotations?: { [key: string]: string };
  };
}

export class Microservice extends Construct {
  public readonly ingress?: k8s.Ingress;

  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    // ... create deployment and service ...

    // Create ingress if specified
    if (props.ingress) {
      this.ingress = new k8s.Ingress(this, "ingress", {
        metadata: {
          name: props.name,
          namespace: props.namespace,
          annotations: {
            ...(props.ingress.tls && {
              "cert-manager.io/cluster-issuer": "letsencrypt-prod"
            }),
            ...props.ingress.annotations
          }
        },
        className: "nginx",
        rules: [{
          host: props.ingress.host,
          path: props.ingress.path || "/",
          pathType: k8s.HttpIngressPathType.PREFIX,
          backend: k8s.IngressBackend.fromService(this.service)
        }],
        tls: props.ingress.tls ? [{
          hosts: [props.ingress.host],
          secret: k8s.Secret.fromSecretName(this, "tls-secret", `${props.name}-tls`)
        }] : undefined
      });
    }
  }
}
```

## Implementing Autoscaling

Add HPA support:

```typescript
export interface MicroserviceProps {
  // ... previous props ...
  readonly autoscaling?: {
    minReplicas: number;
    maxReplicas: number;
    targetCpu?: number;
    targetMemory?: number;
  };
}

export class Microservice extends Construct {
  public readonly hpa?: k8s.HorizontalPodAutoscaler;

  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    // ... create deployment without a replicas value when autoscaling is enabled ...

    // Create HPA if autoscaling specified
    if (props.autoscaling) {
      this.hpa = new k8s.HorizontalPodAutoscaler(this, "hpa", {
        metadata: {
          name: props.name,
          namespace: props.namespace
        },
        target: this.deployment,
        minReplicas: props.autoscaling.minReplicas,
        maxReplicas: props.autoscaling.maxReplicas,
        metrics: [
          ...(props.autoscaling.targetCpu ? [
            k8s.Metric.resourceCpu(k8s.MetricTarget.averageUtilization(props.autoscaling.targetCpu))
          ] : []),
          ...(props.autoscaling.targetMemory ? [
            k8s.Metric.resourceMemory(k8s.MetricTarget.averageUtilization(props.autoscaling.targetMemory))
          ] : [])
        ]
      });
    }
  }
}
```

## Creating Environment Variants

Build environment-specific defaults:

```typescript
// lib/environments.ts
export type Environment = "development" | "staging" | "production";

export interface EnvironmentDefaults {
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
  };
  autoscaling?: {
    minReplicas: number;
    maxReplicas: number;
    targetCpu: number;
  };
}

export const ENVIRONMENT_DEFAULTS: Record<Environment, EnvironmentDefaults> = {
  development: {
    replicas: 1,
    resources: {
      cpu: "100",
      memory: "128"
    }
  },
  staging: {
    replicas: 2,
    resources: {
      cpu: "200",
      memory: "256"
    }
  },
  production: {
    replicas: 3,
    resources: {
      cpu: "500",
      memory: "512"
    },
    autoscaling: {
      minReplicas: 3,
      maxReplicas: 10,
      targetCpu: 70
    }
  }
};

export function createMicroservice(
  scope: Construct,
  id: string,
  env: Environment,
  props: Omit<MicroserviceProps, "replicas" | "resources" | "autoscaling">
): Microservice {
  const defaults = ENVIRONMENT_DEFAULTS[env];

  return new Microservice(scope, id, {
    ...props,
    ...defaults
  });
}
```

Use environment helpers:

```typescript
// main.ts
import { createMicroservice } from "./lib/environments";

const environment = process.env.ENVIRONMENT || "development";

createMicroservice(chart, "api", environment as Environment, {
  name: "api-service",
  namespace: environment,
  image: `myapp/api:${environment}`,
  port: 8080
});
```

## Publishing as NPM Package

Create package.json:

```json
{
  "name": "@myorg/cdk8s-microservice",
  "version": "1.0.0",
  "description": "CDK8s construct for standardized microservice deployment",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "cdk8s": "^2.0.0",
    "cdk8s-plus-34": "^2.0.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "keywords": [
    "cdk8s",
    "kubernetes",
    "microservices"
  ]
}
```

Publish to NPM:

```bash
npm run build
npm publish --access public
```

Use in other projects:

```bash
npm install @myorg/cdk8s-microservice
```

```typescript
import { Microservice } from "@myorg/cdk8s-microservice";

new Microservice(chart, "api", {
  name: "api",
  namespace: "production",
  image: "myapp/api:latest",
  port: 8080
});
```

## Summary

CDK8s library constructs encapsulate microservice patterns into reusable components. By defining standard interfaces for deployments, services, ingress, and autoscaling, you eliminate boilerplate and enforce consistency. Environment-specific defaults adapt configurations automatically, while publishing as NPM packages enables sharing across projects and teams. This approach scales from individual applications to entire microservice platforms with hundreds of services.

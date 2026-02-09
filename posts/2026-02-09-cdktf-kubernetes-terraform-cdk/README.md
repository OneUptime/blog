# How to Configure CDKTF for Managing Kubernetes Infrastructure with Terraform CDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure as Code, CDK, TypeScript

Description: Learn how to use Cloud Development Kit for Terraform (CDKTF) to manage Kubernetes infrastructure using familiar programming languages instead of HCL for better abstractions and testing.

---

Terraform's HCL domain-specific language works well for simple configurations but becomes cumbersome for complex infrastructure patterns. Cloud Development Kit for Terraform (CDKTF) solves this by letting you define infrastructure using TypeScript, Python, Go, or Java. This guide shows you how to leverage CDKTF for Kubernetes infrastructure management.

## Understanding CDKTF Architecture

CDKTF generates Terraform JSON configuration from code written in general-purpose programming languages. Your code creates constructs representing infrastructure resources, which CDKTF synthesizes into Terraform configuration, then executes using the standard Terraform engine. This means you get Terraform's mature provider ecosystem with the power of real programming languages.

The key advantage is abstraction. You can create reusable components with proper interfaces, write unit tests for infrastructure logic, and use language features like loops and conditionals naturally. For Kubernetes, this enables building high-level abstractions that hide complexity while maintaining the flexibility to handle edge cases.

## Setting Up CDKTF for Kubernetes

Install CDKTF and initialize a new project configured for Kubernetes management.

```bash
# Install CDKTF CLI
npm install -g cdktf-cli

# Create a new project
mkdir k8s-infrastructure
cd k8s-infrastructure
cdktf init --template=typescript --providers=kubernetes,aws

# This creates:
# - cdktf.json (project configuration)
# - main.ts (infrastructure code)
# - package.json (dependencies)
```

Configure the project to use the Kubernetes and AWS providers:

```json
// cdktf.json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "projectId": "k8s-infra",
  "terraformProviders": [
    "kubernetes@~> 2.23",
    "aws@~> 5.0"
  ],
  "terraformModules": [],
  "context": {
    "excludeStackIdFromLogicalIds": "true",
    "allowSepCharsInLogicalIds": "true"
  }
}
```

Generate provider bindings by running:

```bash
cdktf get
```

This downloads provider schemas and generates TypeScript types for all resources.

## Building Your First Kubernetes Stack

Create a basic stack that deploys an EKS cluster and Kubernetes resources.

```typescript
// main.ts
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "./.gen/providers/aws/provider";
import { EksCluster } from "./.gen/providers/aws/eks-cluster";
import { EksNodeGroup } from "./.gen/providers/aws/eks-node-group";
import { KubernetesProvider } from "./.gen/providers/kubernetes/provider";
import { Namespace } from "./.gen/providers/kubernetes/namespace";
import { Deployment } from "./.gen/providers/kubernetes/deployment";
import { Service } from "./.gen/providers/kubernetes/service";

class KubernetesInfrastructureStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure AWS provider
    new AwsProvider(this, "aws", {
      region: "us-west-2",
    });

    // Create EKS cluster
    const cluster = new EksCluster(this, "eks-cluster", {
      name: "production-cluster",
      roleArn: this.createClusterRole(),
      version: "1.28",
      vpcConfig: {
        subnetIds: this.getSubnetIds(),
        endpointPrivateAccess: true,
        endpointPublicAccess: true,
      },
    });

    // Create node group
    const nodeGroup = new EksNodeGroup(this, "node-group", {
      clusterName: cluster.name,
      nodeGroupName: "workers",
      nodeRoleArn: this.createNodeRole(),
      subnetIds: this.getSubnetIds(),
      scalingConfig: {
        desiredSize: 3,
        maxSize: 5,
        minSize: 2,
      },
      instanceTypes: ["t3.large"],
    });

    // Configure Kubernetes provider to use the new cluster
    new KubernetesProvider(this, "kubernetes", {
      host: cluster.endpoint,
      clusterCaCertificate: cluster.certificateAuthority.get(0).data,
      exec: {
        apiVersion: "client.authentication.k8s.io/v1beta1",
        command: "aws",
        args: [
          "eks",
          "get-token",
          "--cluster-name",
          cluster.name,
        ],
      },
    });

    // Output cluster details
    new TerraformOutput(this, "cluster-name", {
      value: cluster.name,
    });

    new TerraformOutput(this, "cluster-endpoint", {
      value: cluster.endpoint,
    });
  }

  private createClusterRole(): string {
    // Implement IAM role creation
    return "arn:aws:iam::123456789012:role/eks-cluster-role";
  }

  private createNodeRole(): string {
    // Implement IAM role creation
    return "arn:aws:iam::123456789012:role/eks-node-role";
  }

  private getSubnetIds(): string[] {
    return ["subnet-abc123", "subnet-def456", "subnet-ghi789"];
  }
}

const app = new App();
new KubernetesInfrastructureStack(app, "k8s-infrastructure");
app.synth();
```

This creates a complete EKS cluster with typed resources and IDE autocomplete support.

## Creating Reusable Constructs

Build high-level abstractions that encapsulate common patterns and best practices.

```typescript
// constructs/Application.ts
import { Construct } from "constructs";
import { Deployment } from "../.gen/providers/kubernetes/deployment";
import { Service } from "../.gen/providers/kubernetes/service";
import { ConfigMap } from "../.gen/providers/kubernetes/config-map";
import { Secret } from "../.gen/providers/kubernetes/secret";

export interface ApplicationConfig {
  name: string;
  namespace: string;
  image: string;
  replicas: number;
  port: number;
  env?: { [key: string]: string };
  secrets?: { [key: string]: string };
  resources?: {
    requests?: { cpu: string; memory: string };
    limits?: { cpu: string; memory: string };
  };
}

export class Application extends Construct {
  public readonly deployment: Deployment;
  public readonly service: Service;

  constructor(scope: Construct, id: string, config: ApplicationConfig) {
    super(scope, id);

    // Create labels for resource selection
    const labels = {
      app: config.name,
      managedBy: "cdktf",
    };

    // Create ConfigMap for environment variables if provided
    let configMap: ConfigMap | undefined;
    if (config.env && Object.keys(config.env).length > 0) {
      configMap = new ConfigMap(this, "config", {
        metadata: {
          name: `${config.name}-config`,
          namespace: config.namespace,
        },
        data: config.env,
      });
    }

    // Create Secret for sensitive data if provided
    let secret: Secret | undefined;
    if (config.secrets && Object.keys(config.secrets).length > 0) {
      secret = new Secret(this, "secret", {
        metadata: {
          name: `${config.name}-secret`,
          namespace: config.namespace,
        },
        data: config.secrets,
        type: "Opaque",
      });
    }

    // Build environment variables from config and secrets
    const envVars = [];

    if (configMap) {
      Object.keys(config.env!).forEach(key => {
        envVars.push({
          name: key,
          valueFrom: {
            configMapKeyRef: {
              name: configMap.metadata.name,
              key: key,
            },
          },
        });
      });
    }

    if (secret) {
      Object.keys(config.secrets!).forEach(key => {
        envVars.push({
          name: key,
          valueFrom: {
            secretKeyRef: {
              name: secret.metadata.name,
              key: key,
            },
          },
        });
      });
    }

    // Create deployment
    this.deployment = new Deployment(this, "deployment", {
      metadata: {
        name: config.name,
        namespace: config.namespace,
        labels: labels,
      },
      spec: {
        replicas: config.replicas.toString(),
        selector: {
          matchLabels: labels,
        },
        template: {
          metadata: {
            labels: labels,
          },
          spec: {
            container: [{
              name: config.name,
              image: config.image,
              port: [{
                containerPort: config.port,
              }],
              env: envVars.length > 0 ? envVars : undefined,
              resources: config.resources ? {
                requests: config.resources.requests,
                limits: config.resources.limits,
              } : undefined,
              // Security best practices
              securityContext: {
                allowPrivilegeEscalation: false,
                runAsNonRoot: true,
                runAsUser: 1000,
                capabilities: {
                  drop: ["ALL"],
                },
              },
            }],
          },
        },
      },
    });

    // Create service
    this.service = new Service(this, "service", {
      metadata: {
        name: config.name,
        namespace: config.namespace,
        labels: labels,
      },
      spec: {
        selector: labels,
        port: [{
          port: config.port,
          targetPort: config.port.toString(),
        }],
        type: "ClusterIP",
      },
    });
  }
}
```

Use this construct to deploy applications with a simple interface:

```typescript
// In your stack
const app = new Application(this, "api", {
  name: "api-server",
  namespace: "production",
  image: "mycompany/api:v1.2.3",
  replicas: 3,
  port: 8080,
  env: {
    LOG_LEVEL: "info",
    CACHE_TTL: "3600",
  },
  secrets: {
    DATABASE_PASSWORD: "encrypted-password",
    API_KEY: "encrypted-api-key",
  },
  resources: {
    requests: {
      cpu: "500m",
      memory: "512Mi",
    },
    limits: {
      cpu: "1000m",
      memory: "1Gi",
    },
  },
});
```

This abstraction hides complexity and enforces best practices automatically.

## Implementing Dynamic Resource Generation

Use loops and conditionals to generate resources based on configuration.

```typescript
interface MicroserviceConfig {
  name: string;
  image: string;
  replicas: number;
  dependencies?: string[];
}

class MicroservicesStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Define microservices configuration
    const services: MicroserviceConfig[] = [
      {
        name: "user-service",
        image: "mycompany/user-service:latest",
        replicas: 3,
      },
      {
        name: "order-service",
        image: "mycompany/order-service:latest",
        replicas: 2,
        dependencies: ["user-service", "payment-service"],
      },
      {
        name: "payment-service",
        image: "mycompany/payment-service:latest",
        replicas: 2,
      },
      {
        name: "notification-service",
        image: "mycompany/notification-service:latest",
        replicas: 1,
        dependencies: ["user-service"],
      },
    ];

    // Create namespace
    const namespace = new Namespace(this, "microservices", {
      metadata: {
        name: "microservices",
      },
    });

    // Deploy each microservice
    services.forEach(svc => {
      // Build environment variables for service dependencies
      const env: { [key: string]: string } = {};

      if (svc.dependencies) {
        svc.dependencies.forEach(dep => {
          const depService = services.find(s => s.name === dep);
          if (depService) {
            // Generate service URL
            const envKey = `${dep.toUpperCase().replace(/-/g, "_")}_URL`;
            env[envKey] = `http://${dep}.${namespace.metadata.name}.svc.cluster.local`;
          }
        });
      }

      new Application(this, svc.name, {
        name: svc.name,
        namespace: namespace.metadata.name,
        image: svc.image,
        replicas: svc.replicas,
        port: 8080,
        env: env,
        resources: {
          requests: { cpu: "250m", memory: "256Mi" },
          limits: { cpu: "500m", memory: "512Mi" },
        },
      });
    });
  }
}
```

This generates all resources dynamically, automatically configuring service discovery between dependent services.

## Writing Unit Tests

Test infrastructure logic before deployment using standard testing frameworks.

```typescript
// __tests__/Application.test.ts
import { Testing } from "cdktf";
import { Application } from "../constructs/Application";

describe("Application Construct", () => {
  test("creates deployment with correct replica count", () => {
    const app = Testing.app();
    const stack = Testing.stubStack(app, "test");

    new Application(stack, "test-app", {
      name: "test",
      namespace: "default",
      image: "nginx:latest",
      replicas: 5,
      port: 80,
    });

    const synthesized = Testing.synth(stack);

    // Find the deployment resource
    const deployment = synthesized.find(resource =>
      resource.type === "kubernetes_deployment"
    );

    expect(deployment).toBeDefined();
    expect(deployment.spec.replicas).toBe("5");
  });

  test("creates configmap when env vars provided", () => {
    const app = Testing.app();
    const stack = Testing.stubStack(app, "test");

    new Application(stack, "test-app", {
      name: "test",
      namespace: "default",
      image: "nginx:latest",
      replicas: 1,
      port: 80,
      env: {
        FOO: "bar",
        BAZ: "qux",
      },
    });

    const synthesized = Testing.synth(stack);
    const configMap = synthesized.find(resource =>
      resource.type === "kubernetes_config_map"
    );

    expect(configMap).toBeDefined();
    expect(configMap.data.FOO).toBe("bar");
  });

  test("applies security context to containers", () => {
    const app = Testing.app();
    const stack = Testing.stubStack(app, "test");

    new Application(stack, "test-app", {
      name: "test",
      namespace: "default",
      image: "nginx:latest",
      replicas: 1,
      port: 80,
    });

    const synthesized = Testing.synth(stack);
    const deployment = synthesized.find(resource =>
      resource.type === "kubernetes_deployment"
    );

    const container = deployment.spec.template.spec.container[0];
    expect(container.securityContext.runAsNonRoot).toBe(true);
    expect(container.securityContext.capabilities.drop).toContain("ALL");
  });
});
```

These tests validate infrastructure logic without requiring actual cloud resources.

## Integrating with External Data

Fetch data from external sources to make infrastructure decisions.

```typescript
import * as fs from "fs";
import * as yaml from "yaml";

interface ClusterConfig {
  clusters: {
    [key: string]: {
      region: string;
      nodeType: string;
      minNodes: number;
      maxNodes: number;
    };
  };
}

class MultiClusterStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Load configuration from YAML file
    const configFile = fs.readFileSync("./config/clusters.yaml", "utf8");
    const config: ClusterConfig = yaml.parse(configFile);

    // Create a cluster for each configuration
    Object.entries(config.clusters).forEach(([name, clusterConfig]) => {
      new AwsProvider(this, `aws-${name}`, {
        region: clusterConfig.region,
        alias: name,
      });

      const cluster = new EksCluster(this, `cluster-${name}`, {
        name: name,
        version: "1.28",
        roleArn: this.getClusterRole(name),
        vpcConfig: {
          subnetIds: this.getSubnetsForRegion(clusterConfig.region),
        },
        provider: `aws.${name}`,
      });

      new EksNodeGroup(this, `nodes-${name}`, {
        clusterName: cluster.name,
        nodeGroupName: `${name}-workers`,
        nodeRoleArn: this.getNodeRole(name),
        subnetIds: this.getSubnetsForRegion(clusterConfig.region),
        scalingConfig: {
          minSize: clusterConfig.minNodes,
          maxSize: clusterConfig.maxNodes,
          desiredSize: clusterConfig.minNodes,
        },
        instanceTypes: [clusterConfig.nodeType],
        provider: `aws.${name}`,
      });
    });
  }

  private getClusterRole(cluster: string): string {
    return `arn:aws:iam::123456789012:role/${cluster}-cluster-role`;
  }

  private getNodeRole(cluster: string): string {
    return `arn:aws:iam::123456789012:role/${cluster}-node-role`;
  }

  private getSubnetsForRegion(region: string): string[] {
    const subnetMap: { [key: string]: string[] } = {
      "us-west-2": ["subnet-abc", "subnet-def"],
      "us-east-1": ["subnet-ghi", "subnet-jkl"],
    };
    return subnetMap[region] || [];
  }
}
```

This enables declarative configuration outside of code while maintaining type safety.

## Deploying and Managing Stacks

Deploy infrastructure using familiar CDKTF commands.

```bash
# Generate Terraform configuration
cdktf synth

# Preview changes
cdktf diff

# Deploy infrastructure
cdktf deploy

# Deploy specific stack
cdktf deploy k8s-infrastructure

# Destroy resources
cdktf destroy

# View outputs
cdktf output
```

CDKTF handles Terraform execution, state management, and output retrieval automatically.

Cloud Development Kit for Terraform brings the power of general-purpose programming languages to Kubernetes infrastructure management. By using TypeScript or Python instead of HCL, you gain abstraction capabilities, testing support, and familiar development workflows. The ability to create reusable constructs and leverage language features like loops and conditionals makes complex infrastructure patterns simple to implement and maintain. For teams already comfortable with Terraform but seeking better abstractions, CDKTF provides the best of both worlds.

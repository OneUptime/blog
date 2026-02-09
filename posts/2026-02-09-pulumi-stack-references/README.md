# How to Use Pulumi Stack References for Cross-Stack Kubernetes Resource Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Kubernetes, Infrastructure-as-Code

Description: Learn how to use Pulumi stack references to share outputs between stacks, enabling modular infrastructure where networking, cluster, and application stacks depend on each other without tight coupling.

---

Complex Kubernetes infrastructure often spans multiple Pulumi stacks. A networking stack creates VPCs, a cluster stack provisions EKS, and application stacks deploy workloads. Stack references let these stacks share data without merging them into monolithic configurations.

This guide shows you how to structure multi-stack infrastructure with proper dependency management using stack references.

## Understanding Stack References

Stack references query outputs from other stacks. They work across projects and organizations, letting you build layered infrastructure. The networking stack exposes subnet IDs, the cluster stack consumes them, and application stacks reference the cluster endpoint.

This creates loose coupling. You can update one stack without rebuilding others, as long as outputs remain compatible.

## Creating the Base Infrastructure Stack

Start with networking:

```typescript
// infrastructure/networking/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create VPC
const vpc = new aws.ec2.Vpc("main", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "main-vpc" }
});

// Create subnets
const publicSubnets = ["10.0.1.0/24", "10.0.2.0/24"].map((cidr, i) =>
  new aws.ec2.Subnet(`public-${i}`, {
    vpcId: vpc.id,
    cidrBlock: cidr,
    availabilityZone: `us-west-2${String.fromCharCode(97 + i)}`,
    mapPublicIpOnLaunch: true,
    tags: { Name: `public-subnet-${i}`, Type: "public" }
  })
);

const privateSubnets = ["10.0.11.0/24", "10.0.12.0/24"].map((cidr, i) =>
  new aws.ec2.Subnet(`private-${i}`, {
    vpcId: vpc.id,
    cidrBlock: cidr,
    availabilityZone: `us-west-2${String.fromCharCode(97 + i)}`,
    tags: { Name: `private-subnet-${i}`, Type: "private" }
  })
);

// Export outputs for other stacks
export const vpcId = vpc.id;
export const publicSubnetIds = publicSubnets.map(s => s.id);
export const privateSubnetIds = privateSubnets.map(s => s.id);
export const vpcCidr = vpc.cidrBlock;
```

Deploy the networking stack:

```bash
cd infrastructure/networking
pulumi stack init prod
pulumi up
```

## Consuming Stack References in Cluster Stack

Reference networking outputs:

```typescript
// infrastructure/cluster/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

const config = new pulumi.Config();
const networkingStackName = config.require("networkingStack");

// Reference networking stack
const networkingStack = new pulumi.StackReference(networkingStackName);

// Get outputs from networking stack
const vpcId = networkingStack.getOutput("vpcId");
const privateSubnetIds = networkingStack.getOutput("privateSubnetIds");
const publicSubnetIds = networkingStack.getOutput("publicSubnetIds");

// Create EKS cluster using networking outputs
const cluster = new eks.Cluster("main", {
  vpcId: vpcId,
  privateSubnetIds: privateSubnetIds,
  publicSubnetIds: publicSubnetIds,
  instanceType: "t3.medium",
  desiredCapacity: 3,
  minSize: 1,
  maxSize: 5,
  createOidcProvider: true
});

// Export cluster outputs
export const clusterName = cluster.eksCluster.name;
export const kubeconfig = cluster.kubeconfig;
export const clusterEndpoint = cluster.eksCluster.endpoint;
export const clusterOidcProvider = cluster.core.oidcProvider?.url;
export const clusterOidcProviderArn = cluster.core.oidcProvider?.arn;
```

Configure the stack reference:

```bash
cd infrastructure/cluster
pulumi stack init prod
pulumi config set networkingStack organization/networking-stack/prod
pulumi up
```

## Building Application Stacks

Reference both networking and cluster:

```typescript
// applications/myapp/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();

// Reference infrastructure stacks
const clusterStack = new pulumi.StackReference(
  config.require("clusterStack")
);
const networkingStack = new pulumi.StackReference(
  config.require("networkingStack")
);

// Get cluster configuration
const kubeconfig = clusterStack.getOutput("kubeconfig");
const clusterOidcProviderArn = clusterStack.getOutput("clusterOidcProviderArn");

// Configure Kubernetes provider
const provider = new k8s.Provider("k8s", {
  kubeconfig: kubeconfig
});

// Create namespace
const namespace = new k8s.core.v1.Namespace("myapp", {
  metadata: { name: "myapp" }
}, { provider });

// Create service account with IRSA
const serviceAccount = new k8s.core.v1.ServiceAccount("myapp-sa", {
  metadata: {
    namespace: namespace.metadata.name,
    name: "myapp-sa",
    annotations: {
      "eks.amazonaws.com/role-arn": iamRole.arn
    }
  }
}, { provider });

// Create IAM role for service account
const iamRole = new aws.iam.Role("myapp-role", {
  assumeRolePolicy: pulumi.all([clusterOidcProviderArn]).apply(([oidcArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: {
          Federated: oidcArn
        },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: {
            [`${oidcArn.replace("arn:aws:iam::", "").replace(":oidc-provider/", "")}:sub`]:
              `system:serviceaccount:myapp:myapp-sa`
          }
        }
      }]
    })
  )
});

// Deploy application
const deployment = new k8s.apps.v1.Deployment("myapp", {
  metadata: {
    namespace: namespace.metadata.name,
    name: "myapp"
  },
  spec: {
    replicas: 3,
    selector: { matchLabels: { app: "myapp" } },
    template: {
      metadata: { labels: { app: "myapp" } },
      spec: {
        serviceAccountName: serviceAccount.metadata.name,
        containers: [{
          name: "app",
          image: "myapp:v1.0.0",
          ports: [{ containerPort: 8080 }]
        }]
      }
    }
  }
}, { provider });

export const deploymentName = deployment.metadata.name;
```

## Implementing Environment-Specific References

Use different stacks per environment:

```typescript
// applications/myapp/index.ts (extended)
const environment = pulumi.getStack();

// Reference environment-specific infrastructure
const clusterStack = new pulumi.StackReference(
  `organization/cluster-stack/${environment}`
);
const networkingStack = new pulumi.StackReference(
  `organization/networking-stack/${environment}`
);

// Environment-specific configuration
const environmentConfig = {
  dev: {
    replicas: 1,
    resources: {
      cpu: "100m",
      memory: "128Mi"
    }
  },
  staging: {
    replicas: 2,
    resources: {
      cpu: "200m",
      memory: "256Mi"
    }
  },
  prod: {
    replicas: 5,
    resources: {
      cpu: "500m",
      memory: "512Mi"
    }
  }
};

const envConfig = environmentConfig[environment] || environmentConfig.dev;
```

## Sharing Data Between Application Stacks

Application stacks can reference each other:

```typescript
// applications/frontend/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();

// Reference backend stack
const backendStack = new pulumi.StackReference(
  config.require("backendStack")
);

// Get backend service URL
const backendServiceUrl = backendStack.getOutput("serviceUrl");

const deployment = new k8s.apps.v1.Deployment("frontend", {
  spec: {
    template: {
      spec: {
        containers: [{
          name: "frontend",
          image: "frontend:latest",
          env: [{
            name: "API_URL",
            value: backendServiceUrl
          }]
        }]
      }
    }
  }
}, { provider });
```

## Implementing Cross-Region References

Reference stacks in different regions:

```typescript
// applications/global-app/index.ts
const usWestCluster = new pulumi.StackReference(
  "organization/cluster/us-west-2-prod"
);
const usEastCluster = new pulumi.StackReference(
  "organization/cluster/us-east-1-prod"
);

// Deploy to both regions
const usWestProvider = new k8s.Provider("us-west", {
  kubeconfig: usWestCluster.getOutput("kubeconfig")
});

const usEastProvider = new k8s.Provider("us-east", {
  kubeconfig: usEastCluster.getOutput("kubeconfig")
});

// Deploy same app to both clusters
function deployApp(name: string, provider: k8s.Provider) {
  return new k8s.apps.v1.Deployment(name, {
    spec: {
      replicas: 3,
      selector: { matchLabels: { app: "myapp" } },
      template: {
        metadata: { labels: { app: "myapp" } },
        spec: {
          containers: [{
            name: "app",
            image: "myapp:latest"
          }]
        }
      }
    }
  }, { provider });
}

const usWestDeployment = deployApp("app-us-west", usWestProvider);
const usEastDeployment = deployApp("app-us-east", usEastProvider);
```

## Handling Stack Reference Errors

Add error handling:

```typescript
// Safe stack reference with fallbacks
async function getStackOutput<T>(
  stackName: string,
  outputName: string,
  defaultValue: T
): Promise<pulumi.Output<T>> {
  try {
    const stack = new pulumi.StackReference(stackName);
    return stack.getOutput(outputName);
  } catch (error) {
    pulumi.log.warn(
      `Failed to get ${outputName} from ${stackName}, using default`,
      stack
    );
    return pulumi.output(defaultValue);
  }
}

// Usage
const vpcId = await getStackOutput(
  "organization/networking/prod",
  "vpcId",
  "vpc-default"
);
```

## Implementing Versioned Stack References

Track compatibility:

```typescript
// Stack with version output
export const version = "v1.2.0";
export const apiVersion = "v1";
export const vpcId = vpc.id;

// Consumer checks version
const networkingStack = new pulumi.StackReference("org/networking/prod");
const stackVersion = networkingStack.getOutput("version");

stackVersion.apply(version => {
  const [major] = version.split(".");
  if (parseInt(major) < 1) {
    throw new Error(`Incompatible networking stack version: ${version}`);
  }
});
```

## Summary

Pulumi stack references enable modular infrastructure management. By splitting infrastructure into focused stacks and sharing outputs through references, you create flexible systems that evolve independently. Networking, cluster, and application stacks can be updated separately while maintaining dependencies. This pattern scales from simple dev/prod splits to complex multi-region, multi-tenant platforms with dozens of interconnected stacks.

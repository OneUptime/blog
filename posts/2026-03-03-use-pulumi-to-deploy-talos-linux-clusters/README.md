# How to Use Pulumi to Deploy Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pulumi, Infrastructure as Code, Kubernetes, Cloud Deployment, TypeScript

Description: Deploy Talos Linux Kubernetes clusters using Pulumi with real programming languages for infrastructure-as-code flexibility.

---

Pulumi lets you define infrastructure using real programming languages instead of domain-specific configuration languages. If you prefer writing TypeScript, Python, Go, or C# over HCL, Pulumi is an attractive alternative to Terraform for deploying Talos Linux clusters. You get the full power of a programming language, including loops, conditionals, functions, and type checking, for defining your infrastructure. In this guide, we will deploy a Talos Linux cluster on AWS using Pulumi with TypeScript.

## Why Pulumi for Talos Linux

Pulumi offers several advantages over configuration-language-based tools:

- **Real programming languages**: Use TypeScript, Python, Go, or C# with full IDE support
- **Type safety**: Catch configuration errors at compile time
- **Abstraction**: Create reusable components with proper interfaces
- **Testing**: Write unit tests for your infrastructure code
- **Rich ecosystem**: Use npm packages, Python libraries, and Go modules alongside infrastructure code
- **State management**: Pulumi manages state in the cloud (Pulumi Service) or locally

## Prerequisites

You need:

- Pulumi CLI installed
- Node.js (for TypeScript) or your preferred language runtime
- AWS credentials configured
- talosctl installed

## Step 1: Create the Pulumi Project

```bash
# Create a new Pulumi project
mkdir talos-pulumi && cd talos-pulumi
pulumi new aws-typescript

# Install additional packages
npm install @pulumi/aws @pulumi/command
```

## Step 2: Define the Network Infrastructure

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";

// Configuration
const config = new pulumi.Config();
const clusterName = config.get("clusterName") || "talos-cluster";
const controlplaneCount = config.getNumber("controlplaneCount") || 3;
const workerCount = config.getNumber("workerCount") || 3;
const instanceType = config.get("instanceType") || "m5.xlarge";
const workerInstanceType = config.get("workerInstanceType") || "m5.2xlarge";
const talosVersion = config.get("talosVersion") || "v1.6.0";

// Get available AZs
const azs = aws.getAvailabilityZones({
    state: "available",
});

// Create VPC
const vpc = new aws.ec2.Vpc(`${clusterName}-vpc`, {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: `${clusterName}-vpc` },
});

// Create Internet Gateway
const igw = new aws.ec2.InternetGateway(`${clusterName}-igw`, {
    vpcId: vpc.id,
    tags: { Name: `${clusterName}-igw` },
});

// Create subnets across AZs
const subnets: aws.ec2.Subnet[] = [];
for (let i = 0; i < 3; i++) {
    const subnet = new aws.ec2.Subnet(`${clusterName}-subnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${i}.0/24`,
        availabilityZone: azs.then(az => az.names[i]),
        mapPublicIpOnLaunch: true,
        tags: { Name: `${clusterName}-subnet-${i}` },
    });
    subnets.push(subnet);
}

// Create route table
const routeTable = new aws.ec2.RouteTable(`${clusterName}-rt`, {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: igw.id,
    }],
});

// Associate subnets with route table
subnets.forEach((subnet, i) => {
    new aws.ec2.RouteTableAssociation(`${clusterName}-rta-${i}`, {
        subnetId: subnet.id,
        routeTableId: routeTable.id,
    });
});

// Security group for Talos nodes
const sg = new aws.ec2.SecurityGroup(`${clusterName}-sg`, {
    vpcId: vpc.id,
    description: "Security group for Talos Linux cluster",
    ingress: [
        // Inter-node communication
        { protocol: "-1", fromPort: 0, toPort: 0, self: true },
        // Kubernetes API
        { protocol: "tcp", fromPort: 6443, toPort: 6443, cidrBlocks: ["0.0.0.0/0"] },
        // Talos API
        { protocol: "tcp", fromPort: 50000, toPort: 50000, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Name: `${clusterName}-sg` },
});
```

## Step 3: Create the Load Balancer and Instances

```typescript
// API Load Balancer
const apiLb = new aws.lb.LoadBalancer(`${clusterName}-api-lb`, {
    internal: false,
    loadBalancerType: "network",
    subnets: subnets.map(s => s.id),
    tags: { Name: `${clusterName}-api-lb` },
});

const apiTargetGroup = new aws.lb.TargetGroup(`${clusterName}-api-tg`, {
    port: 6443,
    protocol: "TCP",
    vpcId: vpc.id,
    healthCheck: {
        protocol: "TCP",
        port: "6443",
    },
});

new aws.lb.Listener(`${clusterName}-api-listener`, {
    loadBalancerArn: apiLb.arn,
    port: 6443,
    protocol: "TCP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: apiTargetGroup.arn,
    }],
});

// Find the Talos AMI
const talosAmi = aws.ec2.getAmi({
    mostRecent: true,
    owners: ["540036508848"],
    filters: [{
        name: "name",
        values: [`talos-${talosVersion}-*-amd64`],
    }],
});

// Create control plane instances
const controlplaneInstances: aws.ec2.Instance[] = [];
for (let i = 0; i < controlplaneCount; i++) {
    const instance = new aws.ec2.Instance(`${clusterName}-cp-${i}`, {
        ami: talosAmi.then(ami => ami.id),
        instanceType: instanceType,
        subnetId: subnets[i % 3].id,
        vpcSecurityGroupIds: [sg.id],
        rootBlockDevice: {
            volumeSize: 50,
            volumeType: "gp3",
        },
        tags: {
            Name: `${clusterName}-cp-${i}`,
            Role: "controlplane",
        },
    });
    controlplaneInstances.push(instance);

    // Register with API load balancer
    new aws.lb.TargetGroupAttachment(`${clusterName}-cp-tg-${i}`, {
        targetGroupArn: apiTargetGroup.arn,
        targetId: instance.id,
        port: 6443,
    });
}

// Create worker instances
const workerInstances: aws.ec2.Instance[] = [];
for (let i = 0; i < workerCount; i++) {
    const instance = new aws.ec2.Instance(`${clusterName}-worker-${i}`, {
        ami: talosAmi.then(ami => ami.id),
        instanceType: workerInstanceType,
        subnetId: subnets[i % 3].id,
        vpcSecurityGroupIds: [sg.id],
        rootBlockDevice: {
            volumeSize: 100,
            volumeType: "gp3",
        },
        tags: {
            Name: `${clusterName}-worker-${i}`,
            Role: "worker",
        },
    });
    workerInstances.push(instance);
}
```

## Step 4: Generate Talos Configuration and Bootstrap

Since Pulumi does not have a native Talos provider, we use the command provider to run talosctl:

```typescript
// Generate Talos secrets
const talosSecrets = new command.local.Command("talos-gen-secrets", {
    create: "talosctl gen secrets -o /tmp/talos-secrets.yaml && cat /tmp/talos-secrets.yaml",
});

// Generate machine configurations
const genConfig = new command.local.Command("talos-gen-config", {
    create: pulumi.interpolate`talosctl gen config ${clusterName} https://${apiLb.dnsName}:6443 \
        --from /tmp/talos-secrets.yaml \
        --output-dir /tmp/talos-config \
        --force && echo "done"`,
}, { dependsOn: [talosSecrets, apiLb] });

// Apply configuration to control plane nodes
controlplaneInstances.forEach((instance, i) => {
    new command.local.Command(`apply-cp-config-${i}`, {
        create: pulumi.interpolate`sleep 60 && talosctl apply-config \
            --insecure \
            --nodes ${instance.publicIp} \
            --file /tmp/talos-config/controlplane.yaml`,
    }, { dependsOn: [genConfig, instance] });
});

// Apply configuration to worker nodes
workerInstances.forEach((instance, i) => {
    new command.local.Command(`apply-worker-config-${i}`, {
        create: pulumi.interpolate`sleep 60 && talosctl apply-config \
            --insecure \
            --nodes ${instance.publicIp} \
            --file /tmp/talos-config/worker.yaml`,
    }, { dependsOn: [genConfig, instance] });
});

// Bootstrap the cluster
const bootstrap = new command.local.Command("talos-bootstrap", {
    create: pulumi.interpolate`sleep 120 && talosctl bootstrap \
        --nodes ${controlplaneInstances[0].publicIp} \
        --talosconfig /tmp/talos-config/talosconfig`,
}, { dependsOn: controlplaneInstances.map((_, i) => `apply-cp-config-${i}`) });

// Get kubeconfig
const kubeconfig = new command.local.Command("get-kubeconfig", {
    create: pulumi.interpolate`sleep 60 && talosctl kubeconfig \
        --nodes ${controlplaneInstances[0].publicIp} \
        --talosconfig /tmp/talos-config/talosconfig \
        -f /tmp/talos-kubeconfig && cat /tmp/talos-kubeconfig`,
}, { dependsOn: [bootstrap] });
```

## Step 5: Create a Reusable Component

Wrap the cluster creation in a reusable Pulumi component:

```typescript
// talos-cluster.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface TalosClusterArgs {
    name: string;
    controlplaneCount: number;
    workerCount: number;
    controlplaneInstanceType: string;
    workerInstanceType: string;
    talosVersion: string;
    vpcCidr: string;
}

export class TalosCluster extends pulumi.ComponentResource {
    public readonly apiEndpoint: pulumi.Output<string>;
    public readonly controlplaneIps: pulumi.Output<string>[];
    public readonly workerIps: pulumi.Output<string>[];

    constructor(
        name: string,
        args: TalosClusterArgs,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("custom:infrastructure:TalosCluster", name, {}, opts);

        // Create all resources as children of this component
        // (VPC, subnets, instances, etc. - same as above but with parent: this)

        this.apiEndpoint = pulumi.interpolate`https://api-lb-dns:6443`;
        this.controlplaneIps = [];
        this.workerIps = [];

        this.registerOutputs({
            apiEndpoint: this.apiEndpoint,
        });
    }
}
```

Usage:

```typescript
// main.ts
import { TalosCluster } from "./talos-cluster";

const cluster = new TalosCluster("production", {
    name: "production",
    controlplaneCount: 3,
    workerCount: 5,
    controlplaneInstanceType: "m5.xlarge",
    workerInstanceType: "m5.2xlarge",
    talosVersion: "v1.6.0",
    vpcCidr: "10.0.0.0/16",
});

export const apiEndpoint = cluster.apiEndpoint;
```

## Step 6: Add Unit Tests

One of Pulumi's strengths is testability:

```typescript
// talos-cluster.test.ts
import * as pulumi from "@pulumi/pulumi";
import "mocha";
import { expect } from "chai";

pulumi.runtime.setMocks({
    newResource: (args) => {
        return { id: `${args.name}-id`, state: args.inputs };
    },
    call: (args) => {
        return args.inputs;
    },
});

describe("TalosCluster", () => {
    it("should create the correct number of control plane instances", async () => {
        const { TalosCluster } = await import("./talos-cluster");
        const cluster = new TalosCluster("test", {
            name: "test",
            controlplaneCount: 3,
            workerCount: 2,
            controlplaneInstanceType: "m5.xlarge",
            workerInstanceType: "m5.2xlarge",
            talosVersion: "v1.6.0",
            vpcCidr: "10.0.0.0/16",
        });

        // Verify control plane count
        expect(cluster.controlplaneIps.length).to.equal(3);
    });
});
```

## Step 7: Define Outputs

```typescript
// Export useful values
export const apiEndpoint = pulumi.interpolate`https://${apiLb.dnsName}:6443`;
export const controlplanePublicIps = controlplaneInstances.map(i => i.publicIp);
export const workerPublicIps = workerInstances.map(i => i.publicIp);
export const kubeconfigContent = kubeconfig.stdout;
```

## Step 8: Deploy and Manage

```bash
# Preview changes
pulumi preview

# Deploy the cluster
pulumi up

# Get outputs
pulumi stack output apiEndpoint
pulumi stack output kubeconfigContent --show-secrets > kubeconfig

# Scale workers by updating configuration
pulumi config set workerCount 5
pulumi up

# Destroy the cluster
pulumi destroy
```

## Conclusion

Pulumi brings the power of real programming languages to Talos Linux infrastructure provisioning. While you trade the simplicity of HCL for the flexibility of TypeScript, Go, or Python, the benefits are significant: type safety catches errors early, reusable components reduce duplication, and unit tests give you confidence in your infrastructure code. For teams already comfortable with these programming languages, Pulumi offers a natural way to manage Talos Linux clusters alongside application code using the same tools, patterns, and review processes.

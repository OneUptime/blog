# How to Use CDKTF for Complex Programming Logic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, TypeScript, Infrastructure as Code, Programming

Description: Learn how to leverage full programming capabilities in CDKTF to handle complex infrastructure patterns using loops, conditionals, abstractions, and data processing.

---

The biggest advantage CDKTF has over plain HCL is that you can use a real programming language. Loops, conditionals, functions, classes, external data, API calls - everything is available. This means infrastructure patterns that are awkward or impossible in HCL become straightforward in CDKTF. This guide shows practical examples of using complex programming logic to solve real infrastructure problems.

## Beyond Simple Resource Definitions

In HCL, complex logic is limited to `count`, `for_each`, `dynamic` blocks, and a handful of built-in functions. In CDKTF, you have the full TypeScript (or Python, Go, Java) standard library and the entire npm ecosystem. Here is what that unlocks.

## Dynamic Resource Creation with Loops

Create resources programmatically based on data:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";

interface SubnetConfig {
  name: string;
  cidr: string;
  az: string;
  isPublic: boolean;
}

class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
    });

    // Define subnets as data
    const subnets: SubnetConfig[] = [
      { name: "web-a", cidr: "10.0.1.0/24", az: "us-east-1a", isPublic: true },
      { name: "web-b", cidr: "10.0.2.0/24", az: "us-east-1b", isPublic: true },
      { name: "app-a", cidr: "10.0.11.0/24", az: "us-east-1a", isPublic: false },
      { name: "app-b", cidr: "10.0.12.0/24", az: "us-east-1b", isPublic: false },
      { name: "db-a", cidr: "10.0.21.0/24", az: "us-east-1a", isPublic: false },
      { name: "db-b", cidr: "10.0.22.0/24", az: "us-east-1b", isPublic: false },
    ];

    // Create all subnets from the data
    const createdSubnets = subnets.map((config) => {
      return new Subnet(this, config.name, {
        vpcId: vpc.id,
        cidrBlock: config.cidr,
        availabilityZone: config.az,
        mapPublicIpOnLaunch: config.isPublic,
        tags: {
          Name: config.name,
          Tier: config.isPublic ? "public" : "private",
        },
      });
    });

    // Group subnets by tier for easy access
    const publicSubnets = createdSubnets.filter(
      (_, i) => subnets[i].isPublic
    );
    const privateSubnets = createdSubnets.filter(
      (_, i) => !subnets[i].isPublic
    );
  }
}
```

## CIDR Calculation with Code

Calculate subnet CIDRs programmatically instead of hardcoding them:

```typescript
// Helper function to calculate subnet CIDRs
function calculateSubnetCidrs(
  vpcCidr: string,
  subnetBits: number,
  count: number,
  offset: number = 0
): string[] {
  const [baseIp, prefixLength] = vpcCidr.split("/");
  const newPrefix = parseInt(prefixLength) + subnetBits;
  const octets = baseIp.split(".").map(Number);

  return Array.from({ length: count }, (_, i) => {
    const subnetIndex = i + offset;
    // Calculate the third octet based on the subnet index
    const thirdOctet = octets[2] + subnetIndex;
    return `${octets[0]}.${octets[1]}.${thirdOctet}.0/${newPrefix}`;
  });
}

// Use in a stack
const vpcCidr = "10.0.0.0/16";
const publicCidrs = calculateSubnetCidrs(vpcCidr, 8, 3, 0);
// ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]

const privateCidrs = calculateSubnetCidrs(vpcCidr, 8, 3, 10);
// ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
```

## Configuration-Driven Infrastructure

Read configuration from external files and generate infrastructure:

```typescript
import * as fs from "fs";
import * as path from "path";

// config/services.json
// {
//   "services": [
//     {
//       "name": "user-api",
//       "cpu": 256,
//       "memory": 512,
//       "port": 8080,
//       "replicas": 3,
//       "healthCheckPath": "/health"
//     },
//     {
//       "name": "order-api",
//       "cpu": 512,
//       "memory": 1024,
//       "port": 8080,
//       "replicas": 2,
//       "healthCheckPath": "/status"
//     }
//   ]
// }

interface ServiceConfig {
  name: string;
  cpu: number;
  memory: number;
  port: number;
  replicas: number;
  healthCheckPath: string;
}

class MicroservicesStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Read service configurations from a JSON file
    const configPath = path.resolve(__dirname, "config/services.json");
    const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const services: ServiceConfig[] = configData.services;

    // Create infrastructure for each service
    services.forEach((service) => {
      this.createService(service);
    });
  }

  private createService(config: ServiceConfig): void {
    // Create a log group for the service
    new CloudwatchLogGroup(this, `${config.name}-logs`, {
      name: `/ecs/${config.name}`,
      retentionInDays: 30,
    });

    // Create a target group
    const tg = new LbTargetGroup(this, `${config.name}-tg`, {
      name: config.name,
      port: config.port,
      protocol: "HTTP",
      targetType: "ip",
      healthCheck: {
        path: config.healthCheckPath,
        interval: 30,
      },
    });

    // Create the ECS service
    // (simplified - real implementation would need task definitions, etc.)
  }
}
```

## Conditional Resource Creation

Use standard TypeScript conditionals for complex decision making:

```typescript
interface StackConfig {
  environment: string;
  enableMonitoring: boolean;
  enableBackups: boolean;
  enableMultiAz: boolean;
  enableWaf: boolean;
}

class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: StackConfig) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const db = new DbInstance(this, "database", {
      engine: "postgres",
      instanceClass: config.environment === "production"
        ? "db.r5.large"
        : "db.t3.micro",
      allocatedStorage: config.environment === "production" ? 100 : 20,
      multiAz: config.enableMultiAz,
      storageEncrypted: true,
      backupRetentionPeriod: config.enableBackups ? 30 : 0,
    });

    // Only create monitoring resources if enabled
    if (config.enableMonitoring) {
      new CloudwatchMetricAlarm(this, "db-cpu-alarm", {
        alarmName: `${config.environment}-db-high-cpu`,
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 3,
        metricName: "CPUUtilization",
        namespace: "AWS/RDS",
        period: 300,
        statistic: "Average",
        threshold: 80,
        dimensions: {
          DBInstanceIdentifier: db.identifier,
        },
      });

      new CloudwatchMetricAlarm(this, "db-storage-alarm", {
        alarmName: `${config.environment}-db-low-storage`,
        comparisonOperator: "LessThanThreshold",
        evaluationPeriods: 1,
        metricName: "FreeStorageSpace",
        namespace: "AWS/RDS",
        period: 300,
        statistic: "Average",
        threshold: 5000000000, // 5 GB
        dimensions: {
          DBInstanceIdentifier: db.identifier,
        },
      });
    }

    // Only create WAF in production
    if (config.enableWaf) {
      // WAF configuration
    }
  }
}

// Create different environments with different configs
const app = new App();

new ApplicationStack(app, "dev", {
  environment: "development",
  enableMonitoring: false,
  enableBackups: false,
  enableMultiAz: false,
  enableWaf: false,
});

new ApplicationStack(app, "prod", {
  environment: "production",
  enableMonitoring: true,
  enableBackups: true,
  enableMultiAz: true,
  enableWaf: true,
});
```

## Using Maps and Reduce for Resource Aggregation

```typescript
// Create security group rules from a structured definition
interface FirewallRule {
  port: number;
  protocol: string;
  sources: string[];
  description: string;
}

const firewallRules: FirewallRule[] = [
  { port: 443, protocol: "tcp", sources: ["0.0.0.0/0"], description: "HTTPS" },
  { port: 80, protocol: "tcp", sources: ["0.0.0.0/0"], description: "HTTP" },
  { port: 22, protocol: "tcp", sources: ["10.0.0.0/8"], description: "SSH internal" },
  { port: 5432, protocol: "tcp", sources: ["10.0.0.0/8"], description: "PostgreSQL" },
];

// Transform rules into the format needed by the security group resource
const sgIngress = firewallRules.map((rule) => ({
  fromPort: rule.port,
  toPort: rule.port,
  protocol: rule.protocol,
  cidrBlocks: rule.sources,
  description: rule.description,
}));

new SecurityGroup(this, "app-sg", {
  vpcId: vpc.id,
  ingress: sgIngress,
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
      description: "Allow all outbound",
    },
  ],
});
```

## Factory Patterns for Resource Creation

```typescript
// Factory function that creates standardized databases
function createDatabase(
  stack: TerraformStack,
  name: string,
  tier: "small" | "medium" | "large"
): DbInstance {
  const tierConfig = {
    small: { instanceClass: "db.t3.micro", storage: 20 },
    medium: { instanceClass: "db.t3.medium", storage: 100 },
    large: { instanceClass: "db.r5.large", storage: 500 },
  };

  const config = tierConfig[tier];

  return new DbInstance(stack, name, {
    identifier: name,
    engine: "postgres",
    engineVersion: "15",
    instanceClass: config.instanceClass,
    allocatedStorage: config.storage,
    storageEncrypted: true,
    multiAz: tier === "large",
    tags: {
      Name: name,
      Tier: tier,
    },
  });
}

// Usage
const userDb = createDatabase(this, "user-db", "medium");
const analyticsDb = createDatabase(this, "analytics-db", "large");
const cacheDb = createDatabase(this, "cache-db", "small");
```

## Using Async Data at Build Time

You can fetch data during synthesis:

```typescript
import * as fs from "fs";

class DynamicStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Read IP allowlist from a file (could be fetched from an API before synth)
    const allowedIps = fs
      .readFileSync("allowed-ips.txt", "utf-8")
      .split("\n")
      .filter((ip) => ip.trim().length > 0)
      .map((ip) => ip.trim());

    new SecurityGroup(this, "restricted-sg", {
      ingress: [
        {
          fromPort: 443,
          toPort: 443,
          protocol: "tcp",
          cidrBlocks: allowedIps,
          description: "Restricted HTTPS access",
        },
      ],
    });
  }
}
```

## Best Practices

1. **Keep logic readable**. Just because you can write complex code does not mean you should. Clear, simple logic is easier to review and maintain.

2. **Use TypeScript interfaces** for configuration objects. This documents the expected structure and catches errors at compile time.

3. **Extract complex logic into functions**. Helper functions and factory patterns keep your stack constructors clean.

4. **Test your logic**. The more complex your logic, the more important it is to have unit tests.

5. **Avoid side effects during synthesis**. Do not make API calls that modify things during `cdktf synth`. Read operations are fine.

6. **Document your patterns**. Complex logic needs comments explaining why, not just what.

The ability to use real programming logic is CDKTF's superpower. Use it wisely to make your infrastructure code clearer, more maintainable, and more powerful than what HCL alone can achieve. For more on dynamic resource creation, see our guide on [CDKTF iterators](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-iterators-for-dynamic-resources/view).

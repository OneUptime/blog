# How to Manage Portainer with Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Pulumi, Infrastructure as Code, DevOps, Automation

Description: Use Pulumi's infrastructure as code platform to automate Portainer deployments, environment management, and stack configurations using TypeScript or Python.

## Introduction

Pulumi is a modern infrastructure as code platform that lets you use familiar programming languages like TypeScript, Python, and Go to define cloud infrastructure. Unlike HCL-based tools, Pulumi gives you the full power of a programming language with loops, conditionals, and abstractions. By combining Pulumi with Portainer's REST API, you can fully automate your container management infrastructure.

## Prerequisites

- Pulumi CLI installed: `curl -fsSL https://get.pulumi.com | sh`
- A supported Node.js LTS release
- Portainer instance running and accessible
- Portainer API access token

## Step 1: Initialize Pulumi Project

```bash
# Create new Pulumi project

mkdir portainer-pulumi && cd portainer-pulumi
pulumi new typescript

# Install dependencies
npm install @pulumi/pulumi axios

# Stack configuration is set per environment in Step 5
```

## Step 2: Create Portainer Provider Helper

Since Pulumi doesn't have a native Portainer provider, we'll create a custom resource provider:

```typescript
// portainerProvider.ts
import axios, { AxiosInstance } from "axios";

export class PortainerClient {
  private client: AxiosInstance;
  
  constructor(
    baseUrl: string,
    apiKey: string
  ) {
    this.client = axios.create({
      baseURL: `${baseUrl}/api`,
      headers: {
        "X-API-KEY": apiKey,
      },
      // Skip TLS verification for self-signed certs in dev
      httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
    });
  }

  async getEnvironments(): Promise<any[]> {
    const response = await this.client.get("/endpoints");
    return response.data;
  }

  async createStack(
    envId: number,
    name: string,
    composeContent: string,
    envVars: Record<string, string> = {}
  ): Promise<any> {
    const env = Object.entries(envVars).map(([name, value]) => ({
      name,
      value,
    }));
    
    const response = await this.client.post(
      `/stacks/create/standalone/string?endpointId=${envId}`,
      {
        Name: name,
        StackFileContent: composeContent,
        Env: env,
      }
    );
    return response.data;
  }

  async updateStack(
    stackId: number,
    envId: number,
    composeContent: string,
    envVars: Record<string, string> = {}
  ): Promise<any> {
    const env = Object.entries(envVars).map(([name, value]) => ({
      name,
      value,
    }));

    const response = await this.client.put(
      `/stacks/${stackId}?endpointId=${envId}`,
      {
        StackFileContent: composeContent,
        Env: env,
      }
    );
    return response.data;
  }

  async deleteStack(stackId: number, envId: number): Promise<void> {
    await this.client.delete(`/stacks/${stackId}?endpointId=${envId}`);
  }
}
```

## Step 3: Define Portainer Stack as Pulumi Resource

```typescript
// portainerStack.ts
import * as pulumi from "@pulumi/pulumi";
import { PortainerClient } from "./portainerProvider";

type PortainerEnvVars = Record<string, pulumi.Input<string>>;

interface PortainerStackArgs {
  portainerUrl: pulumi.Input<string>;
  portainerApiKey: pulumi.Input<string>;
  name: pulumi.Input<string>;
  environmentId: pulumi.Input<number>;
  composeContent: pulumi.Input<string>;
  envVars?: pulumi.Input<PortainerEnvVars>;
}

interface PortainerStackInputs {
  portainerUrl: string;
  portainerApiKey: string;
  name: string;
  environmentId: number;
  composeContent: string;
  envVars?: Record<string, string>;
}

interface PortainerStackOutputs extends PortainerStackInputs {
  stackId: number;
  stackName: string;
}

const portainerProvider: pulumi.dynamic.ResourceProvider<
  PortainerStackInputs,
  PortainerStackOutputs
> = {
  async create(inputs) {
    const client = new PortainerClient(
      inputs.portainerUrl,
      inputs.portainerApiKey
    );

    const result = await client.createStack(
      inputs.environmentId,
      inputs.name,
      inputs.composeContent,
      inputs.envVars || {}
    );

    return {
      id: String(result.Id),
      outs: {
        ...inputs,
        stackId: result.Id,
        stackName: result.Name,
      },
    };
  },

  async diff(id, olds, news) {
    const replaces: string[] = [];

    if (olds.name !== news.name) {
      replaces.push("name");
    }

    if (olds.environmentId !== news.environmentId) {
      replaces.push("environmentId");
    }

    if (olds.portainerUrl !== news.portainerUrl) {
      replaces.push("portainerUrl");
    }

    const changes =
      replaces.length > 0 ||
      olds.portainerApiKey !== news.portainerApiKey ||
      olds.composeContent !== news.composeContent ||
      JSON.stringify(olds.envVars || {}) !== JSON.stringify(news.envVars || {});

    return { changes, replaces };
  },

  async update(id, olds, news) {
    const client = new PortainerClient(
      news.portainerUrl,
      news.portainerApiKey
    );

    const result = await client.updateStack(
      parseInt(id, 10),
      news.environmentId,
      news.composeContent,
      news.envVars || {}
    );

    return {
      outs: {
        ...news,
        stackId: result.Id,
        stackName: result.Name,
      },
    };
  },

  async delete(id, props) {
    const client = new PortainerClient(
      props.portainerUrl,
      props.portainerApiKey
    );

    await client.deleteStack(parseInt(id, 10), props.environmentId);
  },
};

export class PortainerStack extends pulumi.dynamic.Resource {
  public readonly stackId!: pulumi.Output<number>;
  public readonly stackName!: pulumi.Output<string>;

  constructor(
    name: string,
    args: PortainerStackArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(portainerProvider, name, args, opts);
  }
}
```

## Step 4: Create the Main Pulumi Program

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import { PortainerStack } from "./portainerStack";
import { getEnvironmentConfig } from "./environments";
import * as fs from "fs";

const config = new pulumi.Config();
const environment = pulumi.getStack(); // dev, staging, prod
const envConfig = getEnvironmentConfig(environment);

// Deploy monitoring stack
const monitoringComposeContent = `
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'
  
  grafana:
    image: grafana/grafana:latest
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false

volumes:
  prometheus-data:
  grafana-data:
`;

const monitoringStack = new PortainerStack("monitoring", {
  portainerUrl: config.require("portainerUrl"),
  portainerApiKey: config.requireSecret("portainerApiKey"),
  name: `monitoring-${environment}`,
  environmentId: envConfig.portainerEnvId,
  composeContent: monitoringComposeContent,
  envVars: {
    GRAFANA_PASSWORD: config.requireSecret("grafanaPassword"),
  },
});

// Deploy application stack from file
const appComposeContent = fs.readFileSync(
  `./stacks/${environment}/docker-compose.yml`,
  "utf-8"
);

const appStack = new PortainerStack("web-app", {
  portainerUrl: config.require("portainerUrl"),
  portainerApiKey: config.requireSecret("portainerApiKey"),
  name: `web-app-${environment}`,
  environmentId: envConfig.portainerEnvId,
  composeContent: appComposeContent,
  envVars: {
    DB_PASSWORD: config.requireSecret("dbPassword"),
    APP_SECRET: config.requireSecret("appSecret"),
    ENVIRONMENT: environment,
  },
});

// Export stack information
export const monitoringStackId = monitoringStack.stackId;
export const appStackId = appStack.stackId;
export const deploymentEnvironment = environment;
```

## Step 5: Deploy with Pulumi

```bash
# Initialize Pulumi state (local backend)
pulumi login --local
# Or use Pulumi Cloud
pulumi login

# Create and configure the development stack
pulumi stack select dev --create
pulumi config set portainerUrl https://portainer.example.com:9443
pulumi config set --secret portainerApiKey your-portainer-api-key
pulumi config set --secret grafanaPassword your-grafana-password
pulumi config set --secret dbPassword your-db-password
pulumi config set --secret appSecret your-app-secret

# Preview changes
pulumi preview

# Deploy to development
pulumi up --yes

# Create and configure the production stack
pulumi stack select prod --create
pulumi config set portainerUrl https://portainer.example.com:9443
pulumi config set --secret portainerApiKey your-portainer-api-key
pulumi config set --secret grafanaPassword your-production-grafana-password
pulumi config set --secret dbPassword your-production-db-password
pulumi config set --secret appSecret your-production-app-secret

# Preview and deploy to production
pulumi preview
pulumi up --yes

# View deployed resources
pulumi stack output

# Destroy resources
pulumi destroy --yes
```

## Step 6: Multi-Environment Management

```typescript
// environments.ts
interface EnvironmentConfig {
  portainerEnvId: number;
  replicas: number;
  resources: {
    cpuLimit: string;
    memoryLimit: string;
  };
}

const environmentConfigs: Record<string, EnvironmentConfig> = {
  dev: {
    portainerEnvId: 1,
    replicas: 1,
    resources: { cpuLimit: "0.5", memoryLimit: "512m" },
  },
  staging: {
    portainerEnvId: 2,
    replicas: 2,
    resources: { cpuLimit: "1", memoryLimit: "1g" },
  },
  prod: {
    portainerEnvId: 3,
    replicas: 3,
    resources: { cpuLimit: "2", memoryLimit: "2g" },
  },
};

export function getEnvironmentConfig(
  env: string
): EnvironmentConfig {
  const config = environmentConfigs[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return config;
}
```

## Conclusion

Managing Portainer with Pulumi brings the full power of a programming language to your infrastructure automation. The ability to use TypeScript's type system, conditionals, loops, and modules makes complex deployment scenarios manageable. With Pulumi's state management, you get a reliable record of what's deployed and what changes will be applied. This approach is particularly valuable for teams that prefer code over configuration files and want to apply software engineering best practices to their infrastructure.

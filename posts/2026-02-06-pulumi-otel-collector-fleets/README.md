# How to Use Pulumi to Provision OpenTelemetry Collector Fleets with Programmatic Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Pulumi, Infrastructure as Code, Fleet Management

Description: Provision and manage fleets of OpenTelemetry Collectors using Pulumi's programmatic infrastructure as code approach.

Pulumi lets you write infrastructure code in real programming languages like TypeScript, Python, and Go. This is a significant advantage over HCL when managing OpenTelemetry Collector fleets, because you can use loops, conditionals, and functions to generate configurations dynamically. This post shows how to provision a fleet of Collectors using Pulumi with TypeScript.

## Why Pulumi for Collector Fleets

When you have 20 teams each needing their own Collector with slightly different configurations, writing 20 separate Terraform modules is tedious. With Pulumi, you can define a team configuration in a data structure and loop over it to generate all the resources programmatically.

## Project Setup

```bash
# Create a new Pulumi project
pulumi new kubernetes-typescript --name otel-fleet

# Install dependencies
npm install @pulumi/kubernetes @pulumi/pulumi
```

## Defining the Fleet Configuration

```typescript
// fleet-config.ts
export interface TeamConfig {
  name: string;
  namespace: string;
  samplingRate: number;
  backends: string[];
  resourceLimits: {
    cpu: string;
    memory: string;
  };
  // Extra processors specific to this team
  extraProcessors?: string[];
}

export const teams: TeamConfig[] = [
  {
    name: "payments",
    namespace: "payments",
    samplingRate: 1.0,  // 100% sampling for critical services
    backends: ["https://primary-backend:4318"],
    resourceLimits: { cpu: "2", memory: "4Gi" },
  },
  {
    name: "catalog",
    namespace: "catalog",
    samplingRate: 0.1,  // 10% sampling for high-volume, low-criticality
    backends: ["https://primary-backend:4318"],
    resourceLimits: { cpu: "500m", memory: "1Gi" },
  },
  {
    name: "frontend",
    namespace: "frontend",
    samplingRate: 0.5,
    backends: [
      "https://primary-backend:4318",
      "https://rum-backend:4318"  // Also send to RUM backend
    ],
    resourceLimits: { cpu: "1", memory: "2Gi" },
    extraProcessors: ["transform/redact_pii"],
  },
];
```

## Generating Collector Configs Programmatically

```typescript
// config-generator.ts
import { TeamConfig } from "./fleet-config";

export function generateCollectorConfig(team: TeamConfig): string {
  // Build exporters section dynamically
  const exporters: Record<string, any> = {};
  team.backends.forEach((backend, i) => {
    exporters[`otlphttp/${i}`] = {
      endpoint: backend,
    };
  });

  // Build processors section
  const processors: Record<string, any> = {
    batch: {
      send_batch_size: 4096,
      timeout: "1s",
    },
    // Tail-based sampling rate from team config
    probabilistic_sampler: {
      sampling_percentage: team.samplingRate * 100,
    },
    // Add team identifier to all telemetry
    resource: {
      attributes: [
        { key: "team.name", value: team.name, action: "upsert" },
        { key: "team.namespace", value: team.namespace, action: "upsert" },
      ],
    },
  };

  // Add extra processors if defined
  if (team.extraProcessors) {
    for (const proc of team.extraProcessors) {
      if (proc === "transform/redact_pii") {
        processors["transform/redact_pii"] = {
          trace_statements: [
            {
              context: "span",
              statements: [
                'replace_pattern(attributes["http.url"], "email=[^&]*", "email=REDACTED")',
                'replace_pattern(attributes["http.url"], "token=[^&]*", "token=REDACTED")',
              ],
            },
          ],
        };
      }
    }
  }

  const processorNames = [
    "resource",
    "probabilistic_sampler",
    ...(team.extraProcessors || []),
    "batch",
  ];
  const exporterNames = team.backends.map((_, i) => `otlphttp/${i}`);

  const config = {
    receivers: {
      otlp: {
        protocols: {
          grpc: { endpoint: "0.0.0.0:4317" },
          http: { endpoint: "0.0.0.0:4318" },
        },
      },
    },
    processors,
    exporters,
    service: {
      pipelines: {
        traces: {
          receivers: ["otlp"],
          processors: processorNames,
          exporters: exporterNames,
        },
        metrics: {
          receivers: ["otlp"],
          processors: ["resource", "batch"],
          exporters: exporterNames,
        },
        logs: {
          receivers: ["otlp"],
          processors: ["resource", "batch"],
          exporters: exporterNames,
        },
      },
    },
  };

  // Pulumi requires YAML as a string
  // Using JSON.stringify since the Collector accepts JSON configs too
  return JSON.stringify(config, null, 2);
}
```

## Deploying the Fleet with Pulumi

```typescript
// index.ts
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { teams } from "./fleet-config";
import { generateCollectorConfig } from "./config-generator";

// Deploy a Collector for each team
for (const team of teams) {
  const namespace = new k8s.core.v1.Namespace(`ns-${team.name}`, {
    metadata: { name: team.namespace },
  });

  const configMap = new k8s.core.v1.ConfigMap(`config-${team.name}`, {
    metadata: {
      name: `otel-collector-${team.name}`,
      namespace: team.namespace,
    },
    data: {
      "config.json": generateCollectorConfig(team),
    },
  });

  const daemonSet = new k8s.apps.v1.DaemonSet(`collector-${team.name}`, {
    metadata: {
      name: `otel-collector-${team.name}`,
      namespace: team.namespace,
    },
    spec: {
      selector: {
        matchLabels: { app: `otel-collector-${team.name}` },
      },
      template: {
        metadata: {
          labels: { app: `otel-collector-${team.name}` },
        },
        spec: {
          containers: [{
            name: "otel-collector",
            image: "otel/opentelemetry-collector-contrib:0.96.0",
            args: ["--config", "/etc/otel/config.json"],
            ports: [
              { containerPort: 4317, name: "otlp-grpc" },
              { containerPort: 4318, name: "otlp-http" },
            ],
            resources: {
              limits: {
                cpu: team.resourceLimits.cpu,
                memory: team.resourceLimits.memory,
              },
            },
            volumeMounts: [{
              name: "config",
              mountPath: "/etc/otel",
            }],
          }],
          volumes: [{
            name: "config",
            configMap: { name: configMap.metadata.name },
          }],
        },
      },
    },
  });

  // Export the service endpoint for each team
  pulumi.log.info(
    `Deployed Collector for team ${team.name} ` +
    `with ${team.samplingRate * 100}% sampling`
  );
}
```

## Deploying

```bash
# Preview what will be created
pulumi preview

# Deploy the fleet
pulumi up

# See the state of all resources
pulumi stack
```

## Wrapping Up

Pulumi's programmatic approach makes managing fleets of OpenTelemetry Collectors practical. Instead of copy-pasting configuration blocks, you define team requirements in data structures and let your code generate the infrastructure. Adding a new team is as simple as adding an entry to the teams array.

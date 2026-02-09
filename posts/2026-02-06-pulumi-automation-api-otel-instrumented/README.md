# How to Use Pulumi Automation API with OpenTelemetry for Instrumented Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Pulumi, Automation API, Instrumented Provisioning

Description: Use the Pulumi Automation API with OpenTelemetry instrumentation to trace and monitor infrastructure provisioning operations.

The Pulumi Automation API lets you embed Pulumi operations inside your own programs. This opens the door to instrumenting every infrastructure operation with OpenTelemetry tracing. Instead of running `pulumi up` from the CLI and hoping for the best, you can wrap each operation in spans, track resource provisioning times, and correlate infrastructure changes with application behavior.

## What is the Automation API

The Automation API is a programmatic interface to Pulumi. Instead of using the CLI, you call Pulumi operations from code. This means you can add tracing, error handling, and custom logic around every provisioning step.

## Setting Up the Project

```bash
mkdir instrumented-infra && cd instrumented-infra
npm init -y
npm install @pulumi/pulumi @pulumi/aws @pulumi/automation \
  @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/resources
```

## Initializing OpenTelemetry

```typescript
// tracing.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const sdk = new NodeSDK({
  resource: new Resource({
    "service.name": "pulumi-automation",
    "service.version": "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
  }),
});

export function initTracing(): void {
  sdk.start();
}

export function shutdownTracing(): Promise<void> {
  return sdk.shutdown();
}

export function getTracer() {
  return trace.getTracer("pulumi-automation", "1.0.0");
}
```

## Instrumented Pulumi Program

```typescript
// index.ts
import * as automation from "@pulumi/automation";
import { initTracing, shutdownTracing, getTracer } from "./tracing";
import { SpanStatusCode } from "@opentelemetry/api";

// Initialize OpenTelemetry before anything else
initTracing();

const tracer = getTracer();

// Define the Pulumi program inline
const pulumiProgram = async () => {
  const aws = require("@pulumi/aws");
  const pulumi = require("@pulumi/pulumi");

  // Create a VPC
  const vpc = new aws.ec2.Vpc("app-vpc", {
    cidrBlock: "10.0.0.0/16",
    tags: { Name: "app-vpc", ManagedBy: "pulumi-automation" },
  });

  // Create subnets
  const subnet = new aws.ec2.Subnet("app-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-east-1a",
    tags: { Name: "app-subnet" },
  });

  return {
    vpcId: vpc.id,
    subnetId: subnet.id,
  };
};

async function deployInfrastructure() {
  // Create a root span for the entire deployment
  return tracer.startActiveSpan("pulumi.deploy", async (rootSpan) => {
    try {
      // Initialize the stack
      const stack = await tracer.startActiveSpan(
        "pulumi.stack.init",
        async (span) => {
          try {
            const s = await automation.LocalWorkspace.createOrSelectStack({
              stackName: "dev",
              projectName: "instrumented-infra",
              program: pulumiProgram,
            });
            span.setAttribute("pulumi.stack.name", "dev");
            span.setAttribute("pulumi.project.name", "instrumented-infra");
            return s;
          } catch (err) {
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.recordException(err as Error);
            throw err;
          } finally {
            span.end();
          }
        }
      );

      // Set configuration
      await tracer.startActiveSpan("pulumi.config.set", async (span) => {
        await stack.setConfig("aws:region", { value: "us-east-1" });
        span.setAttribute("pulumi.config.region", "us-east-1");
        span.end();
      });

      // Run pulumi preview (plan)
      const previewResult = await tracer.startActiveSpan(
        "pulumi.preview",
        async (span) => {
          try {
            const result = await stack.preview({
              onOutput: (msg: string) => {
                // Log each preview line as a span event
                if (msg.includes("create") || msg.includes("update")) {
                  span.addEvent("resource.change", {
                    "resource.message": msg.trim(),
                  });
                }
              },
            });
            span.setAttribute(
              "pulumi.preview.changes",
              result.changeSummary?.create || 0
            );
            return result;
          } finally {
            span.end();
          }
        }
      );

      // Run pulumi up (apply)
      const upResult = await tracer.startActiveSpan(
        "pulumi.up",
        async (span) => {
          try {
            const result = await stack.up({
              onOutput: (msg: string) => {
                span.addEvent("pulumi.output", {
                  message: msg.trim(),
                });
              },
            });

            // Record resource outputs
            span.setAttribute(
              "pulumi.resources.created",
              result.summary.resourceChanges?.create || 0
            );
            span.setAttribute(
              "pulumi.resources.updated",
              result.summary.resourceChanges?.update || 0
            );

            // Record outputs
            for (const [key, value] of Object.entries(result.outputs)) {
              span.setAttribute(`pulumi.output.${key}`, String(value.value));
            }

            return result;
          } catch (err) {
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.recordException(err as Error);
            throw err;
          } finally {
            span.end();
          }
        }
      );

      rootSpan.setAttribute("pulumi.result", "success");
      return upResult;
    } catch (err) {
      rootSpan.setStatus({ code: SpanStatusCode.ERROR });
      rootSpan.recordException(err as Error);
      throw err;
    } finally {
      rootSpan.end();
    }
  });
}

// Run the deployment
deployInfrastructure()
  .then((result) => {
    console.log("Deployment complete:", result.summary);
  })
  .catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await shutdownTracing();
  });
```

## What You See in Traces

After running this, your trace backend shows a trace with these spans:

- `pulumi.deploy` (root span, total duration)
  - `pulumi.stack.init` (stack setup time)
  - `pulumi.config.set` (configuration time)
  - `pulumi.preview` (plan duration, with events for each resource)
  - `pulumi.up` (apply duration, with resource counts and outputs)

## Wrapping Up

The Pulumi Automation API combined with OpenTelemetry gives you infrastructure provisioning that is as observable as your application code. Every deployment produces a trace you can use for performance analysis, debugging, and audit. This is especially valuable for platform teams that run provisioning as part of automated workflows.

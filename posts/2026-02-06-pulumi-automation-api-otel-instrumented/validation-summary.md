# Validation Summary: How to Use Pulumi Automation API with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi Automation API
- Pulumi AWS provider
- TypeScript
- Node.js
- OpenTelemetry JavaScript SDK
- OTLP gRPC trace exporter
- AWS VPC and subnet provisioning

## Sources Consulted
- Pulumi Automation API guide: https://www.pulumi.com/docs/iac/guides/building-extending/automation-api/
- Pulumi Node.js Automation API namespace reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/modules/automation.html
- Pulumi LocalWorkspace API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/automation.LocalWorkspace.html
- Pulumi Stack API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/classes/automation.Stack.html
- Pulumi PreviewResult API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/interfaces/automation.PreviewResult.html
- Pulumi UpResult API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/interfaces/automation.UpResult.html
- Pulumi UpdateSummary API reference: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/interfaces/automation.UpdateSummary.html
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- npm registry check for Pulumi packages: https://registry.npmjs.org/

## Issues Found
- The setup command installed `@pulumi/automation`, but that package does not exist in the npm registry. Removed it because the Node.js Automation API is exported from `@pulumi/pulumi/automation`.
- The TypeScript example imported `@pulumi/automation`, which would fail at runtime and compile time. Changed it to `@pulumi/pulumi/automation`, matching Pulumi's official TypeScript examples and API reference.
- The OpenTelemetry example imported and constructed `Resource` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript documentation uses `resourceFromAttributes`, and `Resource` is an interface in the current API reference. Updated the code to use `resourceFromAttributes`.
- The setup section omitted important runtime prerequisites. Added a short note that the Pulumi CLI must be available on `PATH`, and that Pulumi and AWS credentials must be configured.
- The deployment failure path called `process.exit(1)` before `shutdownTracing()` could reliably flush telemetry. Changed it to set `process.exitCode = 1` so the `finally` block can run.
- The `pulumi.config.set` and `pulumi.preview` spans did not record exceptions or error status. Added error handling consistent with the other spans.
- The code declared unused variables/imports (`previewResult`, a `pulumi` require, and `SpanStatusCode` in `tracing.ts`). Removed them to avoid TypeScript no-unused diagnostics.
- The post claimed the example tracks resource provisioning times and emits preview events for each resource. The code records operation-level timings and selected change events from preview output, so the wording was narrowed to match the implementation.

## Review Notes
The sample still assumes normal Pulumi provider plugin acquisition and a reachable OTLP gRPC collector at `http://localhost:4317`. Teams using locked-down CI environments may want to install the Pulumi CLI programmatically with `PulumiCommand.install()` and install provider plugins explicitly in the workspace.

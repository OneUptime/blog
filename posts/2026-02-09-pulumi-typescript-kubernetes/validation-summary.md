# Validation Summary: How to Build K8s Resources Using Pulumi with TypeScript for Type-Safe Infra

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi
- Kubernetes
- TypeScript
- Pulumi Kubernetes provider
- Pulumi configuration and secrets
- Pulumi unit testing mocks

## Sources Consulted
- Pulumi Kubernetes documentation: https://www.pulumi.com/docs/iac/clouds/kubernetes/
- Pulumi Kubernetes package API docs: https://www.pulumi.com/docs/reference/pkg/kubernetes/
- Pulumi ComponentResource documentation: https://www.pulumi.com/docs/concepts/resources/components/
- Pulumi Inputs and Outputs documentation: https://www.pulumi.com/docs/iac/concepts/inputs-outputs/
- Pulumi apply/output lifting documentation: https://www.pulumi.com/docs/iac/concepts/inputs-outputs/apply/
- Pulumi all/interpolate documentation: https://www.pulumi.com/docs/iac/concepts/inputs-outputs/outputs-and-strings/
- Pulumi configuration documentation: https://www.pulumi.com/docs/iac/concepts/config/
- Pulumi secrets documentation: https://www.pulumi.com/docs/iac/concepts/secrets/
- Pulumi unit testing documentation: https://www.pulumi.com/docs/iac/guides/testing/unit/
- npm package metadata for @pulumi/pulumi, @pulumi/kubernetes, and TypeScript.

## Issues Found
- `MicroserviceArgs.env` was typed as `{ [key: string]: string }`, but the later `workerService` example passes `apiService.serviceUrl`, a `pulumi.Output<string>`. Changed the type to `{ [key: string]: pulumi.Input<string> }` so plain strings and Pulumi outputs are both accepted.
- The advanced `createService` example used `const env: { [key: string]: string } = {};` and then assigned a `pulumi.interpolate` result to `env.DATABASE_URL`. Changed the map value type to `pulumi.Input<string>`.
- The `createConfigMap` helper was labeled as using `apply()` even though it passed the namespace output directly as a resource input, which is the recommended Pulumi pattern. Updated the comment and parameter type to `pulumi.Input<string>`.
- The string interpolation example referenced `dbService.service.metadata.name`, but no `dbService` variable was defined in the surrounding tutorial. Changed it to use the existing `apiService.service.metadata.name`.

## Review Notes
The package versions shown in the example are older than the latest npm releases available on 2026-06-03, but they remain within the current Pulumi v3 and Kubernetes provider v4 major versions and the APIs used in the tutorial are still valid.

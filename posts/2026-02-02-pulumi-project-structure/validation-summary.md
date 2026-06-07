# Validation Summary: How to Structure Pulumi Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi (TypeScript SDK)
- `@pulumi/pulumi`, `@pulumi/aws` providers
- AWS (VPC, EC2, RDS, Auto Scaling, EKS references)
- TypeScript / Node.js
- Jest (infrastructure unit testing with `pulumi.runtime.setMocks`)
- pnpm workspaces, Turborepo (monorepo tooling)
- GitHub Actions (`pulumi/actions`)
- YAML / JSON (Pulumi project + stack config, package.json)

## Sources Consulted
- Pulumi Config docs: https://www.pulumi.com/docs/iac/concepts/config/
- Pulumi Inputs & Outputs / Apply docs: https://www.pulumi.com/docs/iac/concepts/inputs-outputs/apply/
- Pulumi Component Resources docs: https://www.pulumi.com/docs/iac/concepts/components/
- Pulumi nodejs SDK source (`sdk/nodejs/config.ts`): https://github.com/pulumi/pulumi
- `aws.getAvailabilityZones` registry docs: https://www.pulumi.com/registry/packages/aws/api-docs/getavailabilityzones/
- `pulumi/actions` GitHub releases: https://github.com/pulumi/actions/releases
- `@pulumi/aws` on npm: https://www.npmjs.com/package/@pulumi/aws
- Pulumi StackReference docs: https://www.pulumi.com/docs/iac/concepts/stack/#stackreferences

## Issues Found

1. **Boolean default with `||` instead of `??`** (config/index.ts example).
   The original code used `config.getBoolean("enableMonitoring") || true`, which is a logic bug:
   when the user explicitly sets the value to `false`, the `||` falls through to `true`,
   so monitoring can never be disabled. Pulumi's `getBoolean()` returns `boolean | undefined`,
   so the correct pattern is the nullish-coalescing operator (`??`). Switched all the
   default-fallback assignments in that block to `??` for consistency and correctness.

2. **Resources created inside an `.apply()` callback in the `Vpc` component** (real Pulumi anti-pattern).
   The original code wrapped the subnet-creation loop in `pulumi.output(args.availabilityZoneCount).apply(azCount => { ... push to publicSubnets ... })`,
   then synchronously read `publicSubnets.map(s => s.id)` right after. Because `.apply()` runs
   asynchronously when the Output resolves, the `publicSubnets`/`privateSubnets` arrays would
   still be empty at the time of the synchronous read, producing empty Output arrays. Resources
   created inside `.apply` also don't appear in `pulumi preview` and break dependency tracking
   (documented anti-pattern). Fix: changed `availabilityZoneCount` from `pulumi.Input<number>`
   to a plain `number` in `VpcArgs`, and removed the `.apply()` wrapper so the loop runs
   synchronously at construction time. The test code already passes a plain number, so it
   remains compatible.

3. **Outdated `pulumi/actions` GitHub Action version**. The CI/CD example used
   `pulumi/actions@v5`. As of early 2026 the current stable major is `v7`. Updated all
   three job steps to `@v7`.

4. **Outdated `@pulumi/aws` dependency version**. The monorepo `package.json` example
   pinned `"@pulumi/aws": "^6.0.0"`. The current major is `7.x`. Bumped to `"^7.0.0"`.

## Review Notes

- The post uses `aws.getAvailabilityZones()` (Promise form) and feeds `azs.then(az => az.names[i])` into Subnet inputs. This works because Pulumi accepts Promises as Inputs, but in modern code `aws.getAvailabilityZonesOutput()` (Output form) is the more idiomatic choice. Not changed because the existing pattern is still valid.
- The `subnetIds: privateSubnetIds.apply(ids => ids as string[])` cast inside the database example is functionally fine. `networkingStack.requireOutput<string[]>("privateSubnetIds")` would be slightly cleaner but the current code is correct.
- The `Pulumi.dev.yaml` example uses the short `aws:region` config-key form, which is the current supported syntax.
- The `getDefaultCidr` helper in `StandardVpc` accepts `env: string` but the call site narrows to `"dev" | "staging" | "production"`; the `Record<string, string>` lookup could return `undefined` if a new environment is added later — minor typing improvement, not a bug today.
- The component type token `custom:network:Vpc` follows the `<package>:<module>:<type>` convention correctly.
- The Jest mock example using `pulumi.runtime.setMocks` matches Pulumi's documented testing pattern.

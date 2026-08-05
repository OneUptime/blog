# Scale Databricks Bundles with Monorepos and Shared Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Declarative Automation Bundles, Monorepo, CI/CD, Shared Libraries, Platform Engineering, DevOps

Description: Use a monorepo for discovery and reuse while keeping Databricks bundle deployment boundaries small and independently releasable.

---

"One bundle per service" and "one monorepo" are not opposing choices. A repository is a source-control and collaboration boundary. A Databricks bundle is a deployment and lifecycle boundary. A scalable default is:

```text
one repository
  -> many independently deployable bundles
  -> one bundle per service or data product
  -> shared configuration and library sources
```

This matches Databricks' current recommendation to keep source for many bundles in one repository with a shared folder. It avoids turning every service release into one giant production deployment while preserving atomic reviews, consistent templates, and local reuse.

## Choose the Bundle Boundary by Lifecycle

Put resources in the same bundle when they share all or most of these properties:

- one owning team and on-call rotation;
- one production release cadence;
- one rollback decision;
- one security and run-identity model;
- one target workspace and environment progression;
- tightly coupled jobs, pipelines, dashboards, and artifacts;
- one blast radius when a resource is removed or changed.

Split resources into separate bundles when they are independently deployable. A service that can ship, roll back, or change permissions without coordinating another service should not depend on the other service's bundle deployment state.

A useful test is: "If service A changes only a schedule, must CI plan and deploy service B's resources?" If no, they should normally be separate bundles even when they share a repository.

## Why One Giant Bundle Stops Scaling

A single bundle for an entire organization initially feels convenient because there is one `databricks.yml`. Over time it couples unrelated concerns:

- every validation loads the complete resource graph;
- a production deployment can touch many teams' resources;
- permissions and `run_as` choices become overly broad compromises;
- removing a resource from configuration can remove its deployed counterpart;
- deployment locks serialize unrelated releases;
- rollback ownership becomes unclear;
- selective production deployment becomes tempting.

The CLI supports `bundle deploy --select`, but Databricks recommends that option only for development workspaces. In production it can leave downstream resources and dependencies stale. Smaller bundles are the production-safe way to reduce deployment scope.

One bundle can still be right for a cohesive data product whose ingestion pipeline, transformations, quality job, and publishing workflow release together. "Small" means aligned lifecycle, not an arbitrary resource count.

## A Recommended Monorepo Layout

Keep each bundle self-contained and place intentional reuse in a top-level shared area:

```text
analytics-platform/
├── shared/
│   ├── bundle/
│   │   ├── variables.yml
│   │   └── permissions.yml
│   ├── python/
│   │   └── company_databricks/
│   └── tests/
├── services/
│   ├── orders/
│   │   ├── databricks.yml
│   │   ├── resources/
│   │   ├── src/
│   │   └── tests/
│   ├── customers/
│   │   ├── databricks.yml
│   │   ├── resources/
│   │   ├── src/
│   │   └── tests/
│   └── billing/
│       ├── databricks.yml
│       ├── resources/
│       ├── src/
│       └── tests/
├── templates/
└── .github/workflows/
```

Each service folder is a bundle root with exactly one `databricks.yml`. Additional YAML files are included from that root. A developer can validate, deploy, and run the orders bundle without interpreting billing's deployment state.

## Share Files With Explicit Bundle Configuration

Databricks bundles can include configuration and sync code from a sibling directory:

```yaml
bundle:
  name: orders

include:
  - resources/*.yml
  - ../../shared/bundle/*.yml

sync:
  paths:
    - ./src
    - ../../shared/python
```

Relative paths are resolved as part of the bundle's sync root. Validate the actual deployed paths rather than assuming the current working directory at runtime.

Run validation from every affected bundle:

```bash
cd services/orders
databricks bundle validate -t dev
```

Shared YAML should contain genuinely universal definitions, such as variable declarations or common permissions. Do not hide service ownership, resource names, destructive lifecycle settings, or production identities in a large inherited file that few teams understand.

Bundle custom variables are deployment-time values. They are resolved when the bundle is deployed; passing another value while running an already deployed job does not rewrite that job definition. Use job parameters for per-run inputs.

## Choose a Shared Library Model Deliberately

There are two useful reuse patterns.

### Source Sharing for Atomic Changes

Sync a shared Python module into each dependent bundle when all consumers should move with the same repository commit. This gives fast local iteration and one atomic pull request.

The tradeoff is fan-out: a shared source change means every dependent bundle must be tested and redeployed. If CI deploys only the folder directly edited, production bundles continue running different copies of code that appears shared in Git.

Make the dependency explicit in CI and in service ownership metadata.

### Versioned Packages for Independent Adoption

Build the shared library as a wheel, publish it to an approved package repository or Unity Catalog volume, and pin a version in each bundle:

```yaml
libraries:
  - whl: /Volumes/platform/artifacts/python/company_databricks-2.4.1-py3-none-any.whl
```

Versioned packages let each service adopt and roll back independently. They add release management, compatibility testing, artifact permissions, and library allowlisting where standard compute requires it.

Avoid mutable names such as `company_databricks-latest.whl`. A bundle configuration should identify an immutable artifact so the same Git revision deploys the same code later.

As a rule:

- use shared source for tightly coordinated code in a modest monorepo;
- use versioned packages when consumers need independent upgrade schedules or when the library has many repositories and runtimes.

## Give Every Bundle a Stable, Unique Identity

Bundle deployment state is anchored by `workspace.root_path`. Its default includes the deployer's home, bundle name, and target. If bundles resolve to the same identity, their deployments can interfere. If production deployers change and the default path changes, a release can create a second state lineage instead of updating the intended one.

For every production bundle:

- use a unique `bundle.name`;
- use explicit target names;
- use one stable deployment service principal;
- set or verify a stable, unique `workspace.root_path` according to workspace policy;
- run `bundle validate --output json` and review the resolved identity.

A conceptual convention is:

```yaml
bundle:
  name: orders

targets:
  prod:
    mode: production
    workspace:
      root_path: /Workspace/Shared/.bundle/${bundle.name}/${bundle.target}
```

The exact parent path and permissions depend on workspace policy. The non-negotiable property is that no other bundle or environment claims it.

Resource display names can also include service and target context to prevent operators from choosing the wrong job:

```yaml
resources:
  jobs:
    daily_orders:
      name: ${bundle.target}-orders-daily
```

Names help people; deployment state uses resource IDs and bundle identity. Do not try to correlate or take over existing resources by matching names alone. Use supported generation and binding workflows when adopting an existing job or pipeline.

## Build a Dependency-Aware CI Matrix

Path-filtered CI should map repository changes to bundles:

```text
services/orders/**       -> orders bundle
services/customers/**    -> customers bundle
shared/python/**         -> every bundle importing shared Python
shared/bundle/**         -> every bundle including shared YAML
templates/**             -> template tests, not automatic mutation of existing bundles
```

For each selected bundle, run in isolation:

1. unit and package tests;
2. `databricks bundle validate` for every relevant target;
3. a resolved configuration or plan review;
4. deployment to an isolated development target;
5. integration or smoke tests;
6. independent production approval and deployment.

Keep the matrix mapping in code, not tribal knowledge. A shared change that affects ten bundles should produce ten validation results and clearly show which production deployments remain pending.

Do not run all production deployments in parallel when they mutate a shared schema or resource even if bundle states are independent. Bundle boundaries do not replace domain-level coordination for shared data contracts.

## Standardize With Templates, Not Copy-Paste

Custom bundle templates can establish:

- folder layout and naming conventions;
- development and production targets;
- test and build commands;
- stable root-path rules;
- permissions and service-principal placeholders;
- CI metadata and ownership files;
- library packaging conventions.

Templates affect newly initialized projects. Updating a template does not automatically update all existing bundles. Treat template evolution like an API: version it, test generated projects, and provide an explicit upgrade process.

Use shared included YAML for settings that truly must update existing consumers together. Use templates for defaults that teams own after creation.

## Separate Configuration Reuse From Runtime Coupling

Some values look shared but should remain references to platform-owned objects:

- SQL warehouse IDs;
- cluster policies;
- instance pools;
- Unity Catalog catalogs, schemas, and volumes;
- notification destinations;
- service principals.

Use bundle variables and supported lookups rather than duplicating raw IDs across every service. A lookup fails when no object or more than one object matches, which is safer than silently selecting an ambiguous resource.

Do not let one application bundle create a shared warehouse and have other bundles assume its deployment path or state file. Put shared infrastructure under a clearly owned platform bundle or provision it separately, then reference its stable identifier.

Similarly, a run-job task that calls another service's job creates runtime coupling regardless of repository layout. Document ownership, availability, permissions, and release compatibility for that dependency.

## When Separate Repositories Are Better

A monorepo is a strong default, not a mandate. Separate repositories can be preferable when services have:

- different regulatory or source-access boundaries;
- unrelated owning organizations and review policies;
- incompatible build systems or release tooling;
- very different change volume that makes shared CI expensive;
- independent open-source or vendor distribution needs.

Keep the same principle in either layout: one bundle per independently governed deployment lifecycle. Publish shared libraries as versioned artifacts and distribute bundle conventions through versioned templates when source cannot be shared directly.

## A Decision Checklist

Before grouping resources, answer:

1. Are they always deployed and rolled back together?
2. Do they use the same run identity and permissions?
3. Does one team own production incidents for all of them?
4. Can one resource be deleted without coordinating the others?
5. Do they share code by atomic source update or versioned package?
6. Can CI identify every bundle affected by a shared change?
7. Is each bundle name and root path stable and unique?
8. Are shared infrastructure and data-contract dependencies separately owned?

If the first three answers are no, split the bundle. That does not require splitting the repository.

## Official Documentation

- [Sharing bundles and bundle files](https://docs.databricks.com/aws/en/dev-tools/bundles/sharing)
- [Develop Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/work-tasks)
- [`bundle` command group](https://docs.databricks.com/aws/en/dev-tools/cli/bundle-commands)
- [Bundle substitutions and variables](https://docs.databricks.com/aws/en/dev-tools/bundles/variables)
- [Declarative Automation Bundles project templates](https://docs.databricks.com/aws/en/dev-tools/bundles/templates)
- [Specify a bundle workflow run identity](https://docs.databricks.com/aws/en/dev-tools/bundles/run-as)
- [Install libraries on Databricks](https://docs.databricks.com/aws/en/libraries/)

## Conclusion

Use repository boundaries for collaboration and bundle boundaries for deployment lifecycle. A monorepo with one bundle per independently releasable service or data product gives both reuse and isolation. Share source only with dependency-aware CI, publish versioned libraries when adoption must be independent, and keep every production bundle's identity, permissions, and root path stable and unique.

# Validation Summary: How to Set Up Azure Pipelines Caching to Reduce Build Times

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines
- Azure Pipelines Cache@2 task
- npm
- NuGet
- .NET CLI
- YAML pipeline configuration

## Sources Consulted
- Microsoft Learn: Pipeline caching in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops
- Microsoft Learn: Cache NuGet packages in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/caching-nuget?view=azure-devops
- Microsoft Learn: NuGet PackageReference lock files - https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files
- Microsoft Learn: dotnet restore command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-restore
- npm Docs: npm ci - https://docs.npmjs.com/cli/v11/commands/npm-ci
- npm Docs: npm cache - https://docs.npmjs.com/cli/v7/commands/npm-cache/

## Issues Found
- The post implied that restored dependencies automatically make restore steps skip. I clarified that skipping requires an explicit cache-hit condition.
- The npm section recommended caching `node_modules` directly as the preferred approach. I changed the guidance to match Azure Pipelines documentation, which recommends caching npm's shared cache directory, especially when using `npm ci`.
- The `node_modules` cache example referenced `CacheRestored-node_modules`, but `Cache@2` only sets a cache-hit variable when `cacheHitVar` is configured. I added `cacheHitVar: NODE_MODULES_RESTORED` and updated the condition to use that variable.
- The NuGet section described the cache key as typically based on solution or project files. I corrected it to use committed `packages.lock.json` files for PackageReference lock-file restores.
- The NuGet cache key examples omitted the documented `bin` and `obj` exclusions and the broader `nuget` fallback restore key. I updated both NuGet examples.
- The post stated that each Azure Pipelines cache entry is limited to 2 GB. Current Microsoft documentation says there is no enforced size limit for individual caches or total cache size, so I replaced that with a large-cache performance caveat.
- The parallel jobs note implied that each job manages a completely independent cache. I clarified that jobs have separate workspaces but can read the same remote cache when the key and scope match.

## Review Notes
The remaining timing estimates are experience-based and project-dependent, but they are presented as typical examples rather than guaranteed performance. The examples assume lock files exist before the cache task runs, which is consistent with Azure Pipelines cache-key requirements.

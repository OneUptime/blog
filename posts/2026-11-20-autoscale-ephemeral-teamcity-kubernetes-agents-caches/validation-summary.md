# Validation summary

## Documentation review

Checked TeamCity 2026.2 regular cloud-agent and Kubernetes documentation, Build Cache documentation and 2026.2.2 DSL, npm v11 commands and Kubernetes volume access modes. The article separates persistent artifacts from disposable caches and describes a staging acceptance exercise rather than reporting a deployment.

- https://www.jetbrains.com/help/teamcity/teamcity-integration-with-cloud-solutions.html
- https://www.jetbrains.com/help/teamcity/setting-up-teamcity-for-kubernetes.html
- https://docs.npmjs.com/cli/v11/commands/npm-ci/
- https://docs.npmjs.com/cli/v11/commands/npm-cache/
- https://teamcity.jetbrains.com/app/dsl-documentation/buildFeatures/build-cache-feature/index.html
- https://www.jetbrains.com/help/teamcity/build-cache.html
- https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes

## Checks performed

- Shell example passed sh -n and bash -n syntax review.
- Actual npm 11.10.0 fixture ran the shell step twice with a dependency-free locked package and passing test script; verified stale node_modules removal and local cache creation. Inconsistent manifest/lockfile failed with offline npm ci.
- Kotlin documented properties and balanced braces checked; Mermaid seven edges structurally checked.
- Social image generated with repository script and visually reviewed: readable title, no clipping.

## Limitations

- No TeamCity server, Kubernetes cluster, agent lifecycle, licenses, package cache upload/download, concurrent publication, PVC attachment or retention exercised.
- The npm fixture had no dependencies and does not demonstrate dependency download cache hits or timing improvements.
- Kotlin fragment not compiled; Mermaid not rendered. Image digest and toolchain selection remain deployment-specific.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

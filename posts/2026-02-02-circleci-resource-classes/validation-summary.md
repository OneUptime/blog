# Validation Summary: How to Implement CircleCI Resource Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (CI/CD platform, config version 2.1)
- CircleCI resource classes (Docker, machine, self-hosted runner executors)
- CircleCI orbs (circleci/path-filtering@1.0.0)
- CircleCI CLI (`circleci tests glob`, `circleci tests split`)
- CircleCI convenience images (cimg/node, cimg/postgres, cimg/redis, cimg/base)
- Docker / Docker BuildKit
- Node.js / npm (npm ci, npm audit)
- YAML configuration

## Sources Consulted
- CircleCI Resource Class documentation: https://circleci.com/docs/configuration-reference/#resourceclass
- CircleCI Executors and Images: https://circleci.com/docs/executor-intro/
- CircleCI Configuration Reference (version 2.1): https://circleci.com/docs/configuration-reference/
- CircleCI Pipeline Parameters / Conditional Workflows: https://circleci.com/docs/pipeline-variables/
- CircleCI Caching documentation: https://circleci.com/docs/caching/
- CircleCI Test Splitting / Parallelism: https://circleci.com/docs/parallelism-faster-jobs/
- CircleCI Self-Hosted Runners documentation: https://circleci.com/docs/runner-overview/
- path-filtering orb registry: https://circleci.com/developer/orbs/orb/circleci/path-filtering
- CircleCI convenience images: https://circleci.com/developer/images

## Issues Found
No technical issues found.

The resource class CPU/RAM specifications for Docker executors (small through 2xlarge+) all match CircleCI's official documentation. YAML configuration syntax is valid for CircleCI 2.1, including executors, commands, workflows, pipeline parameters, conditional `when:`/`equal:` clauses, and cache key templates. CLI commands (`circleci tests glob`, `circleci tests split --split-by=timings`) are correct. The `machine: true` form is valid for self-hosted runners, and the `myorg/<class-name>` namespacing for self-hosted runner resource classes is the correct format. Convenience image references (cimg/node:18.17, cimg/node:18.17-browsers, cimg/postgres:14.0, cimg/redis:7.0, cimg/base:current) are all valid published tags. Machine image alias `ubuntu-2204:current` is a valid CircleCI rolling machine image alias.

## Review Notes
- The path-filtering orb example (Strategy 3) shows valid `mapping` syntax (`path-regex parameter-name parameter-value`), but in practice the orb works by setting pipeline parameters that a *continuation* config consumes — the example uses job names (`docs-build`, `full-build`) as parameter names which would mislead readers who don't realize they need a separate continuation config. The example is conceptually directional rather than copy-pasteable. Not strictly wrong as syntax, so left unchanged.
- The self-hosted runner config example (`/etc/circleci-runner/config.yaml`) is illustrative; real install locations and the exact set of fields vary by runner version (launch-agent vs. machine runner v3). The `resource_class` value in the runner config is typically implicit from the auth token (each resource class has its own token), but the field has appeared in some runner configurations. Treated as illustrative and left as-is.
- The `cat /proc/cpuinfo | grep "model name" | head -1` pattern works but is a "useless use of cat"; non-blocking.
- Node 18 is in maintenance LTS in 2026; readers may want to update `cimg/node:18.17` to a more current LTS, but the version itself is valid and the post does not claim it is the latest.
- The Strategy 1 example mixes `pipeline.parameters.resource-tier` (a pipeline parameter declared at the top) with a job parameter `resource-tier:` passed via workflow — this works because `pipeline.parameters.*` is resolved against the pipeline parameter of the same name (the job-level parameter passed in the workflow is unused in this snippet). Valid but slightly redundant; left as written.

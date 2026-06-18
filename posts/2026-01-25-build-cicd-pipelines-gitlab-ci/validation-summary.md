# Validation Summary: How to Build CI/CD Pipelines with GitLab CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- GitLab CI YAML configuration
- GitLab Runner
- Node.js
- npm
- AWS CLI
- Mermaid

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab CI/CD pipelines documentation: https://docs.gitlab.com/ci/pipelines/
- GitLab CI/CD jobs documentation: https://docs.gitlab.com/ci/jobs/
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- GitLab CI/CD caching examples for Node.js: https://docs.gitlab.com/ci/caching/examples/
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- GitLab environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab resource groups documentation: https://docs.gitlab.com/ci/resource_groups/
- npm ci command documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- AWS CLI configuration documentation: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS CLI configuration variables documentation: https://docs.aws.amazon.com/cli/latest/topic/config-vars.html

## Issues Found
- The Node.js cache examples cached `node_modules/` while also running `npm ci`. Because `npm ci` removes an existing `node_modules` directory before installing, this is not the recommended GitLab pattern. Updated the examples to cache `.npm/` and run `npm ci --cache .npm --prefer-offline`, matching GitLab's official Node.js caching example.
- The parallel jobs example said the build job waits for all test jobs, but `needs` listed only `test-unit` and `test-integration`. Since `needs` creates explicit DAG dependencies, `build-app` could start before `test-e2e` completed. Added `test-e2e` to the `needs` list.
- The secrets example claimed `GIT_STRATEGY: none` masks sensitive output. `GIT_STRATEGY` controls repository checkout behavior and does not mask logs. Removed that inaccurate block and changed the AWS example to rely on AWS environment variables without echoing secrets or writing credentials into the job filesystem.

## Review Notes
The post still uses `only`, which is valid GitLab CI syntax but GitLab generally recommends `rules` for more flexible pipeline control in newer configurations. No change was made because the existing examples remain technically valid.

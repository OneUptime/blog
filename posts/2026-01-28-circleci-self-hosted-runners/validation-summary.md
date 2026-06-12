# Validation Summary: How to Configure CircleCI Self-Hosted Runners

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI
- CircleCI Self-Hosted Runners
- CircleCI configuration (config.yml)
- CI/CD pipelines

## Sources Consulted
- CircleCI official documentation: Self-hosted runner overview (https://circleci.com/docs/runner-overview/)
- CircleCI documentation: Configuration reference (https://circleci.com/docs/configuration-reference/)
- CircleCI documentation: Installing self-hosted runners (https://circleci.com/docs/runner-installation/)
- CircleCI documentation: Using self-hosted runners in a job (https://circleci.com/docs/runner-config-reference/)

## Issues Found
- **YAML config used incorrect structure for self-hosted runners.** The original example placed `resource_class` nested under the `machine` key. In CircleCI's official configuration syntax for self-hosted runners, `machine` must be set to `true` (boolean), and `resource_class` is a sibling field at the job level, not a child of `machine`. Updated the YAML to use `machine: true` with `resource_class` at the job level, matching CircleCI's documented runner job syntax.

## Review Notes
- The post is intentionally high-level and does not include concrete CLI install commands. That is acceptable for a setup-flow overview, but readers will need to consult the CircleCI runner installation docs for platform-specific install/launch-agent steps (which vary by OS and CircleCI plan tier).
- The post references a "token" for registering the runner; in CircleCI, this is the runner resource-class token created via the `circleci runner resource-class create` CLI command. The post does not name the CLI explicitly, which is fine for a conceptual overview.
- The namespace prefix in `resource_class: my-org/my-runner` is correct — CircleCI requires the `<namespace>/<resource-class>` format. The namespace must be created and reserved before resource classes can be added to it.

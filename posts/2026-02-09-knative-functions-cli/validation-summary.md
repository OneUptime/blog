# Validation Summary: How to Set Up Knative Functions CLI for Building and Deploying Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Knative Functions
- Knative Serving
- Kubernetes
- CloudEvents
- Cloud Native Buildpacks
- Node.js
- Python
- PostgreSQL / psycopg2

## Sources Consulted
- Knative Functions overview: https://knative.dev/docs/functions/
- Knative Functions installation docs: https://knative.dev/docs/functions/install-func/
- Knative create function docs: https://knative.dev/docs/getting-started/create-a-function/
- Knative build/run/deploy function docs: https://knative.dev/docs/getting-started/build-run-deploy-func/
- Knative invoking functions docs: https://knative.dev/docs/functions/invoking-functions/
- Knative func generated command reference: https://github.com/knative/func/tree/main/docs/reference
- Knative func.yaml reference: https://github.com/knative/func/blob/main/docs/reference/func_yaml.md
- Knative func.yaml JSON schema: https://github.com/knative/func/blob/main/schema/func_yaml-schema.json
- Knative Node.js function template guide: https://github.com/knative/func/blob/main/docs/function-templates/nodejs.md
- Knative Python function template guide: https://github.com/knative/func/blob/main/docs/function-templates/python.md
- Knative Node.js and Python generated templates: https://github.com/knative/func/tree/main/templates

## Issues Found
- Updated the Homebrew tap from `knative-sandbox/kn-plugins` to the current documented `knative-extensions/kn-plugins`.
- Replaced the nonexistent `func config registries add --default-registry` example with supported registry configuration through `func deploy --registry` and `FUNC_REGISTRY`.
- Corrected the supported template/runtime wording to match current Knative language templates: Node.js, Python, Go, Quarkus, Spring Boot, TypeScript, and Rust.
- Updated the generated Node.js file list and handler example to match the current Node.js HTTP template.
- Fixed Node.js handler signatures so request body handling works with current templates, and removed the latest `uuid` package CommonJS incompatibility by using Node's built-in `crypto.randomUUID()`.
- Corrected the `func.yaml` examples to use valid current fields: `created`, `run.envs`, `deploy.options.resources`, map-style annotations, `{{ secret:name:key }}` secret references, and `invoke: cloudevent`.
- Added `--template cloudevents` to the Python CloudEvents function creation command.
- Replaced outdated Python `parliament.Context` examples with the current Knative Python ASGI-style `new()` / `Function.handle()` interface.
- Replaced `func logs --follow` with `func logs`, which streams logs by default in the current command reference.

## Review Notes
The post is technically valid after corrections. Examples still assume an accessible Kubernetes cluster with Knative Serving, a local container engine unless remote build is used, and valid registry credentials.

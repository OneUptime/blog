# Validation Summary: How to Deploy Your First Application with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio CLI
- Kubernetes
- Node.js
- Paketo Buildpacks
- HTTP

## Sources Consulted
- Epinio `push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio `app logs` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio `app update` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio `target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio `namespace create` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_create
- Epinio `namespace show` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_show
- Epinio `namespace delete` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_delete
- Epinio push process explanation: https://docs.epinio.io/explanations/detailed-push-process
- Epinio supported applications reference: https://docs.epinio.io/references/supported_applications
- Epinio custom routes guide: https://docs.epinio.io/1.5.1/howtos/custom_routes
- Paketo Node.js buildpack reference: https://paketo.io/docs/reference/nodejs-reference/
- Node.js HTTP module docs: https://nodejs.org/api/http.html
- Node.js OS module docs: https://nodejs.org/api/os.html

## Issues Found
- The Step 4 "Expected output" block used field names and formatting that do not match the current documented `epinio app show` output. I replaced it with a version-agnostic instruction to inspect the status, route, and desired instance count.
- The Step 5 command `epinio app show my-first-app | grep Routes` was not reliable against current documented output. I changed it to tell readers to inspect the route shown by `epinio app show` directly before using `curl`.
- The custom route example omitted the documented DNS prerequisite. I added a note that the custom domain must resolve to the cluster ingress IP.
- The logs section claimed `epinio app logs my-first-app` returns the last 100 lines, but the current CLI reference does not document that behavior. I changed the description to "Show application logs."
- The namespace cleanup step did not mention the confirmation prompt. I added a note that readers should confirm the prompt or use `--force`.

## Review Notes
Epinio's current command reference is published under version 1.13.10, while some tutorial pages still show older or inconsistent command forms. The command reference pages were treated as authoritative for CLI syntax. The Node.js sample code is also syntactically valid; I verified the first server example locally with `node --check`.

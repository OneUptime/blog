# Validation Summary: How to Configure Hot Reloading for Applications on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Skaffold
- Tilt
- Telepresence
- Node.js
- nodemon
- Python
- FastAPI
- Uvicorn
- Go

## Sources Consulted
- Skaffold File Sync: https://skaffold.dev/docs/filesync/
- Skaffold Pipeline / config schema: https://skaffold.dev/docs/design/config/
- Tilt Live Update Reference: https://docs.tilt.dev/live_update_reference.html
- Tilt Go example: https://docs.tilt.dev/example_go.html
- Telepresence CLI reference: https://telepresence.io/docs/reference/cli/telepresence
- Telepresence connect: https://telepresence.io/docs/reference/cli/telepresence_connect
- Telepresence intercept: https://telepresence.io/docs/reference/cli/telepresence_intercept
- Uvicorn settings: https://uvicorn.dev/settings/
- nodemon: https://nodemon.io/

## Issues Found
- The post referred to Skaffold's feature as `live_update`, but Skaffold documents this workflow as `sync`/File Sync. I updated the terminology and added the required `apiVersion` and `kind` fields to the Skaffold YAML snippets so the examples match current config requirements.
- The introduction described hot reloading as happening without restarting the process. In these examples, code changes are typically picked up by a watcher that reloads or restarts the process, so I corrected that explanation.
- The Tilt Go example used a `run()` command with a relative build path, but Tilt documents that `run()` commands execute from `/`. I replaced the example with the documented `restart_process` extension pattern and a valid in-container build command.
- The Telepresence section described Telepresence as file sync. Telepresence intercepts service traffic and lets the service run locally; it does not sync files into the cluster. I corrected the section heading, explanation, and conclusion.

## Review Notes
- `uvicorn --reload` is correct for development. Without `watchfiles`, Uvicorn reloads on `*.py` changes only, which matches the Python sync example in the post.
- Skaffold's current documented config API version was `skaffold/v4beta13` in the documentation reviewed on April 30, 2026, so the snippets may need a schema update in the future.
- Skaffold file sync requires `tar` to be available in the container.

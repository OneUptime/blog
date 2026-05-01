# Validation Summary: How to View Application Logs in Epinio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Epinio CLI
- Kubernetes
- Node.js
- Paketo Buildpacks
- Shell scripting
- HTTP / curl

## Sources Consulted
- Epinio Introduction — https://docs.epinio.io/
- Epinio Quickstart — https://docs.epinio.io/tutorials/quickstart
- Epinio Supported Applications — https://docs.epinio.io/references/supported_applications
- Epinio Port Forwarding How-to (used to verify current `epinio app show` output format, including `Active Routes`) — https://docs.epinio.io/howtos/other/port_forwarding
- Epinio Single Developer Journey — https://docs.epinio.io/1.8.0/tutorials/single-dev-workflow
- Epinio `epinio push` command reference — https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `epinio app logs` command reference — https://docs.epinio.io/1.13.5/references/commands/cli/app/epinio_app_logs
- Epinio `epinio app update` command reference — https://docs.epinio.io/1.10.0/references/commands/cli/app/epinio_app_update
- Epinio `epinio target` command reference — https://docs.epinio.io/1.8.0/references/commands/cli/epinio_target
- Paketo Buildpacks, Node.js How-to — https://paketo.io/docs/howto/nodejs/
- Paketo Buildpacks, Node.js Reference — https://paketo.io/docs/reference/nodejs-reference/

## Issues Found

1. **The original shell/netcat sample was not a reliable Epinio buildpack example.** Epinio stages source with supported Paketo buildpacks, and the post’s `app.sh` example did not match a documented supported app layout. I replaced it with a minimal Node.js app definition using `package.json` and `server.js`, which aligns with Epinio’s supported buildpack workflow.

2. **The custom route example was misleading as written.** The original `--route my-app.epinio.example.com` example implied a ready-to-use hostname, but custom routes must resolve to the cluster ingress and are environment-specific. I removed the custom route from the explicit `epinio push` example and kept a valid `--instances` example.

3. **The route extraction command was incorrect for current Epinio output.** Current Epinio documentation shows `epinio app show` exposing routes under `Active Routes`, with the hostname on the following table row. The original `grep Routes | awk '{print $2}'` would not reliably return the host. I updated the commands to inspect `Active Routes`, extract the hostname correctly, and build an `https://` URL.

4. **The browser command was platform-specific without saying so.** `open` is a macOS command. I scoped it explicitly to macOS so the snippet is technically correct.

5. **The update description overstated the behavior.** “Epinio performs a rolling update” was broader than what I could verify from the official docs. I changed it to “restages and redeploys the application,” which matches the documented push/staging workflow.

6. **The conclusion overclaimed Epinio’s scope.** “Deploy any application to Kubernetes” was too broad. Epinio supports applications that match available buildpacks or pre-built image flows. I changed this to “supported applications.”

## Review Notes
- Official Epinio docs currently span multiple 1.13.x pages, and some tutorial pages still show older command aliases, but the grouped `epinio app ...` commands used in this post are supported by the command reference and current how-to material.
- The `APP_HOST` extraction snippet assumes a single active route and will capture the first listed hostname, which is acceptable for this tutorial.
- I verified the post against official documentation but did not execute a live Epinio cluster during this review.

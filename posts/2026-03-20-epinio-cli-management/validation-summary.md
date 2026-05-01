# Validation Summary: How to Use Epinio CLI for Application Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio CLI
- Kubernetes
- Cloud Native Buildpacks
- Paketo Buildpacks
- Node.js
- Shell commands

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio push process: https://docs.epinio.io/explanations/detailed-push-process
- Epinio `push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio `namespace create` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_create
- Epinio `namespace show` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_show
- Epinio `app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio `app list` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio `app logs` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio `app update` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio `app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Epinio `app env set` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio `app env list` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio port forwarding how-to (used to confirm current `epinio app show` route output): https://docs.epinio.io/howtos/other/port_forwarding
- Epinio custom routes guide: https://docs.epinio.io/1.5.1/howtos/custom_routes
- Paketo Node.js Buildpack reference: https://paketo.io/docs/reference/nodejs-reference/

## Issues Found
- The original shell and `nc` example was not a valid zero-config Epinio application example. Epinio stages source with Cloud Native Buildpacks/Paketo buildpacks, and the post claimed runtime auto-detection. I replaced that sample with a supported Node.js example using `package.json` and `server.js`.
- The explicit `--route my-app.epinio.example.com` example implied a custom route would work generically. Epinio custom routes require DNS pointing to the cluster ingress, so I removed the placeholder route from the main push example.
- The route lookup snippet was incorrect for current Epinio CLI output. `epinio app show` presents routes under an `Active Routes` section and shows the hostname on the following line, so `grep Routes | awk '{print $2}'` would not return a usable URL. I replaced it with an `awk` extraction that reads the first route from the documented table-style output and prefixes `https://`.
- The claim that a re-push "performs a rolling update" was stronger than the official docs support directly. I changed it to the accurate, documented behavior that Epinio rebuilds and redeploys the application.

## Review Notes
- Epinio documentation was current and active as of May 1, 2026, with the docs site showing version `1.13.10`.
- The browser-opening commands are platform-specific. The post now distinguishes Linux (`xdg-open`) and macOS (`open`).
- Depending on the certificate setup of a local Epinio installation, direct `curl` access to an app route may still require local CA trust or `-k`. The command is correct for normally trusted TLS setups.

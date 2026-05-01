# Validation Summary: How to Deploy a Static Website with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Epinio CLI
- Kubernetes
- Paketo Buildpacks
- Paketo NGINX Buildpack
- NGINX
- HTML
- CSS
- JavaScript

## Sources Consulted
- Epinio Quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `epinio target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio `epinio app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio `epinio app list` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio `epinio app logs` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio `epinio app update` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio `epinio app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Epinio `epinio app env list` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio `epinio app env set` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio `epinio app restage` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_restage
- Epinio port forwarding how-to (used to verify current `epinio app show` text output and the `Active Routes` field): https://docs.epinio.io/howtos/other/port_forwarding
- Epinio application manifest reference 1.8.1 (used to verify `--env NAME=VALUE` syntax on push): https://docs.epinio.io/1.8.1/references/manifests
- Paketo web servers how-to: https://paketo.io/docs/howto/web-servers/
- Paketo NGINX buildpack reference: https://paketo.io/docs/reference/nginx-reference/

## Issues Found
- The article title and description promised a static HTML/CSS/JS deployment with automatic NGINX configuration, but the body used a Bash `nc` loop and an unrelated Node.js server example. I replaced those with actual static site files in `public/` so the tutorial now matches the documented Paketo NGINX buildpack workflow.
- The deployment commands omitted the documented buildpack setting needed for auto-generated NGINX configuration. I updated the `epinio push` examples to include `--env BP_WEB_SERVER=nginx`.
- The namespace verification step used `epinio namespace show my-apps` to prove the namespace was active. I changed that to `epinio target`, which is the documented way to confirm the currently targeted namespace.
- The route lookup commands used `grep Routes` and `awk '{print $2}'`, which do not match current `epinio app show` output. I replaced them with a command that reads the current `Active Routes` output format so the application URL can actually be retrieved.
- The browser step used `open`, which is macOS-specific. I replaced it with `echo "${APP_URL}"` so the instructions remain platform-neutral.
- The update section claimed Epinio performs a rolling update. I could not verify that exact guarantee in current official docs, so I changed the wording to the narrower, supported behavior: rebuild and redeploy.
- The environment variable section used database and log variables that were unrelated to a static site and did not demonstrate the NGINX buildpack configuration described by the post. I replaced that example with `BP_WEB_SERVER_FORCE_HTTPS` and added `epinio app restage my-app`, because changing generated web-server configuration requires a restage.

## Review Notes
- Current Epinio command reference pages in version 1.13.10 were treated as the canonical source. Some older Epinio tutorial pages still show obsolete forms such as `epinio apps list` and `epinio delete`; this post now uses the current `epinio app list` and `epinio app delete` commands.
- The route extraction command in Step 6 depends on the current human-readable `epinio app show` output. If a future Epinio release changes that text layout, switching the example to structured output with `-o json` would be more robust.

# Validation Summary: How to Bind Services to Applications in Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio CLI
- Kubernetes
- Paketo Buildpacks
- Node.js
- HTTP
- Application deployment and scaling

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio single developer workflow: https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio services reference: https://docs.epinio.io/references/services
- Epinio DNS setup: https://docs.epinio.io/installation/dns_setup
- Epinio CLI `epinio push`: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio CLI `epinio target`: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio CLI `epinio namespace create`: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_create
- Epinio CLI `epinio namespace show`: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_show
- Epinio CLI `epinio app show`: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio CLI `epinio app list`: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio CLI `epinio app logs`: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio CLI `epinio app update`: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio CLI `epinio app env set`: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio CLI `epinio app env list`: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio CLI `epinio app delete`: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Paketo Buildpacks concepts: https://paketo.io/docs/concepts/buildpacks/
- Paketo Node.js Buildpack Reference: https://paketo.io/docs/reference/nodejs-reference/
- Paketo buildpack configuration and Procfiles: https://paketo.io/docs/howto/configuration/

## Issues Found
- The post title, tags, description, introduction, and conclusion claimed the article covered service bindings and database integration, but the body only covered application deployment. I corrected the framing and metadata so the post now accurately describes what it teaches.
- The original `app.sh` example was not a supported or documented Epinio application example for Paketo-based staging. Epinio documents supported applications through Paketo buildpacks, and Paketo's Node.js buildpack explicitly supports simple apps with a `server.js` entrypoint. I removed the unsupported shell example and kept the valid Node.js example.
- The route lookup commands used `grep Routes`, but official `epinio app show` output prints `Routes:` on one line and the actual URL on the next line. I changed the commands to use `awk` to read the following line so the example returns the route correctly.
- The test step used `open ${APP_URL}`, which is macOS-specific. I replaced it with `echo "$APP_URL"` so the instructions remain portable and still let readers open the URL in their browser.
- The explicit push example used `--route my-app.epinio.example.com` without any explanation of the required DNS and system-domain setup. Because Epinio routing depends on the installation's wildcard `global.domain`, I removed the hard-coded route from the example and used `--path .` with `--instances 2` instead.
- The logs example used `epinio app logs my-app --follow`; I reordered it to `epinio app logs --follow my-app` to match the official command examples.
- The update step claimed Epinio "performs a rolling update." The docs clearly describe restaging and redeployment but do not make that exact statement here, so I changed the wording to the documented behavior.

## Review Notes
- The `epinio` CLI was not installed in this environment, so command verification was documentation-based against the current official Epinio docs.
- The Node.js sample was syntax-checked locally with `node --check`.
- Service binding is a real Epinio feature via `epinio service bind` and bound data appears under `/configurations`. If the editorial intent is still to publish a service-binding guide, this post would need a separate rewrite rather than minor corrections.
- The directory slug still references `bind-services`, but the validated article content is now deployment-focused.

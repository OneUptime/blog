# Validation Summary: How to Set Up Epinio Git Push Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes
- Paketo Buildpacks
- Node.js
- HTTP

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- Epinio `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `epinio target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio `epinio app list` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio `epinio app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Epinio `epinio app logs` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio `epinio app env list` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio `epinio app env set` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio supported applications reference: https://docs.epinio.io/references/supported_applications
- Epinio push process reference: https://docs.epinio.io/explanations/detailed-push-process
- Epinio Git job / webhook how-to: https://docs.epinio.io/howtos/other/gitjob_push
- Paketo Node.js buildpack reference: https://paketo.io/docs/reference/nodejs-reference/
- Node.js HTTP API reference: https://nodejs.org/api/http.html

## Issues Found
- The original title, tags, description, and framing claimed Git-push-triggered deployments using webhooks and CI/CD pipelines, but the body only documented a manual `epinio push` workflow. I retitled and reframed the post to match what it actually teaches. Official Epinio docs show Git-triggered automation as a separate GitJob-based workflow.
- The shell-script `nc` example was not a reliable supported Epinio source app as written. I removed it and kept a minimal Node.js example that matches Epinio's buildpack-based supported application model and Paketo's documented `server.js` entrypoint behavior.
- The namespace verification step used `epinio namespace show my-apps`, which shows namespace details but does not verify the current target. I changed it to `epinio target`, which is the documented way to confirm the targeted namespace.
- The route lookup command `epinio app show my-app | grep Routes | awk '{print $2}'` was incorrect because Epinio displays route URLs on subsequent lines under the `Routes` section. I replaced it with an `awk` command that extracts the first URL from `epinio app show` output.
- The browser command `open ${APP_URL}` was OS-specific and not generally correct for a cross-platform tutorial. I changed it to a neutral instruction to open the URL in a browser.
- The log follow example used `epinio app logs my-app --follow`. I changed it to the documented form `epinio app logs --follow my-app`.
- The post stated that Epinio "performs a rolling update" on re-push. The official docs support that Epinio stages a new image and updates the deployment, but do not explicitly document that wording here, so I narrowed the claim.
- The conclusion claimed developers can deploy "any application" and that buildpack detection always applies universally. I corrected this to "supported applications" and "supported runtimes" to match Epinio's supported-applications documentation.
- The deployment walkthrough said Epinio configures "routing and TLS" during push. I narrowed this to routing because TLS behavior depends on the installation and cluster configuration.

## Review Notes
- As of 2026-05-01, the latest Epinio docs available on the official site were 1.13.10, and the corrected commands align with that command reference.
- Epinio does support Git-based source workflows and Git-triggered automation, but those are covered through `--git`, Git configuration, and the Rancher Fleet GitJob/webhook workflow rather than the manual `epinio push` steps shown in this post.

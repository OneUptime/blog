# Validation Summary: How to Scale Applications in Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes
- Paketo Buildpacks
- Cloud Native Buildpacks
- Node.js

## Sources Consulted
- Epinio CLI reference: `epinio push` https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio CLI reference: `epinio target` https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio CLI reference: `epinio app show` https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio CLI reference: `epinio app logs` https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio CLI reference: `epinio app update` https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio CLI reference: `epinio app env list` https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio CLI reference: `epinio app env set` https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio supported applications https://docs.epinio.io/references/supported_applications
- Epinio detailed push process https://docs.epinio.io/explanations/detailed-push-process
- Epinio custom routes https://docs.epinio.io/1.5.1/howtos/custom_routes
- Epinio certificate issuers https://docs.epinio.io/howtos/other/certificate_issuers
- Paketo Node.js Buildpack reference https://paketo.io/docs/reference/nodejs-reference/

## Issues Found
- The original shell-script example was not a reliable Epinio source-push example because the post claimed Epinio would auto-detect and run it via buildpacks. I replaced it with a minimal `server.js` app and added an optional `package.json` with an explicit start command, which matches Paketo Node.js buildpack behavior.
- The namespace verification step used `epinio namespace show my-apps`, which inspects a namespace but does not confirm the currently targeted namespace. I changed the verification command to `epinio target` and kept `epinio namespace show my-apps` as an inspection step.
- The route lookup commands used `grep Routes` and `awk '{print $2}'`, which do not match current `epinio app show` output. I updated the commands to read the route from the `Active Routes` section and build the URL correctly.
- The example custom route used `my-app.epinio.example.com` as if it were a literal working route. I changed it to `my-app.<your-system-domain>` to reflect Epinio's requirement that routes align with the configured system domain or a custom domain that resolves to the ingress.
- The update step claimed Epinio "performs a rolling update" without direct support from the consulted Epinio docs. I changed that wording to the technically accurate and documented behavior that Epinio deploys the updated application.
- The conclusion said Epinio can deploy "any application" to Kubernetes. I narrowed that to "supported applications" to match Epinio's documented buildpack-based support model.

## Review Notes
- Review aligned the post with the current Epinio command references available on May 1, 2026, including version 1.13.10 command pages.
- Current `epinio app show` also supports `-o json`, but the post was kept close to the author's original CLI-text workflow and only corrected where the existing commands were inaccurate.

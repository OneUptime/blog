# Validation Summary: How to Use Custom Buildpacks with Epinio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Epinio
- Cloud Native Buildpacks
- Paketo Buildpacks
- `pack` CLI
- Docker
- Kubernetes
- Node.js

## Sources Consulted
- Epinio docs, Creating a custom builder: https://docs.epinio.io/howtos/customization/custom_builder
- Epinio docs, `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio docs, `epinio target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio docs, `epinio app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio docs, `epinio app logs` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio docs, `epinio app update` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio docs, `epinio app env set` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- Epinio docs, `epinio app env list` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_list
- Epinio docs, `epinio app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Epinio docs, Quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio docs, Supported Applications: https://docs.epinio.io/references/supported_applications
- Epinio docs, The Epinio push process in detail: https://docs.epinio.io/explanations/detailed-push-process
- Epinio docs, Custom Routes: https://docs.epinio.io/1.5.1/howtos/custom_routes
- Epinio docs, Set up and use certificate issuers: https://docs.epinio.io/howtos/other/certificate_issuers
- Epinio CLI source, app show output formatting: https://github.com/epinio/epinio/blob/v1.13.10/internal/cli/usercmd/app.go
- Cloud Native Buildpacks, `pack builder create`: https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/cli/pack_builder_create/
- Paketo Buildpacks, How to Build Node.js Apps with Paketo Buildpacks: https://paketo.io/docs/howto/nodejs/
- Paketo Buildpacks, Builders reference: https://paketo.io/docs/reference/builders-reference/
- Paketo builder-jammy-full `builder.toml`: https://github.com/paketo-buildpacks/builder-jammy-full/blob/main/builder.toml
- Paketo builder-jammy-buildpackless-full `builder.toml`: https://raw.githubusercontent.com/paketo-buildpacks/builder-jammy-buildpackless-full/main/builder.toml

## Issues Found
- The original post did not actually show how to use custom buildpacks with Epinio. Epinio’s documented mechanism is to create a custom builder image and pass it with `epinio push --builder-image ...`, so I rewrote the core deployment flow around that supported workflow.
- The original shell-script-and-`nc` example was not a reliable Epinio source-push example. Epinio stages source code with Cloud Native Buildpacks, and the reviewed Paketo Node.js docs explicitly support a root-level `server.js` app, so I replaced the shell example with a minimal Node.js application.
- The original namespace verification step used `epinio namespace show my-apps`, which shows namespace details but does not report the currently targeted namespace. I changed that command to `epinio target`, which is the documented way to verify the active target.
- The original deploy step omitted the custom builder selection entirely and therefore did not match the post’s topic. I added a verified `builder.toml`, `pack builder create`, `docker push`, and `epinio push --builder-image ...` sequence.
- The original custom route example used `my-app.epinio.example.com` as if it were a real route. I changed it to `my-app.<your-system-domain>` to reflect Epinio’s documented routing model and the requirement that custom domains resolve to the ingress controller.
- The original route inspection and URL extraction commands relied on `grep Routes`, which is not a reliable way to obtain the application URL from current Epinio output. I changed the guidance to use `epinio app show my-app` and refer to the `Active Routes` section, which is also consistent with the current CLI source.
- The original `open ${APP_URL}` command was macOS-specific. I replaced it with browser-neutral guidance.
- The original test command assumed a straightforward `curl` against the route. I changed it to `curl -k` because current Epinio documentation shows that the default workload issuer is `epinio-ca`, so default installations often use a private CA for application routes.
- The original logs step did not account for build-time failures in a custom buildpack workflow. I added `epinio app logs my-app --staging`, which is the documented way to view staging logs.
- The original update step claimed Epinio “performs a rolling update,” which I did not find supported in the reviewed documentation. I changed that to the technically accurate statement that Epinio restages the application and updates the deployment.
- The original conclusion said Epinio can deploy “any application.” Current Epinio documentation scopes this to supported applications or applications supported by the buildpacks in the selected builder image, so I corrected that claim.

## Review Notes
- Verified against the latest Epinio documentation available on May 1, 2026, which is version 1.13.10.
- The example builder image pins current Paketo buildpack and stack versions from the upstream builder repositories. Those version pins are technically correct as of validation time but may need refresh in future reviews.
- The local `epinio` and `pack` CLIs were not installed in the workspace, so command verification relied on official Epinio, Paketo, Cloud Native Buildpacks documentation, and Epinio source code rather than local `--help` output.

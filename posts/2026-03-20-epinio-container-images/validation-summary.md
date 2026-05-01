# Validation Summary: How to Use Container Images with Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes
- Container images
- Docker-compatible container registries
- TLS

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- `epinio target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- `epinio namespace create` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_create
- `epinio namespace show` command reference: https://docs.epinio.io/references/commands/cli/namespace/epinio_namespace_show
- `epinio app list` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- `epinio app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- `epinio app logs` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- `epinio app env set` command reference: https://docs.epinio.io/references/commands/cli/app/env/epinio_app_env_set
- `epinio app update` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- `epinio app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio services reference example using `--container-image-url`: https://docs.epinio.io/references/services
- Epinio security: https://docs.epinio.io/explanations/security
- Epinio certificate issuers: https://docs.epinio.io/howtos/other/certificate_issuers

## Issues Found
- The post title and description said the guide was about deploying pre-built container images, but the body actually described pushing application source code through buildpacks. I updated the introduction, prerequisites, deployment steps, and conclusion to use Epinio's documented `--container-image-url` workflow instead.
- The original `app.sh` and `server.js` examples were not relevant to container-image deployment and contradicted the article's stated goal. I replaced them with a documented pre-built image example (`splatform/sample-app`) and an application name variable.
- The original explanation of the push process said Epinio uploads source code, detects the runtime, runs buildpacks, and builds a container image. That is the source-push flow, not the pre-built image flow. I corrected the description to reflect direct image deployment, routing, TLS, and instance management.
- The route extraction command used `grep Routes | awk '{print $2}'`, which does not match current `epinio app show` output where routes are listed separately under the `Routes` section. I replaced it with URL extraction that matches the documented output format.
- The original test command used plain `curl` even though Epinio serves applications over TLS by default and trial installs may use self-signed or internal issuers. I changed the example to `curl -k` so it works in the documented trial-style setups as well.
- The original browser command used `open`, which is macOS-specific and not generally portable. I replaced it with printing the resolved URL.
- The update step originally said to modify source code and run `epinio push --name my-app`, which is not the correct update flow for a pre-built image deployment. I changed it to redeploy an updated image tag with `--container-image-url`.
- I added a note to the custom route example clarifying that the hostname must resolve to the cluster ingress, which is required by Epinio's routing model.

## Review Notes
- Epinio's current command reference is at version 1.13.10 as of this review. Older documentation pages are still indexed and use older forms such as `epinio delete`, `epinio apps list`, or manifest terminology like `--container-image`; this post was normalized to the current CLI reference.
- The sample image command uses the public example `splatform/sample-app` shown in official Epinio documentation. Real deployments may require registry authentication or cluster access to a private registry, which is outside the scope of this post.

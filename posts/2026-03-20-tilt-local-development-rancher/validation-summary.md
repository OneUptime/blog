# Validation Summary: How to Set Up Tilt for Local Development with Rancher - Local Development

## Status
validated

## Post Type
Tutorial / Local development guide

## Technologies Covered
- Tilt
- Rancher
- Kubernetes
- Docker
- Helm
- Bitnami PostgreSQL Helm chart
- Node.js live update workflow

## Sources Consulted
- Tilt installation documentation: https://docs.tilt.dev/install.html
- Tilt Tiltfile API reference: https://docs.tilt.dev/api.html
- Tilt Live Update reference: https://docs.tilt.dev/live_update_reference.html
- Tilt CLI reference for `tilt up`: https://docs.tilt.dev/cli/tilt_up.html
- Tilt `helm_resource` extension documentation: https://github.com/tilt-dev/tilt-extensions/tree/master/helm_resource
- Rancher/SUSE Rancher Manager cluster access with kubectl and kubeconfig: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-admin/manage-clusters/access-clusters/use-kubectl-and-kubeconfig.html
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Bitnami PostgreSQL Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- Tilt v0.37.1 `tilt up --help`, downloaded from the official GitHub release: https://github.com/tilt-dev/tilt/releases/tag/v0.37.1

## Issues Found
- The macOS Homebrew install command used `brew install tilt-dev/tap/tilt`. Current Tilt and Homebrew documentation use `brew install tilt`, so the command was updated.
- The Tiltfile used `helm_resource()` without loading the Helm extension. Added `load('ext://helm_resource', 'helm_resource')`.
- The `helm_resource()` example used a `set` argument, which belongs to Tilt's built-in `helm()` template helper, not the `helm_resource` extension. Replaced it with `flags=['--set=...']`.
- The Live Update `run(..., trigger=['./package.json'])` step watched `package.json` as a trigger but did not sync it. Tilt requires trigger files to also match a `sync` step for Live Update to run, so `sync('./package.json', '/app/package.json')` was added.
- The remote Rancher section implied `allow_k8s_contexts()` selects the Kubernetes context. It only allow-lists contexts for Tilt; the context is selected with kubeconfig/current context or `tilt up --context`. Updated the wording and comments.
- The post used deprecated `tilt up --hud=false`. Current Tilt uses `tilt up --stream` to stream logs in the terminal, so the command was updated.
- The post said Tilt automatically triggers Node.js hot reload. Tilt syncs files, but the process must have its own watcher/hot-reload mechanism. Updated the explanation.
- The post said a full rebuild happens whenever `live_update` rules do not cover a changed file. Clarified that this applies to watched files in the Docker build context; files outside the watched context do not trigger the resource.

## Review Notes
The examples are illustrative and still require matching Kubernetes manifests, a reachable Rancher-managed Kubernetes context, registry credentials for remote clusters, and an application process configured for hot reload. I verified the current `tilt up` flags with Tilt v0.37.1 help output, but did not run the full Tilt workflow because the post uses placeholder manifests, image names, and cluster context values.

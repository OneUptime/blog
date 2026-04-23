# Validation Summary: How to Set Up Tilt for Local Development with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tilt
- Kubernetes
- Rancher
- Helm
- Docker
- kubectl
- Starlark / Tiltfile

## Sources Consulted
- Tilt installation docs: https://docs.tilt.dev/install.html
- Tilt API reference: https://docs.tilt.dev/api.html
- Tilt Live Update reference: https://docs.tilt.dev/live_update_reference.html
- Tilt resource endpoints docs: https://docs.tilt.dev/accessing_resource_endpoints.html
- Tilt CLI reference for `tilt up`: https://docs.tilt.dev/cli/tilt_up.html
- Tilt CLI reference for `tilt logs`: https://docs.tilt.dev/cli/tilt_logs.html
- Tilt CLI reference for `tilt down`: https://docs.tilt.dev/cli/tilt_down.html
- Tilt CLI reference for `tilt trigger`: https://docs.tilt.dev/cli/tilt_trigger.html
- Tilt CLI reference for `tilt docker`: https://docs.tilt.dev/cli/tilt_docker.html
- Tilt `helm_resource` extension docs: https://github.com/tilt-dev/tilt-extensions/tree/master/helm_resource
- Tilt `k8s_attach` extension source: https://github.com/tilt-dev/tilt-extensions/tree/master/k8s_attach
- Tilt `namespace` extension source: https://github.com/tilt-dev/tilt-extensions/tree/master/namespace
- Kubernetes `kubectl config current-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_current-context/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The prerequisites claimed Docker or Kaniko would work, but the post’s examples use `docker_build`, which requires Docker. I changed the prerequisite to match the published code.
- Step 2 used `helm_resource(...)` without loading the official Tilt extension first. I added `load('ext://helm_resource', 'helm_resource')` and kept the example aligned with the extension’s documented API.
- Step 2 used `run(..., trigger=['./frontend/package.json'])` without syncing `package.json`. Tilt documents that trigger files must also be included in a `sync` step, so I added a `sync('./frontend/package.json', '/app/package.json')`.
- Step 2 used `restart_process_trigger(...)`, which is not a current Tilt API. I removed that invalid call from the basic example.
- Step 2 configured port forwards and links through separate `k8s_resource('my-app', ...)` calls even though the `helm_resource` extension supports `port_forwards` and `links` directly. I moved those settings into the `helm_resource(...)` block.
- Step 3 loaded `helm_resource` and `helm_repo` even though neither was used. I replaced that unused load with the `k8s_attach` extension, which matches the later “watch but don’t manage” intent.
- Step 3 used `run(..., trigger=['./api/requirements.txt'])` without syncing `requirements.txt`. I added `sync('./api/requirements.txt', '/app/requirements.txt')` so the trigger can actually fire as documented.
- Step 3 referenced a nonexistent `database` dependency and a `kafka` dependency that was never declared. I corrected the dependency name to `postgresql` and attached `redis`, `postgresql`, and `kafka` explicitly with `k8s_attach(...)`.
- Step 6 used a hand-rolled `.env` parser plus shell-expanded `--from-literal` values. I replaced that with `kubectl create secret generic --from-env-file=.env.development --dry-run=client -o yaml`, which is the supported kubectl pattern for env files.
- The runtime and troubleshooting commands had several inaccuracies: `tilt log` is not the current command, `tilt get cluster` is not the right way to inspect kube context, `tilt docker-prune` does not test registry access, and the `tilt down` comment was broader than the CLI reference. I replaced those with current commands and corrected the descriptions.

## Review Notes
- The Step 4 SIGHUP example is technically valid only for containers whose PID 1 process reloads on `SIGHUP`. Tilt’s Live Update docs note that the `restart_process` extension is the preferred option for most restart-on-change workflows.
- `tilt` and `kubectl` were not installed in this workspace, so the review was completed against current official documentation rather than by executing the snippets locally.

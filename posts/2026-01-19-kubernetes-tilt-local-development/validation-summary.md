# Validation Summary: How to Set Up a Local Kubernetes Development Environment with Tilt

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- Tilt and Tiltfile Starlark APIs
- Tilt Live Update
- Docker and Dockerfile builds
- Helm
- Kustomize
- Node.js
- Python Flask
- Go with Air
- Local Kubernetes clusters: Kind, Minikube, Docker Desktop Kubernetes, k3d

## Sources Consulted
- Tilt Install documentation: https://docs.tilt.dev/install.html
- Tilt Tiltfile API Reference: https://docs.tilt.dev/api.html
- Tilt Live Update Reference: https://docs.tilt.dev/live_update_reference.html
- Tilt CLI Reference: https://docs.tilt.dev/cli/tilt.html
- Tilt `up` CLI Reference: https://docs.tilt.dev/cli/tilt_up.html
- Tilt `ci` CLI Reference: https://docs.tilt.dev/cli/tilt_ci.html
- Tilt `docker` CLI Reference: https://docs.tilt.dev/cli/tilt_docker.html
- Tilt `trigger` CLI Reference: https://docs.tilt.dev/cli/tilt_trigger.html
- Tilt Tiltfile Config documentation: https://docs.tilt.dev/tiltfile_config.html
- Tilt Extensions documentation: https://docs.tilt.dev/extensions.html
- Official Tilt Extensions repository: https://github.com/tilt-dev/tilt-extensions
- Tilt `helm_resource` extension README: https://github.com/tilt-dev/tilt-extensions/blob/master/helm_resource/README.md
- Tilt `secret` extension README: https://github.com/tilt-dev/tilt-extensions/blob/master/secret/README.md
- Tilt `cancel` extension README: https://github.com/tilt-dev/tilt-extensions/blob/master/cancel/README.md
- Air official repository: https://github.com/air-verse/air
- kind Quick Start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- minikube start documentation: https://minikube.sigs.k8s.io/docs/start/
- k3d documentation: https://k3d.io/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The macOS Homebrew install command used the old tap-style package name. Changed `brew install tilt-dev/tap/tilt` to the current documented `brew install tilt`.
- The basic Tiltfile loaded only `kubernetes/deployment.yaml` even though the project structure has separate deployment and service files. Changed it to `k8s_yaml('kubernetes/')` so both manifests are applied.
- The Go Air install command used the old `github.com/cosmtrek/air` module path. Updated it to the current official `github.com/air-verse/air` path.
- The service filter example declared `config.define_string_list('services', args=True)` while the commands used named `--services` flags. Changed the Tiltfile config to named-flag mode and adjusted the command syntax to match Tilt's documented config examples.
- The environment selector used `config.define_string('env', args=True)` despite being a named setting. Changed it to `config.define_string('env')`.
- The secrets example used non-existent Tilt functions `secret_from_env` and `secret_from_files`. Replaced them with the official `secret` extension functions `secret_from_dict` and `secret_yaml_tls`.
- The cancel extension example used `load('ext://cancel', 'cancel')`, but the official extension is included with `include('ext://cancel')`. Updated the example and clarified that it adds cancel buttons for local resources.
- `tilt up -d` was described as starting Tilt in the background, but `-d` is the global debug flag. Replaced it with `tilt up --stream` for a documented alternate run mode.
- `tilt status` is not a current documented Tilt CLI command. Replaced it with `tilt get uiresources`.
- `tilt docker-build myapp` is not a current documented Tilt CLI command. Replaced it with `tilt docker -- build -t myapp .`.

## Review Notes
The tutorial is broadly accurate after the fixes. Some examples are intentionally minimal and assume matching Dockerfiles, Kubernetes selectors, image names, and application-level reload tooling such as nodemon, Flask debug reload, or Air configuration.

# Validation Summary: How Do Files Persist Between Woodpecker Steps? Workspace, Volumes, and Artifacts Explained

## Status
validated

## Post Type
Technical guide / Explainer

## Technologies Covered
- Woodpecker CI 3.17.x workflows, steps, workspaces, services, dependencies, and environment variables
- Woodpecker Docker, Kubernetes, and Local agent backends
- Docker bind mounts and named volumes
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, and access modes
- Woodpecker S3 plugin 1.5.4 and S3-compatible artifact storage
- Go 1.26 and the official `golang` container image
- Node.js 24, npm, and the official `node` container image
- Alpine Linux 3.22 and BusyBox command-line utilities

## Sources Consulted
- Woodpecker workflow syntax — https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker workflows and cross-workflow file-sharing boundary — https://woodpecker-ci.org/docs/usage/workflows
- Woodpecker environment variables — https://woodpecker-ci.org/docs/usage/environment
- Woodpecker services and detached steps — https://woodpecker-ci.org/docs/usage/services
- Woodpecker volumes — https://woodpecker-ci.org/docs/usage/volumes
- Woodpecker plugin overview and plugin isolation — https://woodpecker-ci.org/docs/usage/plugins/overview
- Woodpecker Docker backend — https://woodpecker-ci.org/docs/administration/configuration/backends/docker
- Woodpecker Kubernetes backend — https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes
- Woodpecker Local backend — https://woodpecker-ci.org/docs/administration/configuration/backends/local
- Woodpecker project trust settings — https://woodpecker-ci.org/docs/usage/project-settings
- Woodpecker S3 plugin documentation — https://woodpecker-ci.org/plugins/s3
- Woodpecker S3 plugin 1.5.4 source tag — https://codeberg.org/woodpecker-plugins/s3/src/tag/v1.5.4
- Kubernetes Persistent Volumes documentation — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Dynamic Volume Provisioning documentation — https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Docker bind-mount documentation — https://docs.docker.com/engine/storage/bind-mounts/
- Docker volume documentation — https://docs.docker.com/engine/storage/volumes/
- Go 1.26 release notes and `go` command documentation — https://go.dev/doc/go1.26 and https://pkg.go.dev/cmd/go
- Docker Official Images source-of-truth manifests — https://github.com/docker-library/official-images/tree/master/library
- Node.js release schedule — https://nodejs.org/en/about/previous-releases
- Alpine Linux release branches — https://alpinelinux.org/releases/
- npm configuration and `npm ci` documentation — https://docs.npmjs.com/cli/using-npm/config/#environment-variables and https://docs.npmjs.com/cli/commands/npm-ci/
- BusyBox command reference — https://busybox.net/downloads/BusyBox.html

## Issues Found

1. **Container isolation was generalized to every backend:** The post described every workflow workspace as a mounted volume and implied that files, caches, home-directory state, and processes outside it disappear after every step. Woodpecker's Local backend runs directly as the agent user on the same host filesystem without isolation. The introduction, workspace description, non-persistence section, and workspace-customization text were scoped so mounted-volume and ephemeral-container behavior applies specifically to the Docker and Kubernetes backends.

2. **The clone step was described as unconditional:** Woodpecker adds the clone step by default, but it can be customized or disabled with `skip_clone: true`. The clone description now says "By default."

3. **The archive name made an unsupported architecture claim:** The build inherits the container/agent's `GOOS` and `GOARCH`, but the example named the output `api-linux-amd64.tar.gz` without selecting an amd64 agent or setting `GOARCH=amd64`. The archive was renamed to `api.tar.gz` so an arm64 build is not mislabeled.

4. **Workflow dependency behavior was imprecise:** Workflow-level `depends_on` does not transfer a status or filesystem. It waits for dependencies and, by default, requires them to finish successfully. The explanation now states that behavior directly while retaining the separate-workspace warning.

5. **Kubernetes workspace PVC controls were described incorrectly:** `WOODPECKER_BACKEND_K8S_STORAGE_RWX` selects the temporary workspace PVC's access mode; it does not control size or StorageClass. The text now distinguishes size, storage class, and access mode and identifies the PVC as belonging to each workflow's workspace.

6. **Persistent-volume provisioning was too restrictive:** The post implied that both the PV and PVC always need to be created manually. Kubernetes can dynamically provision a backing PV from a PVC and StorageClass. The text now permits either a pre-created or dynamically provisioned backing PV.

7. **The Kubernetes workload object was misnamed:** Woodpecker's Kubernetes backend runs steps in standalone Pods, not Kubernetes Job objects. "Pending Kubernetes job" was changed to "pending Kubernetes step Pod."

8. **The artifact package snippet did not create its output directory:** `tar -czf dist/api.tar.gz ...` fails if `dist` is absent. A `mkdir -p dist` command was added before packaging.

9. **The S3 plugin example contradicted its own pinning advice:** The example used an untagged image even though the accompanying text directs readers to pin plugin versions. It now uses the current released image `woodpeckerci/plugin-s3:1.5.4`, whose shown settings and secret syntax were verified against the official plugin documentation.

10. **The ownership diagnostic was incompatible with Alpine:** `find -printf` is a GNU extension and BusyBox `find` in the post's `alpine:3.22` image does not support it. It was replaced with `find ... -exec stat -c ...`, which works with both BusyBox and GNU implementations used by the referenced Linux images.

11. **The `skip_clone` permission warning was inaccurate:** Skipping the clone does not mean Woodpecker must explicitly provide a different workspace. The requirement is that the configured workspace directory be writable by the unprivileged step user. The wording now matches the official warning and gives `/tmp` as the documented example location.

12. **Workspace cleanup sounded fully automatic:** Docker agents can retain dangling Woodpecker workspace volumes and may need host-side pruning. The cleanup section now distinguishes temporary workspace scope from operator cleanup and from lifecycle management of intentionally persistent volumes, PVCs, buckets, and registries.

## Review Notes
- The corrected post matches the current Woodpecker 3.17.x documentation.
- The `golang:1.26`, `alpine:3.22`, and `node:24-alpine` image tags all exist as of the validation date. Go 1.26 is current, Node.js 24 is an LTS line, and Alpine 3.22 remains supported, although these floating tags can receive later patch-level image updates.
- The S3 plugin is upload-only. The post correctly discusses downstream downloading generically rather than claiming that the same plugin performs downloads.
- `source: dist/**` matches the two direct files produced by the example. A build that needs to include arbitrarily nested paths should use a recursive pattern supported by the pinned plugin version, such as the documented `dist/**/*` form.
- All external links in the post returned HTTP 200 and resolved to the intended pages on the validation date.

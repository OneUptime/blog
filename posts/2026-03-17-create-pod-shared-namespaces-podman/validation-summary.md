# Validation Summary: How to Create a Pod with Shared Namespaces in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- Linux namespaces
- Podman pods

## Sources Consulted
- Official Podman `podman pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Official Podman `podman pod inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html

## Issues Found
- The post incorrectly listed the cgroup namespace as shared by default. Official Podman documentation says the default shared namespaces match Kubernetes defaults: `ipc`, `net`, and `uts`. I removed `cgroup` from the default namespace list and summary.
- The post did not mention that `--share` replaces the default shared namespace list unless prefixed with `+`. I added a short clarification so examples like `--share pid,net` are interpreted correctly.
- The `podman pod inspect pid-pod --format '{{.SharedNamespaces}}'` example showed `[ipc net uts pid]`, but the pod was created with `--share pid,net`, which replaces the defaults. I corrected the expected output to `[pid net]`.

## Review Notes
Podman is not installed in the local review environment, so command behavior was verified against the current official Podman documentation rather than local `--help` output.

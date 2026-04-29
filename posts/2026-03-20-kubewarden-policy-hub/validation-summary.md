# Validation Summary: How to Use Kubewarden Policy Hub

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission policies
- Artifact Hub
- `kwctl`
- `kubectl`
- OCI-distributed policy artifacts on GHCR

## Sources Consulted
- Kubewarden common tasks: https://docs.kubewarden.io/howtos/tasks
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden CRD / API reference: https://docs.kubewarden.io/reference/CRDs
- Retired Kubewarden Policy Hub landing page: https://hub.kubewarden.io
- Kubewarden Policy Hub retirement announcement: https://www.kubewarden.io/blog/2022/07/artifact-hub-supports-kubewarden/
- `pod-privileged` policy metadata and repository: https://github.com/kubewarden/pod-privileged-policy
- `host-namespaces-psp` policy metadata and repository: https://github.com/kubewarden/host-namespaces-psp-policy
- `safe-annotations` policy metadata and repository: https://github.com/kubewarden/safe-annotations-policy
- `trusted-repos` policy metadata and repository: https://github.com/kubewarden/trusted-repos-policy

## Issues Found
- The post centered on the retired Kubewarden Policy Hub. I updated the title, description, introduction, and discovery sections to use Artifact Hub, which Kubewarden docs now direct users to for policy discovery.
- The `kwctl search` examples were no longer valid in the current CLI. I replaced them with supported `kwctl inspect`, `kwctl pull`, and `kwctl policies` usage.
- The `kwctl inspect --detailed` example was invalid. I replaced it with `kwctl inspect` and `kwctl inspect -o yaml`, which are documented in the current CLI reference.
- The `kwctl run` example passed a raw Pod JSON document via `/dev/stdin`, but current `kwctl run` expects a Kubernetes admission request object. I changed the workflow to scaffold an admission request with `kwctl scaffold admission-request` and then run the policy against that request.
- The policy examples used outdated or incorrect policy versions. I updated them to current published tags verified from the official policy repositories and OCI artifacts: `pod-privileged:v1.0.8`, `host-namespaces-psp:v1.1.6`, `safe-annotations:v1.0.2`, and `trusted-repos:v2.0.4`.
- The host namespaces policy example used incorrect settings keys (`hostPID`, `hostIPC`, `hostNetwork`). I corrected them to the current supported keys: `allow_host_pid`, `allow_host_ipc`, and `allow_host_network`.
- The image restriction example referenced a non-current policy/module (`allowed-image-repositories`) and unsupported settings (`allowedRegistries`). I replaced it with the current `trusted-repos` policy and valid `registries.allow` configuration.
- The safe annotations example used the wrong settings key (`deniedAnnotations`). I corrected it to `denied_annotations` and adjusted the description to match what the policy actually does.
- The version-checking examples used unsupported commands (`kwctl pull --list-tags` and `kwctl policies list`). I replaced them with accurate guidance: use Artifact Hub to see available versions, then inspect or pull specific versions with `kwctl`, and use `kwctl policies` to list local downloads.

## Review Notes
- The guide is now technically valid after correction, but it no longer describes the legacy Policy Hub product because that service has been retired.
- Several individual policy repositories are archived because Kubewarden policy development moved into the `kubewarden/policies` monorepo, but the published policy artifacts and version tags referenced in the post remain available.

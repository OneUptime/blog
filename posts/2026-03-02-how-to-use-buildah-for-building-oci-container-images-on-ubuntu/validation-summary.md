# Validation Summary: How to Use Buildah for Building OCI Container Images on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah (OCI image builder)
- Podman / containers ecosystem
- OCI (Open Container Initiative) image format
- Ubuntu (22.04 LTS / 20.04 LTS)
- Dockerfile syntax
- Multi-stage builds (Go example, `golang:1.21` base)
- nginx (example workload)
- GitLab CI (example CI/CD pipeline)
- Container registry transports (`docker://`, `oci-archive:`, `docker-archive:`)
- Rootless containers / `subuid` / `subgid` user namespaces

## Sources Consulted
- Buildah upstream install guide — https://github.com/containers/buildah/blob/main/install.md
- Buildah documentation directory — https://github.com/containers/buildah/tree/main/docs
- `buildah-run.1.md` — https://github.com/containers/buildah/blob/main/docs/buildah-run.1.md
- `buildah-push.1.md` — https://github.com/containers/buildah/blob/main/docs/buildah-push.1.md
- `buildah-config.1.md` — https://github.com/containers/buildah/blob/main/docs/buildah-config.1.md
- `buildah-build.1.md` — https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- `usermod(8)` Ubuntu Jammy man page — https://manpages.ubuntu.com/manpages/jammy/en/man8/usermod.8.html
- containers/podman discussion of Kubic repo deprecation — https://github.com/containers/podman/issues/17562

## Issues Found

1. **`buildah diff $CONTAINER` is not a valid command.**
   - What was wrong: The "Useful Buildah Commands Reference" section listed `buildah diff $CONTAINER` as a way to diff two images or containers. Buildah does not have a `diff` subcommand — the full subcommand list (add, build, commit, config, containers, copy, from, images, info, inspect, login, logout, manifest, mkcw, mount, prune, pull, push, rename, rm, rmi, run, source, tag, umount, unshare, version) does not include `diff`. The `diff` command belongs to Podman, not Buildah.
   - Fix: Removed the line and its comment from the commands reference.

2. **Kubic OBS repository instructions are outdated.**
   - What was wrong: The installation section instructed readers to add `https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${VERSION_ID}/` to their apt sources to get a newer Buildah. The Kubic libcontainers stable repository was discontinued in 2023 and its packages have not been updated since. The snippet also used the deprecated `apt-key add` mechanism, which has been removed/deprecated on modern Ubuntu releases.
   - Fix: Replaced the kubic-repo snippet with a note that the Kubic repo was discontinued in 2023 and that building from source against the upstream install guide is the recommended path when a newer version than the distribution provides is required.

## Review Notes

- The `buildah run $CONTAINER -- apt-get update` form was double-checked against the official `buildah-run.1.md` EXAMPLE section, which explicitly uses `buildah run containerID -- ps -auxw`. The `--` separator placement in the post matches documented usage.
- The `oci-archive:/tmp/my-nginx.tar:my-nginx:latest` transport syntax was verified against the official `buildah-push.1.md` example (`oci-archive:/path/to/archive:image:tag`) and is correct.
- `usermod --add-subuids` and `--add-subgids` are valid long-form options on Ubuntu 22.04 (shadow-utils `-v` / `-w`).
- `buildah bud` remains a valid alias for `buildah build` and is documented in `buildah-build.1.md`.
- `buildah config` flags `--label`, `--env`, `--port`, `--cmd` are all documented in `buildah-config.1.md`.
- The `golang:1.21` base image used in the multi-stage example is now an older Go release but the build still works and the example remains illustrative; readers building against newer Go versions may want to bump the tag.
- The post recommends `--tls-verify=false` for an internal registry; that is correct buildah syntax but is a permissive setting and is appropriately scoped to the private-registry example in the post.

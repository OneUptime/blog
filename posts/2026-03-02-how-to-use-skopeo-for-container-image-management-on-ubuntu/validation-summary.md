# Validation Summary: How to Use Skopeo for Container Image Management on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Skopeo (container image management CLI)
- Container registries (Docker Hub, private registries, quay.io)
- OCI image format and OCI archives
- Docker archive format
- containers-storage transport (Podman/Buildah local storage)
- Ubuntu apt package management
- jq (JSON parsing)
- Bash scripting (CI/CD promotion + health check examples)
- /etc/containers/policy.json trust policy

## Sources Consulted
- Official Skopeo install guide: https://github.com/containers/skopeo/blob/main/install.md
- skopeo(1) man page (global options including `--policy` and `--authfile`): https://github.com/containers/skopeo/blob/main/docs/skopeo.1.md
- skopeo-inspect(1) man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- skopeo-copy(1) man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- skopeo-sync(1) man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-sync.1.md
- skopeo-list-tags(1) man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
- skopeo-login/logout(1) man pages
- containers-policy.json(5) documentation: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- Ubuntu apt-key deprecation guidance (signed-by / /etc/apt/keyrings): https://wiki.debian.org/DebianRepository/UseThirdParty
- OpenSUSE OBS `devel:kubic:libcontainers:stable` project status (unmaintained for Ubuntu)

## Issues Found

1. **Outdated installation instructions for "more recent version" on Ubuntu 20.04**
   - The post recommended adding the OpenSUSE OBS `devel:kubic:libcontainers:stable` repository and using `apt-key add` to install a newer Skopeo.
   - Both pieces of guidance are outdated: the Kubic libcontainers OBS repository is no longer maintained for Ubuntu (the upstream Skopeo install doc now simply recommends the distribution package), and `apt-key add` has been deprecated in favor of `/etc/apt/keyrings/` with `signed-by`.
   - **Fix**: Removed the Kubic/apt-key snippet and replaced it with a short note pointing readers at the distribution package and the upstream install doc for source builds if a newer release is required.

2. **Invalid SOURCE in `skopeo sync --src docker` example**
   - The post used `skopeo sync --src docker --dest docker nginx registry.internal:5000`. Per the `skopeo-sync(1)` man page, the docker SOURCE must be a registry-qualified repository (e.g. `registry.example.com/busybox`); a bare `nginx` is not a valid docker source.
   - **Fix**: Changed the SOURCE to `docker.io/library/nginx` and added a brief inline comment noting the requirement.

## Review Notes

- The remaining commands and flags were verified against the official Skopeo documentation and are correct: `--raw`, `--override-arch`, `--override-os`, `--src-authfile`/`--dest-authfile`, `--dest-tls-verify=false`, `--format '{{.Digest}}'`, the `oci:`, `oci-archive:`, `docker-archive:`, and `containers-storage:` transports, `skopeo list-tags` JSON shape (`.Tags` array), the YAML format for `skopeo sync --src yaml`, the global `--policy` flag, and `policy.json` with `insecureAcceptAnything`.
- `skopeo login -u user -p password` is correct but exposes credentials in shell history / process listings; using `--password-stdin` is generally preferred in production scripts. Not a technical error, so left unchanged.
- The shell scripts in the "Registry Automation" section use unquoted `$IMAGE_NAME`/`$TAG` expansions. They are fine for the demonstrated inputs but would be safer with quoting; this is a style issue rather than a technical bug, so left unchanged per the "fix only technical errors" guidance.
- The description mentions "sign images" but the post itself does not actually cover `skopeo` image signing (e.g., `--sign-by`). This is a minor description/content mismatch but not a technical inaccuracy in the body.

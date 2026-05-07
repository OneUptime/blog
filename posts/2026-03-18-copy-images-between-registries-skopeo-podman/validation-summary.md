# Validation Summary: How to Copy Images Between Registries with Skopeo and Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skopeo
- Podman
- Container registries
- OCI container images and multi-architecture manifests
- Linux/macOS package managers
- Bash scripting

## Sources Consulted
- Skopeo upstream `skopeo-copy(1)` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Skopeo upstream README: https://github.com/containers/skopeo
- Skopeo manual page covering transports and global options: https://man.archlinux.org/man/skopeo.1.en
- Podman `podman-login(1)` documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- Homebrew formula for Skopeo: https://formulae.brew.sh/formula/skopeo

## Issues Found
- The introduction claimed Skopeo saves bandwidth compared with pull-tag-push. Skopeo avoids storing the image in local container storage, but registry-to-registry copies still transfer data through the client in normal use. Updated the wording to focus on avoiding local container storage and saving workflow time.
- The public-registry section implied copying to another public registry can work without authentication if both registries allow public access. Public read access does not usually imply anonymous push access, so the text now says this only works when the source allows anonymous pulls and the destination allows anonymous pushes.
- The authentication section used `~/.config/containers/auth.json` as the explicit auth file after plain `podman login` commands. On Linux, Podman and Skopeo default to `${XDG_RUNTIME_DIR}/containers/auth.json`, while `~/.config/containers/auth.json` is the persistent path that must be chosen explicitly. Updated the explicit `--authfile` example to use `${XDG_RUNTIME_DIR}/containers/auth.json`.

## Review Notes
The Skopeo command examples use current documented options including `copy`, `--all`, `--override-arch`, `--authfile`, `--src-tls-verify`, `--dest-tls-verify`, and `--dest-cert-dir`. The listed image transports match the documented transport forms. The bulk-copy script is syntactically valid Bash, though future revisions could improve operational behavior by accumulating failures and returning a non-zero exit code if any image copy fails.

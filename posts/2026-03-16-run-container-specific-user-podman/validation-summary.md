# Validation Summary: How to Run a Container with a Specific User in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- User namespaces
- Linux capabilities
- Dockerfile / Containerfile USER instruction
- npm
- GNU coreutils stat

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-image-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman-top` documentation: https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Docker Dockerfile `USER` instruction reference: https://docs.docker.com/reference/builder/#user
- npm `npm ci` documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- GNU coreutils `stat` documentation: https://www.gnu.org/software/coreutils/stat

## Issues Found
- The security explanation implied that a container escape always risks host root access. Updated it to clarify that this is especially true for rootful containers; rootless Podman uses user namespaces and cannot grant more privileges than the launching user.
- The default image user check used `podman inspect nginx --format '{{.Config.User}}'`. Updated it to `podman image inspect nginx --format '{{.User}}'`, which matches Podman's documented image-inspect field.
- The volume ownership example used `chown` without elevated privileges and did not distinguish rootful behavior from rootless user namespace remapping. Updated the comments and command to use `sudo chown` for a rootful-container example.
- The `--userns=keep-id` sample output showed host user and group names that may not exist in the Alpine image. Updated it to numeric UID/GID output.
- The Dockerfile example used `npm ci --production`. Updated it to `npm ci --omit=dev`, the current documented npm form for omitting development dependencies.
- The low-port capability examples published host port `80`, which can fail in rootless Podman for host-port binding reasons unrelated to `NET_BIND_SERVICE`. Updated the examples to publish host port `8080` to container port `80`, keeping the capability example focused on binding the low port inside the container.
- The running-user check started `nginx` as arbitrary UID `1000:1000`, which can fail due to image filesystem and runtime expectations. Replaced it with `alpine sleep 300` so the process-user checks work as intended.
- The troubleshooting command used BSD/macOS `stat -f %u` and `stat -f %g` syntax. Updated it to GNU/Linux `stat -c %u` and `stat -c %g`, which is appropriate for typical Podman-on-Linux usage.

## Review Notes
Podman was not installed in the review environment, so CLI checks were performed against the current official Podman documentation and local GNU `stat --help`. The post is now technically valid, but future improvements could add a short note about SELinux volume labels (`:z`/`:Z`) and rootless bind-mount ownership strategies such as `--userns=keep-id`, `:U`, or idmapped mounts.

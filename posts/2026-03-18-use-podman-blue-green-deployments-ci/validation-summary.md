# Validation Summary: How to Use Podman for Blue-Green Deployments in CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Nginx
- Bash
- Blue-green deployment
- CI/CD container image publishing

## Sources Consulted
- Podman `podman login` documentation: https://docs.podman.io/en/v4.7.2/markdown/podman-login.1.html
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman healthcheck` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman `podman healthcheck run` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman volume bind-mount options documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX command-line parameters: https://nginx.org/en/docs/switches.html
- NGINX beginner’s guide on reload behavior: https://nginx.org/en/docs/beginners_guide.html

## Issues Found
- `blue-green-deploy.sh` built `NEW_IMAGE` as `myapp:${1:-latest}`, which breaks when the pipeline passes a fully qualified image reference such as `registry.example.com/myapp:abcd1234`. I changed it to `NEW_IMAGE="${1:-myapp:latest}"`.
- `health-check.sh` used `podman exec ... wget ...`, which incorrectly assumed the application image contains `wget`. I replaced it with `podman healthcheck run` and added the required note that the image must define a `HEALTHCHECK` or be started with `--health-cmd`, which matches Podman’s documented health-check model.
- `switch-traffic.sh` and `rollback.sh` tried to `podman cp` a new NGINX config into `/etc/nginx/conf.d/default.conf` even though that path was started as a read-only bind mount from the host. I changed the scripts to update the host file, then validate and reload NGINX inside the running container instead.
- `switch-traffic.sh` only handled the load balancer being already running or not existing yet. If the `lb` container existed but was stopped, the example would fail with a name conflict on `podman run`. I added a stopped-container path that uses `podman start lb`.
- `ci-blue-green-pipeline.sh` pushed the image without logging into the registry first. I added `podman login --password-stdin` before `podman push`.

## Review Notes
- The post is technically sound after the fixes and reads as a single-host blue-green deployment example.
- The health-check flow now correctly reflects Podman’s model, but it still depends on the application image exposing a `HEALTHCHECK` or the container being started with `--health-cmd`.
- The NGINX upstream example is valid on a Podman user-defined bridge network because Podman supports container-to-container name resolution on DNS-enabled bridge networks, and NGINX upstream servers can be configured with domain names.

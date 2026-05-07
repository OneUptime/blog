# Validation Summary: How to Configure AppArmor Profiles for Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AppArmor
- Docker Engine
- Docker Compose
- Portainer
- Linux container security
- Node.js containers
- Nginx containers

## Sources Consulted
- Docker Docs: AppArmor security profiles for Docker - https://docs.docker.com/engine/security/apparmor/
- Docker Docs: Services reference (`security_opt`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Trust model for Compose files - https://docs.docker.com/compose/trust-model/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Ubuntu manpage: `apparmor.d(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/apparmor.d.5.html
- Ubuntu manpage: `apparmor_parser(8)` - https://manpages.ubuntu.com/manpages/trusty/man8/apparmor_parser.8.html
- Ubuntu manpage: `apparmor(7)` - https://manpages.ubuntu.com/manpages/noble/man7/apparmor.7.html
- Local CLI/tool validation: `apparmor_parser --help`, `docker run --help`, `docker service create --help`, `docker compose -f <tempfile> config`
- Local runtime validation: `docker run --rm nginx:alpine sh -c 'command -v nginx && ls -l /usr/sbin/nginx'`, `docker run --rm node:24 sh -c 'command -v node && ls -l /usr/local/bin/docker-entrypoint.sh'`

## Issues Found
- The post claimed Docker's `docker-default` profile was stored in `/etc/apparmor.d/docker-default` or an LXC profile path. Docker's official docs say `docker-default` is generated in `tmpfs` and loaded into the kernel, so Step 1 was corrected to inspect the loaded profile instead of reading nonexistent or unrelated files.
- The Nginx profile used `/usr/sbin/nginx mr`, which permits mapping/reading but not executing the binary. This would prevent the container from starting under the custom profile. It was corrected to `/usr/sbin/nginx ix`.
- The Nginx profile only allowed `/var/run/nginx.pid`; modern container images may resolve that via `/run/nginx.pid`. Both paths were allowed to avoid false denials.
- The Nginx signal rule allowed only `send`, but AppArmor signal mediation requires the sending and receiving profiles to permit the operation. The rule was corrected to allow `send` and `receive` for the same profile.
- The Nginx ptrace rule used a blanket `deny ptrace,`. It was narrowed to `deny ptrace (trace),` to match AppArmor's documented ptrace rule syntax more precisely for the stated intent.
- The Nginx example granted `capability dac_override` even though the guide is about least privilege and the example did not justify that capability. It was removed.
- The complain-mode example used `apparmor_parser -C` immediately after loading the same profile. Because `apparmor_parser` defaults to add mode, this can fail when the profile already exists. It was corrected to `apparmor_parser -r -C`.
- The Compose example used `version: "3.8"`. Current Docker Compose treats `version` as obsolete and ignores it, so the line was removed.
- The Compose example used the image's default entrypoint, but the custom Nginx profile only allowed executing `/usr/sbin/nginx`. To make the example consistent and runnable, the service was updated to start Nginx directly with `entrypoint` and `command`.
- The Compose example exposed port `443` without any corresponding HTTPS configuration or certificate mounts. That mapping was removed to avoid implying the sample would serve TLS as written.
- The Node.js profile used `/usr/local/bin/node mr`, which would not allow executing the Node binary. It was corrected to `ix`.
- The Node.js profile allowed only TCP sockets, but many Node.js apps need UDP for DNS lookups. UDP/IPv6 UDP allowances were added.
- The Node.js profile did not allow common shell-based entrypoint scripts used by official Node images. Permissions were added for `/usr/local/bin/docker-entrypoint.sh` and common shell interpreters used by those images.
- The conclusion implied Portainer stack YAML universally supports this workflow. It was narrowed to Linux Portainer deployments using Docker Compose-compatible stacks, which matches the validated examples and avoids overclaiming beyond that runtime model.

## Review Notes
- The example profiles are valid starting points, but AppArmor policy still needs to be tuned per image variant because container entrypoints, filesystem layout, and runtime behavior differ between tags.
- The guide correctly recommends complain mode first; that is especially important for official images whose entrypoint scripts or package layout may change over time.

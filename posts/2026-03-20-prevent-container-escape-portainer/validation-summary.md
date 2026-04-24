# Validation Summary: How to Prevent Container Escape Attacks with Portainer Settings (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Linux container security features (`no_new_privs`, seccomp, user namespaces, capabilities)
- Falco

## Sources Consulted
- Docker Engine security: https://docs.docker.com/engine/security/
- Running containers (`--privileged`, capabilities, devices): https://docs.docker.com/engine/containers/run/
- Compose services reference (`security_opt`, `privileged`, `cap_add`, `cap_drop`, `user`): https://docs.docker.com/reference/compose-file/services/
- Compose top-level `version` element (obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- Docker user namespace remapping: https://docs.docker.com/engine/security/userns-remap/
- Docker Compose trust model for privileged fields and Docker socket mounts: https://docs.docker.com/compose/trust-model/
- Docker daemon socket protection: https://docs.docker.com/engine/security/https/
- Portainer direct Docker socket connection guidance: https://docs.portainer.io/admin/environments/add/swarm/socket
- Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Edge Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer mTLS documentation: https://docs.portainer.io/advanced/mtls
- Falco container deployment guide: https://falco.org/docs/setup/container/
- Linux kernel `no_new_privs` documentation: https://docs.kernel.org/userspace-api/no_new_privs.html

## Issues Found
- The Step 1 and Step 3 YAML examples reused the top-level `services:` key multiple times inside a single code block, which makes the snippets invalid YAML. I rewrote them as valid Compose examples while preserving the original intent.
- The post used obsolete Compose patterns (`version: "3.8"` and `docker-compose.yml`). Current Docker docs mark the top-level `version` field as obsolete, so I removed it and updated the filename references to `compose.yaml`.
- The seccomp section included an invalid JSON example with comments and presented a hand-written restrictive profile as if it were the recommended baseline. Docker documents that containers already use the default seccomp profile unless overridden and explicitly says changing it is not recommended without a tested need. I replaced this with correct guidance to keep the default profile enabled, avoid `seccomp:unconfined`, and only use a tested custom profile when necessary.
- The Docker socket section implied a Portainer Agent example with a read-only socket mount and suggested a generic "TLS-based agent" alternative. Current Portainer docs show Agent and Edge Agent deployments mounting `/var/run/docker.sock` read-write and treat direct socket connections as a legacy option. I corrected the example, clarified the privilege implications, and noted that Portainer recommends the Edge Agent for most use cases.
- The user namespace remapping verification commands were incorrect. `docker run --rm alpine id` exits immediately, so `ps aux | grep alpine` cannot verify host-side UID mapping afterward, and the hard-coded `uid=165536` claim is not portable because subordinate IDs vary by `/etc/subuid` and `/etc/subgid`. I replaced this with a long-running container plus a host-side PID/UID inspection that matches Docker's documented behavior.
- The Falco example used `falcosecurity/falco-no-driver:latest` with an outdated mount set. Current Falco container docs use the `falcosecurity/falco` image and document modern eBPF deployments with specific capabilities and host mounts. I updated the snippet to match the documented modern pattern and added the AppArmor caveat noted in Falco's docs.
- The introduction and privileged-mode wording overstated the security model by describing breakouts as always giving "full root access" and privileged containers as simply "equivalent to root on the host". I adjusted that language to match Docker's more precise documentation.

## Review Notes
- `userns-remap` reduces the impact of a breakout, but Docker's own docs note that the daemon still runs as root. Rootless mode is a separate hardening option if you need both daemon and containers to avoid root privileges.
- Falco deployment details vary by driver and host kernel support. The current post now reflects the modern eBPF path documented by Falco, but operators should still verify host-specific requirements such as AppArmor and `tracefs` path differences.
- Docker's docs still mention using read-only Docker socket mounts "where possible" to reduce risk, but Portainer's own Agent and Edge Agent deployment guidance mounts the socket read-write. In practice, those components should be treated as privileged infrastructure.

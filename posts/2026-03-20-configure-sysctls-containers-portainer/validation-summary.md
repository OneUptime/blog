# Validation Summary: How to Configure Sysctls for Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide (Docker advanced container settings via Portainer UI, with equivalent `docker run` commands)

## Technologies Covered
- Portainer (Community Edition, 2.x)
- Docker Engine / `docker run` CLI
- Linux kernel sysctls (`net.core.somaxconn`, `net.ipv4.tcp_tw_reuse`)
- Linux capabilities (`NET_BIND_SERVICE`, `CHOWN`)
- NVIDIA Container Toolkit (`--gpus`)
- Docker device passthrough, shared memory, DNS, privileged mode

## Sources Consulted
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker "Configure namespaced kernel parameters (sysctls) at runtime": https://docs.docker.com/engine/containers/run/#currently-supported-sysctls
- Docker GPU support docs: https://docs.docker.com/desktop/features/gpu/ and https://docs.docker.com/engine/containers/resource_constraints/#gpu
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Linux capabilities(7) man page
- Linux kernel commit history for `net.core.somaxconn` namespacing (kernel 4.10) and `net.ipv4.tcp_tw_reuse` namespacing (kernel 4.12)
- Portainer container deployment docs: https://docs.portainer.io/user/docker/containers/add
- Portainer GPU support docs / "GPU button is missing" troubleshooting

## Issues Found
1. **Sysctls UI path was incorrect.** The post claimed `Advanced settings > Runtime & Resources > Sysctls`, but Portainer CE 2.x's container creation form does not expose a Sysctls input. Replaced this claim with guidance that sysctls must be configured via a Docker Compose stack (using the `sysctls:` key) or the API, and added a small compose example.
2. **`net.core.somaxconn` per-namespace requires kernel 4.10+.** Added a comment noting the kernel requirement so readers on older kernels understand why the value may not take effect.
3. **Capabilities tab placement was missing/implied incorrectly.** Capabilities is a top-level tab in Portainer's advanced container settings, not nested under Runtime & resources. Added an explicit note.
4. **GPU configuration prerequisite missing.** Beyond `nvidia-container-toolkit`, Portainer requires GPU support to be enabled per environment before the GPU control appears on a container. Added that detail and corrected the label from "GPUs" to "GPU".
5. **Capitalization fix.** Portainer's UI label is "Runtime & resources" (lowercase r), not "Runtime & Resources". Corrected throughout.

## Review Notes
- All `docker run` flags shown (`--device`, `--sysctl`, `--gpus`, `--cap-drop`/`--cap-add`, `--shm-size`, `--dns`/`--dns-search`, `--privileged`) are syntactically correct and current as of Docker Engine 27.x.
- Docker's allowed sysctl prefixes are limited to `kernel.*` (IPC) and `net.*` (network). Both example sysctls fall under `net.*` and are accepted; setting them is also gated on the host kernel actually namespacing them.
- `--gpus all` remains the canonical CLI flag, though Docker's newer CDI mechanism (`--device` with a CDI vendor name) is an emerging alternative — not required to call out here.
- The post title is narrowly "Sysctls" but the body covers a broader set of advanced container settings; this is a stylistic mismatch rather than a technical error and was left as-is per the "fix only technical errors" guideline.

# Validation Summary: How to Understand Docker runc and Container Runtimes

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker Engine
- containerd
- runc
- OCI Runtime Specification
- Linux namespaces
- Linux cgroups
- seccomp
- AppArmor and SELinux
- Linux capabilities
- Alternative OCI runtimes: crun, youki, gVisor/runsc, Kata Containers

## Sources Consulted
- runc official README and usage examples: https://github.com/opencontainers/runc
- runc official releases: https://github.com/opencontainers/runc/releases
- runc CLI help from local installed `runc` 1.3.5
- OCI Runtime Specification 1.1.0: https://oci-playground.github.io/specs-latest/specs/runtime/v1.1.0/oci-runtime-spec.html
- Docker Engine alternative runtimes documentation: https://docs.docker.com/engine/daemon/alternative-runtimes/
- Docker `dockerd` CLI reference and runtime configuration documentation: https://docs.docker.com/reference/cli/dockerd/
- Docker seccomp security profile documentation: https://docs.docker.com/engine/security/seccomp/
- Docker CLI help from local installed Docker client

## Issues Found
- The introduction overstated runc usage by saying nearly every container was started by runc. Updated it to say runc creates and runs many Linux containers and is Docker Engine's default OCI runtime on Linux.
- The namespace list said runc creates a user namespace unconditionally and omitted the cgroup namespace. Updated the list to include cgroup namespaces and clarify that user namespaces are created if configured.
- The standalone install example used an outdated runc release URL for v1.1.12 while describing the latest release. Updated it to v1.4.2, the latest stable release shown by the official runc releases page on 2026-06-04.
- The lifecycle example used `runc create` with the default interactive spec. Official runc docs note that simple lifecycle examples should make the generated spec non-interactive and use a non-shell long-running command. Added a small JSON edit to set `"terminal": false` and `"args": ["sleep", "60"]`.
- The network namespace description said every container gets separate networking. Updated it to "by default" because Docker and OCI runtimes can use host or shared network namespace configurations.
- The cgroup v2 verification paths were presented as universal Docker paths. Clarified that the paths apply to Docker's systemd cgroup driver.
- The gVisor table entry described runsc as "kernel-level sandboxing." Changed it to "user-space kernel sandboxing."
- The Docker alternative runtime example used `--runtime=runsc` and a legacy-style runtime path for runsc. Updated the example to use Docker's documented containerd shim runtime name and `runtimeType` configuration.
- The summary said every Docker, Kubernetes, or Podman container ultimately goes through runc. Updated it to say Linux containers go through an OCI-compliant runtime such as runc, crun, youki, runsc, or Kata Containers.

## Review Notes
The remaining examples are Linux-focused and assume the user has Docker, runc, root privileges, and the relevant kernel features installed. The cgroup filesystem paths can still vary across distributions, rootless setups, Docker cgroup drivers, and systemd slice configuration.

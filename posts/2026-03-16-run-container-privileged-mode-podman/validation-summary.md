# Validation Summary: How to Run a Container in Privileged Mode with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- Linux capabilities
- Linux devices
- seccomp
- SELinux
- AppArmor
- Rootless containers

## Sources Consulted
- Podman official documentation: --privileged option, https://docs.podman.io/en/v4.6.1/markdown/options/privileged.html
- Podman official documentation: podman-run, https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman official documentation: --security-opt option, https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- Red Hat documentation: Running Skopeo, Buildah, and Podman in a container, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_running-skopeo-buildah-and-podman-in-a-container
- containers/common seccomp package documentation, https://pkg.go.dev/github.com/containers/common/pkg/seccomp

## Issues Found
- The post said default containers cannot access host devices. Podman documents default containers as having limited device access, so the wording was corrected.
- The privileged mode summary said Podman gives access to all host devices under `/dev`. Podman documents privileged containers as receiving the same device access as the launching user, so the wording was narrowed.
- The privileged mode summary said Podman mounts `/proc` and `/sys` as read-write. Podman documents privileged mode as disabling read-only mount points, and the security option docs list default masked and read-only paths under `/proc` and `/sys`, so the wording was corrected.
- The Podman-in-Podman example said privileged mode is required. Red Hat documents both privileged and less-privileged nested Podman patterns, so the example was changed to describe it as an extended-privileges example.
- The seccomp example labeled `--security-opt seccomp=unconfined` as the default seccomp profile. Podman documents this option as turning off seccomp confinement, so the comment was corrected.

## Review Notes
The local environment did not have the `podman` binary installed, so command behavior was verified against official Podman and Red Hat documentation rather than local `--help` output. Some examples are inherently host-dependent, such as `/dev/sda`, `/dev/fuse`, USB buses, and kernel module loading; the post already presents these as examples that may depend on host and image capabilities.

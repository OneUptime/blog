# Validation Summary: How to Install and Configure containerd on Ubuntu Without Docker

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- containerd
- runc
- CNI plugins
- ctr
- nerdctl
- BuildKit
- Kubernetes CRI
- crictl
- systemd
- AppArmor
- seccomp

## Sources Consulted
- containerd Getting Started: https://github.com/containerd/containerd/blob/main/docs/getting-started.md
- containerd CRI configuration guide: https://containerd.io/docs/2.1/cri/config/
- containerd registry hosts configuration: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- containerd config.toml manual: https://containerd.io/docs/1.7/man/containerd-config.toml.5/
- Kubernetes container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes AppArmor documentation: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/tutorials/security/seccomp/
- nerdctl releases and installation notes: https://github.com/containerd/nerdctl/releases
- CNI plugins releases: https://github.com/containernetworking/plugins/releases
- runc releases: https://github.com/opencontainers/runc/releases
- CRI tools installation and compatibility notes: https://github.com/kubernetes-sigs/cri-tools

## Issues Found
- The official-binary section used older example versions while presenting the method as the latest update path. Updated containerd, runc, CNI plugins, nerdctl, BuildKit, and crictl examples to current release examples verified from upstream release pages.
- The containerd systemd unit was downloaded from the moving `main` branch while installing a pinned containerd release. Changed the URL to fetch the service file from the matching `v${CONTAINERD_VERSION}` tag.
- The CRI configuration comment said `disable_tcp_service` disabled deprecated CRI v1alpha2. Corrected it to describe the CRI streaming TCP service.
- The `SystemdCgroup` comment said it was required for Kubernetes. Updated the wording to reflect the official guidance: kubelet and the runtime should use matching cgroup drivers, and systemd is recommended on systemd-based hosts.
- The image verification section showed deprecated CRI registry config and image decryption settings as if they enabled content trust. Reworked it as registry TLS verification using `hosts.toml` and `skip_verify = false`.
- The troubleshooting section used `containerd config validate`, which is not a current containerd CLI subcommand. Replaced it with a config parse/dump command.
- The `ctr` debug flag was placed after the subcommand. Moved it to the global flag position: `ctr --debug images pull ...`.
- The CRI troubleshooting example used the deprecated `k8s.gcr.io` registry. Replaced it with `registry.k8s.io`.
- The seccomp hardening section referenced a nonexistent JSON download path. Replaced it with a Kubernetes `RuntimeDefault` seccomp example.
- The AppArmor section incorrectly described containerd as using Docker's default AppArmor profile. Corrected it to check for containerd CRI's `cri-containerd.apparmor.d` profile.
- The user namespace section used an invalid Docker-style `UsernsMode = "auto"` option in containerd runc options. Replaced it with Ubuntu user namespace sysctl checks.

## Review Notes
The guide remains focused on containerd 1.x-style CRI configuration, which is still supported and automatically converted by containerd 2.x, but future updates could add explicit containerd 2.x `version = 3` plugin paths for clarity.

# Validation Summary: How to Install Podman on Amazon Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Amazon Linux 2023
- Supplementary Packages for Amazon Linux (SPAL)
- Amazon EC2
- Amazon ECR
- AWS CLI
- systemd
- Linux user namespaces

## Sources Consulted
- Amazon Linux 2023 User Guide: Configure SPAL repository on AL2023 - https://docs.aws.amazon.com/linux/al2023/ug/configure-spal-repository.html
- Amazon Linux 2023 Release Notes: AL2023 package list - https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- Amazon Linux 2023 Release Notes: SPAL package list - https://docs.aws.amazon.com/linux/al2023/release-notes/al-2023-spal-packages.html
- Amazon Linux 2 User Guide: AL2 Extras Library - https://docs.aws.amazon.com/linux/al2/ug/al2-extras.html
- Amazon Linux 2 User Guide: List of Amazon Linux 2 Extras - https://docs.aws.amazon.com/linux/al2/ug/al2-extras-list.html
- Podman installation documentation - https://podman.io/docs/installation
- Podman generate systemd documentation - https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet/systemd documentation - https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Amazon ECR User Guide: Using Podman with Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html

## Issues Found
- The post claimed AL2023 includes Podman as a default/recommended container runtime. Current AWS documentation lists Docker, containerd, and nerdctl in AL2023 core container runtime packages, while Podman is available through SPAL. Updated the introduction and AL2023 installation steps to enable `spal-release` before installing `podman`.
- The Amazon Linux 2 instructions used `amazon-linux-extras enable docker`, `yum install podman`, and `amazon-linux-extras install podman`. AWS's current AL2 Extras list includes `docker`, but not `podman` or `container-tools`. Removed the non-working AL2 installation path and added a note that AL2023 is the package-manager-based Podman path for Amazon Linux.
- The rootless dependency example included AL2 `yum` commands. Updated it to AL2023-only `dnf` commands and included `passt` alongside `slirp4netns`, matching current Podman rootless networking guidance.
- The AWS CLI install command used `aws-cli`, but the current AL2023 package list uses `awscli-2`. Updated the package name.
- The systemd example generated a unit for `web-app` after the earlier cleanup commands stopped and removed that container. Added a `podman create` command before generating the unit so the example has a target container.

## Review Notes
The `podman generate systemd` command remains valid but deprecated; the post already warns readers to consider Quadlet for new deployments. SPAL packages do not receive the same support level as core AL2023 packages, so production users should review AWS's SPAL support statement before adopting this path.

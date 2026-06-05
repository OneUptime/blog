# Validation Summary: How to Install Docker on Amazon Linux 2023

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Amazon Linux 2023
- Docker Engine
- Docker Compose
- Docker daemon configuration
- Amazon EC2
- Amazon EBS
- Amazon VPC DNS / Route 53 Resolver
- Amazon CloudWatch Logs
- Amazon Elastic Container Registry
- AWS CLI

## Sources Consulted
- Amazon Linux 2023 documentation: Using AL2023 in containers - https://docs.aws.amazon.com/linux/al2023/ug/container.html
- Amazon Linux 2023 documentation: Deterministic upgrades through versioned repositories - https://docs.aws.amazon.com/linux/al2023/ug/deterministic-upgrades.html
- Amazon Linux documentation overview - https://docs.aws.amazon.com/linux/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Install the Docker Compose plugin - https://docs.docker.com/compose/install/linux/
- Docker Docs: Amazon CloudWatch Logs logging driver - https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Docker Engine installation on CentOS - https://docs.docker.com/engine/install/centos/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Docker networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- AWS VPC documentation: Understanding Amazon DNS - https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- AWS CLI Command Reference: ecr get-login-password - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR User Guide: Private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

## Issues Found
- The Docker Compose download command used `$(uname -s)`, which produces `Linux`, but Docker Compose GitHub release asset names use lowercase `linux`. Changed the URL to `docker-compose-linux-$(uname -m)` so the command matches Docker's documented manual plugin install format.
- The EBS migration snippet copied Docker data to `/mnt/new-volume/docker/` without first creating or mounting `/mnt/new-volume`. Added commands to create the temporary mount point, mount the new volume there, copy the existing Docker data, unmount it, and then mount the volume at `/var/lib/docker`.
- The troubleshooting section presented Docker's official RPM repository as a straightforward AL2023 option. Docker's official docs list CentOS Stream as the supported target for that CentOS repository, not AL2023. Updated the text to call out the AL2023 support caveat, added the documented `dnf-plugins-core` prerequisite, corrected the repository label to CentOS, and included Docker's current RPM package set with Buildx and Compose plugins.

## Review Notes
- The AL2023 `docker` package, `dnf` usage, systemd service management, Docker group commands, CloudWatch `awslogs` options, VPC DNS resolver address, ECR login command, ECR token duration, and Docker pruning commands were verified against official documentation.
- The daemon configuration examples overwrite `/etc/docker/daemon.json`; in a future revision, it would be useful to mention merging settings with any existing daemon configuration.

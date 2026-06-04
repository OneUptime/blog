# Validation Summary: How to Use Docker Bench Security to Harden Your Installation

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Docker Engine
- Docker Bench for Security
- CIS Docker Benchmark
- Docker daemon configuration (`daemon.json`)
- Docker CLI
- Docker Compose
- GitHub Actions
- Linux file permissions and systemd unit files

## Sources Consulted
- Docker Bench for Security README: https://github.com/docker/docker-bench-security
- Docker Bench for Security current check scripts: https://github.com/docker/docker-bench-security/tree/master/tests
- Docker daemon configuration docs: https://docs.docker.com/engine/daemon/
- `dockerd` CLI reference and daemon configuration validation: https://docs.docker.com/reference/cli/dockerd/
- Docker user namespace remapping docs: https://docs.docker.com/engine/security/userns-remap/
- Docker live restore docs: https://docs.docker.com/engine/daemon/live-restore/
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Local `docker run --help`, `dockerd --help`, `dockerd --validate`, and `docker compose config -q` output.

## Issues Found
- The post used the out-of-date `docker/docker-bench-security` image directly. The current Docker Bench README says that image is out of date and a manual build is required, so the container examples now build `docker-bench-security` locally and run that image.
- The text said Docker Bench runs as a container itself. Docker Bench can also be run directly from the host via `docker-bench-security.sh`, so the wording was corrected.
- Several CIS/Docker Bench check numbers were stale or mismatched. Updated the sample output and headings for user namespace remapping, live restore, Section 3 file checks, runtime AppArmor/SELinux/privileged/memory/CPU/read-only/no-new-privileges/PIDs checks to match Docker Bench for Security v1.6.0.
- The post described all Docker images, containers, and volumes as being stored in `/var/lib/docker`. Docker's current daemon docs note that fresh Docker Engine 29 and later installations using the containerd image store keep image contents and container snapshots under `/var/lib/containerd`, so the storage-location explanation was made more precise.
- The Section 3 permission commands only changed modes for some paths and used incorrect check-number comments. Added the corresponding `chown root:root` or `chown root:docker` commands and corrected the comments to match current Docker Bench checks.
- The CI example used the stale public image. Updated it to clone Docker Bench, build the image locally, run that image, and write the result file where later workflow steps can read it.
- The tracking section claimed to save results as JSON, but the command produced a text summary. Changed the wording and comment to describe a simple summary format.

## Review Notes
- The comprehensive `daemon.json` snippet was validated with `dockerd --validate`.
- The Docker Compose hardening example was validated with `docker compose config -q`.
- User namespace remapping is technically correct, but Docker's own documentation notes that it is best enabled on a new Docker installation and has feature limitations; readers should evaluate compatibility before applying it broadly.

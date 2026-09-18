# How to Install Docker Engine and Docker Compose on Photon OS 5

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, Docker Compose

Description: Install Docker and the Compose CLI plugin from Photon OS 5 repositories and verify a complete container deployment.

---

Photon's package names differ from Docker's distribution-specific installation examples. On a Photon OS 5 host, start with Photon repositories and inspect the packages available there. Do not add a CentOS or Fedora repository simply because Photon also uses RPMs.

The Docker daemon and Compose solve different problems. The daemon runs containers; Compose reads a project definition and asks the daemon to create its services, networks, and volumes. Both need independent verification.

## Establish a working package source

Run these checks on the standalone Photon host:

```bash
cat /etc/os-release
uname -m
tdnf repolist
tdnf info docker
tdnf info docker-compose
```

Repair DNS, clock, TLS, or repository URL problems before installing software. Older images may require the official [Photon repository migration](https://github.com/vmware/photon/wiki/changes-to-repository-location-in-photon). Use the release and architecture matching this host.

The current Photon 5 source includes a `docker-compose` package with a Docker CLI plugin installation path, as shown in the [package specification](https://github.com/vmware/photon/blob/5.0/SPECS/90/docker-compose/docker-compose.spec). Repository snapshots and package revisions can differ, so `tdnf info` and the installed package's file list are the operational authority for your VM.

## Install and start the engine

As root, review the transaction and install:

```bash
tdnf install docker docker-compose
systemctl enable --now docker
systemctl status docker --no-pager
docker version
docker info
```

If Docker was already installed, this confirms its presence and installs the missing package as needed. Use your normal approved update procedure to bring older installed packages current; do not assume an install transaction alone performed every pending upgrade.

`docker version` should report both client and server information. If the daemon fails, inspect `journalctl -u docker -b` before changing configuration. A client error connecting to the socket is different from a registry pull failure.

Keep the daemon's administrative socket restricted. Membership in the Docker group permits powerful host operations through containers, so it should follow the same access-review process as other privileged administration.

## Verify the Compose plugin

Use the space-separated subcommand:

```bash
docker compose version
rpm -q docker docker-compose
rpm -ql docker-compose
```

If `docker-compose` exists but `docker compose` fails, inspect the packaged plugin path and the Docker CLI's plugin discovery. Look for an obsolete manually installed binary in a user's CLI-plugin directory that takes precedence over the managed version.

Docker's [Linux Compose installation guide](https://docs.docker.com/compose/install/linux/) describes manual plugin installation and notes that manually installed plugins do not update automatically. Use that path only when the matching Photon repository cannot supply a suitable package, with a pinned release, correct architecture, verified artifact, and explicit update ownership. Do not mix a manual binary and an RPM without recording which one the CLI executes.

## Run a small Compose project

Create a new empty directory and place this example in `compose.yaml`:

```yaml
services:
  web:
    image: nginx:stable
    ports:
      - "127.0.0.1:8080:80"
    restart: unless-stopped
```

This intentionally binds the test endpoint to the host's loopback interface for a host-local test. Docker documents an exception for releases older than 28.0.0: machines on the same layer-2 segment can reach localhost-published ports. Check the installed engine version and any vendor fixes before relying on the binding as an access boundary. Use an approved immutable image reference for a production project; `stable` is a moving tag suitable only for this disposable example.

Run:

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=50
```

Inspect the rendered configuration before starting it, particularly when environment variables or multiple files are involved. Treat that output as sensitive if your real project includes credentials.

From the host, request `http://127.0.0.1:8080` with an available HTTP client. For a remote client, use an SSH tunnel or deliberately change the binding and apply the required access controls. Docker's [published-port documentation](https://docs.docker.com/engine/network/port-publishing/) explains the difference between loopback and externally reachable bindings.

## Confirm lifecycle behavior

Reboot a disposable test host and confirm Docker starts and the test service returns according to its restart policy. Check available disk space and log growth. Compose is not itself a background daemon that supervises an application; the created containers and their restart policies are handled by Docker.

Clean up with `docker compose down`. In production, understand named and external volume behavior before adding any volume-deletion option. Record engine and plugin versions with your deployment so an upgrade can be tested against the same Compose file and image references later.

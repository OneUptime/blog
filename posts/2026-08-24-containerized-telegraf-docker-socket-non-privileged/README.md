# How to Give Containerized Telegraf Access to the Docker Socket Without Running `--privileged`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, Docker, Containers, Linux Permissions, Security

Description: Mount the Docker Unix socket and grant Telegraf its numeric host group ID while keeping the monitoring container unprivileged.

---

Telegraf's Docker input calls the Docker Engine API. A container does not need `--privileged` to make those calls; it needs the socket mounted and its process credentials permitted by that Unix socket. On Linux, the usual solution is a read-only configuration mount, a socket bind mount, and the host socket's numeric group ID as a supplemental container group.

This removes container-wide privileged mode, but it does **not** make Docker API access low privilege. Docker's default authorization is all-or-nothing, and the `docker` group grants root-level authority over the host. Treat any container with daemon access as highly trusted.

## Configure the Docker Input

The plugin's default local endpoint is:

```toml
[[inputs.docker]]
  endpoint = "unix:///var/run/docker.sock"
  gather_services = false
  container_name_include = []
  container_name_exclude = []
```

`gather_services` is useful only when the endpoint is a Swarm manager; collecting the same service metrics from several managers creates duplicates. Use include and exclude filters to reduce work and label cardinality where appropriate.

## Discover the Host Socket Identity

Inspect the actual socket rather than assuming a particular `docker` group number:

```bash
stat -c 'mode=%a uid=%u gid=%g path=%n' /var/run/docker.sock
```

The group name and numeric GID can differ between hosts and after rebuilds. Put the current numeric value in a deployment variable such as `DOCKER_GID`; do not create an unrelated group inside the image with a hard-coded number and assume it matches.

## Add Only the Supplemental Group

A Compose service can run as the image's `telegraf` user and add the host GID:

```yaml
services:
  telegraf:
    image: telegraf:1.39
    user: telegraf
    group_add:
      - "${DOCKER_GID}"
    volumes:
      - ./telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
```

Set `DOCKER_GID` from the host's socket metadata through the deployment system, render the Compose configuration, and recreate the container after a change. Supplemental groups are established at process start.

The `:ro` suffix prevents ordinary mutation of the mounted filesystem entry. It does not turn the Docker API into a read-only API: connecting to a Unix socket and issuing powerful Engine requests does not require writing the socket inode. It is good mount hygiene, not an authorization boundary.

The equivalent direct run uses `--group-add`:

```bash
docker run --rm \
  --user telegraf \
  --group-add "$(stat -c '%g' /var/run/docker.sock)" \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock,readonly \
  --mount type=bind,src="$PWD/telegraf.conf",dst=/etc/telegraf/telegraf.conf,readonly \
  telegraf:1.39
```

There is no `--privileged` and no need to run the Telegraf process as container root.

## Verify Permissions from the Real Container

First inspect the effective identity and socket:

```bash
docker compose run --rm --entrypoint sh telegraf -c \
  'id; ls -ln /var/run/docker.sock'
```

The socket GID should appear in the process's group list. Then exercise only the polling input:

```bash
docker compose run --rm telegraf \
  telegraf --config /etc/telegraf/telegraf.conf \
  --test --input-filter docker
```

If permission is denied, compare numeric IDs, not names. If the socket is missing, confirm the host path and runtime. Docker Desktop, rootless engines, and non-Docker runtimes may expose a different socket. If Telegraf reaches the daemon but a call is rejected, check the daemon API version, authorization policy, and whether Swarm-only features are enabled on a non-manager.

Do not fix a permission mismatch with `chmod 666 /var/run/docker.sock`. That gives every local process daemon control and is broader than adding one trusted service identity.

## Reduce the Docker API Risk

Access to the ordinary rootful daemon remains a host-root-equivalent trust decision. Docker's own documentation warns that members of the `docker` group receive root-level privileges and that unprotected remote daemon access can lead to host compromise.

For a stronger boundary, consider one of these designs:

- run a rootless Docker or Podman service and give Telegraf access only to that user's socket;
- protect a remote Docker endpoint with mutual TLS and a trusted network; and
- enable a Docker authorization plugin that permits only the Engine API operations required by monitoring.

Telegraf officially supports Podman's Docker-compatible API and documents `unix:///run/podman/podman.sock` as an example endpoint. Verify the socket for the actual rootful or rootless Podman service; a user service commonly has a user-runtime-directory path instead.

Docker authorization plugins can make request decisions, but Docker documents limitations around upgraded connections and streamed response bodies. Design the policy from the exact API calls the pinned Telegraf version makes, and test it during upgrades.

## Official Documentation

- [Telegraf Docker input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/docker/)
- [Docker Compose `group_add`](https://docs.docker.com/reference/compose-file/services/#group_add)
- [Docker's warning about root-level `docker` group privileges](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user)
- [Protect the Docker daemon socket](https://docs.docker.com/engine/security/protect-access/)
- [Docker authorization plugins](https://docs.docker.com/engine/extend/plugins_authorization/)

## Conclusion

Mount the daemon socket, run as `telegraf`, and add the socket's real numeric host GID as a supplemental group. That is sufficient for the Docker input and avoids privileged mode. Still classify the container as trusted because socket access is powerful; use rootless engines, TLS, and authorization policy when the threat model needs a narrower boundary.

# Drone Clone Step Cannot Resolve Gitea or GitLab: Fix Runner Networks and DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, Networking, Gitea, GitLab

Description: Fix Drone clone DNS failures by testing the Git hostname from build containers and correcting Docker networks, upstream DNS, and advertised clone URLs.

A working Drone dashboard and a connected runner do not prove that the clone container can reach your Git server. The Docker runner creates separate containers for pipeline work, and those containers have their own network configuration.

The useful question is precise: can a newly created build container resolve and reach the hostname in the clone URL? Answer that before changing credentials or disabling certificate verification.

## Read the failing URL and classify the error

Record the hostname, scheme, and port from the clone log without copying embedded credentials. These failures imply different next steps:

| Error | Likely layer to investigate |
|---|---|
| Could not resolve host | DNS or an incorrect advertised hostname |
| Connection refused | Reachable address but wrong port or no listener |
| Connection timed out | Routing, firewall, or unreachable address |
| Certificate error | TLS hostname or CA trust |
| Authentication failed | Credentials or repository permissions |

An internal Compose name such as `gitea` may work from the Drone server container but be meaningless to a build container on a different network. Likewise, `localhost` inside the clone container refers to that container, not the Git server host.

Docker's user-defined networks provide name resolution between attached containers. Names are not globally registered across every Docker network or across separate Docker hosts. [Docker bridge networks](https://docs.docker.com/engine/network/drivers/bridge/)

## Probe the intended build network

List networks on the runner's Docker host and inspect the relevant one:

```bash
docker network ls
docker network inspect git-access
```

Then probe the actual hostname from a new container:

```bash
docker run --rm --network git-access alpine:3 \
  nslookup git.example.com

docker run --rm --network git-access curlimages/curl:latest \
  --connect-timeout 5 --max-time 15 --head https://git.example.com
```

Use your approved image digests when repeatability matters. These are connectivity probes; they intentionally do not supply repository credentials. A normal HTTP response, including an authentication response, establishes more than a DNS lookup alone, but still does not prove Git access.

If you can reproduce the problem only in Drone, temporarily use a diagnostic pipeline that disables cloning:

```yaml
kind: pipeline
type: docker
name: diagnose-git-dns

clone:
  disable: true

steps:
  - name: dns
    image: alpine:3
    commands:
      - cat /etc/resolv.conf
      - nslookup git.example.com
```

This lets the diagnostic step run before a failing automatic clone would otherwise stop the pipeline. Restore normal cloning after the investigation. [Drone clone configuration](https://docs.drone.io/pipeline/docker/syntax/cloning/)

## Choose a durable network correction

For a Git server available on an existing Docker network, the Docker runner can attach every pipeline step to that network:

```dotenv
DRONE_RUNNER_NETWORKS=git-access
```

The network must exist on the Docker daemon creating the build containers. Reconfigure the runner and test a new pipeline. Attaching only the runner container through Compose's `networks` section does not apply the same membership to the separate containers the runner creates. [Drone runner network setting](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-networks/)

This configuration expands network access for every job accepted by that runner. Use a dedicated network exposing only the required Git service, or a restricted runner pool, instead of connecting general CI workloads to an entire infrastructure network.

For a Git server on another host, use a routable hostname backed by DNS the containers can query. Verify that Gitea or GitLab advertises the intended clone URL. Drone's Gitea installation documentation specifically warns about networking complications when co-locating Gitea and Drone with Compose. [Drone Gitea configuration](https://docs.drone.io/server/provider/gitea/)

## Correct upstream DNS when network membership is already right

On a user-defined network, Docker uses an embedded resolver and forwards external queries upstream. Host `/etc/hosts` entries are not automatically inherited by containers. Adding the Git hostname only to the host's hosts file therefore may leave clones broken. [Docker DNS behavior](https://docs.docker.com/engine/network/#dns-services)

If your private zone requires a corporate resolver, configure the Docker daemon or its deployment environment to use a reachable resolver. Merge any DNS changes into the existing daemon configuration and schedule a restart appropriately; do not overwrite unrelated daemon settings. Avoid public DNS as a fix for a private zone it cannot resolve.

Verify the repair in a fresh build: the clone hostname resolves, TLS succeeds with verification enabled, and Git fetch completes. A later authentication failure is a separate issue and should be addressed at the credential or repository-permission layer.

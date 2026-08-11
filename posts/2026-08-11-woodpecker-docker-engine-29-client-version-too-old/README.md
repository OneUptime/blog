# Woodpecker Breaks After Docker Engine 29: Fixing the “Client Version Is Too Old” API Error

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, Docker Engine 29, Docker API, CI/CD, Troubleshooting

Description: Diagnose Woodpecker's Docker API version mismatch after an Engine 29 upgrade and choose a durable, version-aware fix.

---

If a Woodpecker agent stops accepting work immediately after Docker Engine is upgraded, an error such as this is unusually specific:

~~~text
client version 1.43 is too old. Minimum supported API version is 1.44,
please upgrade your client to a newer version
~~~

The Docker socket is reachable. Authentication to the Woodpecker server is not the problem. The agent's embedded Docker client is sending a versioned Engine API request that the daemon refuses. Fix the client/daemon API overlap instead of changing socket permissions or pipeline YAML.

There is one important date-sensitive detail. Docker Engine 29.0 through 29.2 raised the daemon's minimum API to 1.44. Docker 29.3 lowered that minimum to 1.40. Therefore, “Docker 29 requires API 1.44” accurately describes early 29.x releases but not every current 29.x patch. Diagnose the exact versions before choosing a workaround.

## Confirm Which Component Is Failing

Woodpecker's server schedules workflows; the agent's Docker backend talks to the Docker daemon and creates step containers. Look in the agent log first:

~~~bash
docker compose ps
docker compose logs --tail=200 woodpecker-agent
docker inspect woodpecker-agent \
  --format '{{.Config.Image}} {{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E 'woodpecker-agent|API_VERSION|DOCKER_HOST'
~~~

Adapt the service and container names to your Compose file. If the API error appears while the agent starts or initializes its backend, no repository-specific workflow change can repair it.

Next, ask the daemon what it supports:

~~~bash
docker version
curl --silent --unix-socket /var/run/docker.sock \
  http://localhost/version | jq '{Version, ApiVersion, MinAPIVersion}'
~~~

Run the socket test on the Docker host. For a remote daemon, use its protected TCP endpoint and the same TLS settings as the agent. Record all four values:

- Docker Engine version;
- daemon `ApiVersion`;
- daemon `MinAPIVersion`;
- the actual Woodpecker agent image tag or digest.

Do not infer an agent version from a stale Compose file. `docker compose images`, `docker inspect`, or the startup log shows what is running.

## Why the Upgrade Exposed the Error

The Engine API is versioned separately from the Docker product. A compatible client normally negotiates the highest version both sides understand. Negotiation cannot produce an overlap when the client is pinned to an API below the daemon's minimum, and an explicitly forced `DOCKER_API_VERSION` disables normal negotiation.

Docker Engine 29.0 deliberately rejected API versions below 1.44. That uncovered older clients which still sent 1.43. The Woodpecker project tracked the exact failure and replaced its Docker backend dependency with the newer Moby client in pull request 6357. That change shipped in Woodpecker 3.14.0. The current stable Woodpecker 3.17.0 includes the change and uses a Moby client whose supported range overlaps current Docker 29.

Docker later changed the other side of the compatibility boundary: Engine 29.3.0 lowered its minimum from 1.44 to 1.40. This explains why the same old agent may fail against 29.0.2 but appear to recover after an Engine update. It also explains why advice that simply says “downgrade Docker 29” is now incomplete.

## Preferred Fix: Upgrade the Woodpecker Agent

Upgrade the server and agents deliberately to a supported 3.x release, with 3.17.0 being current at the time of writing. At minimum, the Docker-facing agent must include the Moby-client migration from 3.14.0 or later. Keeping server, agent, and CLI on the same release makes later diagnosis much easier.

For Docker Compose, pin a real release rather than an absent `latest` tag:

~~~yaml
services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:v3.17.0

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:v3.17.0
    environment:
      WOODPECKER_SERVER: woodpecker-server:9000
      WOODPECKER_AGENT_SECRET: ${WOODPECKER_AGENT_SECRET}
      WOODPECKER_BACKEND: docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
~~~

Then pull and recreate only the intended Woodpecker services:

~~~bash
docker compose pull woodpecker-server woodpecker-agent
docker compose up -d woodpecker-server woodpecker-agent
docker compose logs --tail=100 woodpecker-agent
~~~

Back up the Woodpecker database before a major upgrade and read the migration notes if this also moves the installation from 2.x to 3.x. The Docker API repair is an agent change, but a major Woodpecker upgrade has separate workflow and database considerations.

## Also Patch Early Docker Engine 29 Releases

If the host still runs Docker 29.0, 29.1, or 29.2, update it to a maintained 29.x patch according to the operating system vendor's procedure. Engine 29.3 and later accept API 1.40 and above, and newer patches contain unrelated bug and security fixes. Do not freeze a production Docker daemon on an early 29.x release merely to preserve the original failure.

Updating both sides is the cleanest outcome:

1. a current Woodpecker agent uses a current, negotiating client;
2. a current Docker Engine receives the maintained minimum-API behavior;
3. the deployment no longer depends on a manually forced protocol version.

## Treat a Forced API Version as a Diagnostic, Not the Design

Woodpecker exposes `WOODPECKER_BACKEND_DOCKER_API_VERSION`; it also accepts `DOCKER_API_VERSION`. Setting it to `1.44` can prove that a low, forced version caused the failure when the embedded client genuinely supports 1.44:

~~~yaml
services:
  woodpecker-agent:
    environment:
      WOODPECKER_BACKEND_DOCKER_API_VERSION: "1.44"
~~~

Recreate the agent and run a disposable pipeline. If initialization succeeds, the evidence points to version selection rather than socket access.

Do not use this as an excuse to retain an obsolete agent indefinitely. Docker documents that forcing a version disables API negotiation. A version string cannot add missing client behavior, data types, or bug fixes. It may also become wrong after the next daemon change. Remove the override after upgrading and confirm the automatically negotiated connection works.

Check every place an override may be injected:

~~~bash
docker inspect woodpecker-agent --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^(DOCKER_API_VERSION|WOODPECKER_BACKEND_DOCKER_API_VERSION)='
systemctl show woodpecker-agent --property=Environment 2>/dev/null
~~~

A forgotten `DOCKER_API_VERSION=1.43` in an environment file can make a new agent behave like an old one.

## Things That Do Not Fix an API Mismatch

- `chmod 666 /var/run/docker.sock` changes authorization and creates a security problem; it does not change API versions.
- Restarting the Woodpecker server cannot update the client embedded in an old agent image.
- Re-pulling a floating tag without recreating the container leaves the old image running.
- Changing a pipeline's step image does not change the agent's backend client.
- Setting the requested API below the daemon minimum guarantees rejection.
- Assuming all Docker 29 releases have the same minimum ignores the documented 29.3 change.

If the error changes to `permission denied`, `connection refused`, or `no such file or directory`, the API mismatch is resolved and a separate Docker endpoint problem remains. Diagnose the new message on its own terms.

## Verification Checklist

After the change, use a small pipeline rather than a production deployment:

~~~yaml
steps:
  - name: api-smoke-test
    image: alpine:3.22
    commands:
      - printf 'Woodpecker Docker backend started this container successfully.\n'
~~~

Verify that:

1. the agent starts without a `client version is too old` error;
2. the agent registers with the server;
3. a workflow moves from pending to running;
4. the clone and smoke-test containers are created and removed;
5. no fixed API environment variable remains unless it is an intentional, documented temporary control;
6. `docker version` reports the expected daemon patch and API range.

## Official Documentation

- [Woodpecker discussion: Docker Engine 29 and API 1.44](https://github.com/woodpecker-ci/woodpecker/discussions/6154)
- [Woodpecker pull request 6357: migrate the Docker backend to the Moby SDK](https://github.com/woodpecker-ci/woodpecker/pull/6357)
- [Woodpecker 3.14.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.14.0)
- [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- [Docker Engine 29 release notes](https://docs.docker.com/engine/release-notes/29/)
- [Docker Engine API and version negotiation](https://docs.docker.com/reference/api/engine/)
- [Woodpecker CLI reference](https://woodpecker-ci.org/docs/cli)

## Conclusion

The error is a protocol-range failure between the Woodpecker agent and Docker daemon. Confirm the actual agent image and the daemon's minimum API, then upgrade Woodpecker to 3.14 or later—preferably current 3.17—and patch Docker beyond the early 29.x releases. A forced API version is useful for a controlled diagnosis, but automatic negotiation between maintained components is the durable fix.

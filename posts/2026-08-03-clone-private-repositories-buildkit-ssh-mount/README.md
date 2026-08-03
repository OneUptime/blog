# Clone Private Repos in Builder Stages Without Leaking SSH Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, SSH, Git, Multi-Stage Builds, Build Secrets, Supply Chain Security

Description: Forward an SSH agent into one BuildKit instruction, verify the Git host, pin fetched source, and keep private keys out of layers, arguments, logs, and final images.

---

Copying a private SSH key into a Docker build and deleting it later is not safe. The `COPY` creates a layer containing the key; a later deletion merely hides it in the merged filesystem. BuildKit's SSH mount exposes an agent socket or key only to one `RUN` instruction without committing the credential into the resulting layer.

## Prepare Host Verification Separately

SSH authentication proves the client to the Git server. Host-key verification proves the server to the client. Keep a reviewed `known_hosts` file in the build context, with fingerprints verified through the provider's official channel:

Store the complete current host-key line in `ci/known_hosts`; do not use a shortened or example key. Running `ssh-keyscan` on the same untrusted network as the clone retrieves a key but does not independently authenticate it. Treat host-key updates as reviewed supply-chain changes.

## Mount the Agent for Exactly One Instruction

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.23 AS build
RUN apk add --no-cache git make openssh-client

RUN install -d -m 0700 /root/.ssh
COPY --chmod=0600 ci/known_hosts /root/.ssh/known_hosts

ARG PRIVATE_LIB_COMMIT
RUN --mount=type=ssh,required=true \
    test -n "$PRIVATE_LIB_COMMIT" \
    && git init /src/private-lib \
    && git -C /src/private-lib remote add origin git@github.com:acme/private-lib.git \
    && git -C /src/private-lib fetch --depth=1 origin "$PRIVATE_LIB_COMMIT" \
    && git -C /src/private-lib checkout --detach FETCH_HEAD \
    && test "$(git -C /src/private-lib rev-parse HEAD)" = "$PRIVATE_LIB_COMMIT" \
    && rm -rf /src/private-lib/.git

RUN make -C /src/private-lib install PREFIX=/out

FROM alpine:3.23 AS runtime
COPY --from=build /out/ /usr/local/
ENTRYPOINT ["/usr/local/bin/service"]
```

`required=true` makes the build fail immediately if the SSH capability was not provided. The agent socket is available only during that `RUN`; it is not present in the next instruction or copied into `runtime`.

The commit is a normal non-secret build argument. Pinning a full commit makes the fetched input reviewable and makes a changed commit alter the cache key. Branch names are mutable and a cached clone command may otherwise continue returning an old snapshot.

## Invoke the Build with Agent Forwarding

Start an agent and add only the key authorized for this repository:

```bash
eval "$(ssh-agent -s)"
ssh-add ../secrets/ci-read-only-deploy-key

docker buildx build \
  --ssh default="$SSH_AUTH_SOCK" \
  --build-arg PRIVATE_LIB_COMMIT=0123456789abcdef0123456789abcdef01234567 \
  --tag example-service:dev \
  --load \
  .
```

The sample key path is outside the `.` build context. Keep private keys outside the repository and build context; never commit them. If policy requires another layout, exclude the key with `.dockerignore` as a defense in depth measure.

The example commit value has the correct Git object-ID shape but must be replaced with a real reviewed commit. Buildx accepts an SSH ID mapped to an agent socket or key; `default` matches the mount's default ID. In many environments, `--ssh default` is enough to forward the existing agent.

For Compose, the build specification also has an `ssh` field:

```yaml
services:
  service:
    build:
      context: .
      ssh:
        - default
      args:
        PRIVATE_LIB_COMMIT: 0123456789abcdef0123456789abcdef01234567
```

CI still needs to create or expose the agent and constrain the key's server-side permissions.

## Avoid the Common Leak Patterns

Do not use any of these approaches:

```dockerfile
ARG SSH_PRIVATE_KEY
RUN printf '%s' "$SSH_PRIVATE_KEY" > /root/.ssh/id_ed25519
```

```dockerfile
COPY id_ed25519 /root/.ssh/id_ed25519
RUN git clone git@github.com:acme/private-lib.git && rm /root/.ssh/id_ed25519
```

Build arguments can be exposed in history or provenance. A copied key remains in an earlier immutable layer even after deletion. Environment variables persist in image configuration. Printing connection diagnostics can also expose sensitive repository URLs or token-bearing HTTPS URLs in CI logs.

For an HTTPS credential, use `RUN --mount=type=secret` rather than an SSH mount. Docker also provides predefined Git authentication secrets for a private remote Git build context, which is a different pre-flight use case from cloning inside `RUN`.

## Check the Result

After the build:

```bash
docker image history --no-trunc example-service:dev
docker run --rm --entrypoint=/bin/sh example-service:dev -c \
  'test ! -e /root/.ssh && test ! -d /src/private-lib/.git'
```

Also scan the image and build logs for private-key headers, credential-bearing URLs, and unintended `.git` data. The source checkout itself may contain private code, so copy only compiled artifacts into the runtime stage and apply the same access policy to remote BuildKit caches as to build outputs.

Agent forwarding prevents the credential from becoming image content. It does not make fetched code trustworthy, constrain a broadly authorized key, or replace host verification and commit pinning.

## Official Documentation

- [Docker build secrets and SSH mounts](https://docs.docker.com/build/building/secrets/)
- [Dockerfile RUN SSH mount reference](https://docs.docker.com/reference/dockerfile/#run---mounttypessh)
- [Docker Buildx SSH option](https://docs.docker.com/reference/cli/docker/buildx/build/#ssh)
- [Compose Build Specification SSH attribute](https://docs.docker.com/reference/compose-file/build/#ssh)
- [Git documentation for git fetch](https://git-scm.com/docs/git-fetch)

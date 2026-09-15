# How to Build Docker Images in Drone Without Exposing an Unrestricted Docker Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, BuildKit, Security, CI/CD

Description: Build and publish images from an ordinary Drone step using an isolated remote BuildKit service with mutual TLS instead of mounting the host Docker socket.

Mounting the host Docker socket into a build step gives that step access to the daemon's control API. A read-only filesystem mount does not make requests sent through a Unix socket read-only. Docker's security documentation explains why access to the daemon is a powerful privilege. [Docker Engine security](https://docs.docker.com/engine/security/)

A useful alternative is to run the build client in Drone and execute builds on a separate BuildKit service. The Drone step receives narrowly scoped registry credentials and a client certificate for that service. It receives no host Docker socket.

This changes the access boundary; it does not make arbitrary Dockerfiles safe on a shared builder. Isolate the builder by trust level and constrain its network, credentials, storage, and lifecycle.

## Separate runner orchestration from image building

A Docker runner may itself need daemon access to create pipeline containers. The objective here is to prevent that access from being passed into repository-controlled steps.

Check both the pipeline and runner deployment for injected host volumes. Removing a socket mount from `.drone.yml` is insufficient if `DRONE_RUNNER_VOLUMES` injects it into every step. Also review automatically privileged images and dedicated runner policies. [Drone runner configuration reference](https://docs.drone.io/runner/docker/configuration/reference/)

Use this arrangement:

```text
Drone step running buildctl
  -> authenticated TLS connection
  -> dedicated BuildKit worker
  -> approved base-image registries and output registry
```

Prefer a separate worker instance for workloads with different trust levels. A shared client CA does not automatically create repository-level authorization within the builder.

## Configure the BuildKit endpoint first

Provision BuildKit using the project's supported deployment instructions. For TCP access, configure a server certificate and require client certificates. Its documentation warns that exposing TCP without mutual TLS allows unsafe access, including from build execution environments. [BuildKit TCP service configuration](https://github.com/moby/buildkit#expose-buildkit-as-a-tcp-service)

An administrator-started daemon has flags shaped like this:

```bash
buildkitd \
  --addr tcp://0.0.0.0:1234 \
  --tlscacert /etc/buildkit/tls/ca.pem \
  --tlscert /etc/buildkit/tls/server.pem \
  --tlskey /etc/buildkit/tls/server-key.pem
```

The files must already exist, have appropriate permissions and certificate usages, and cover the hostname clients use. Restrict the listening port to the CI network. Provisioning certificates, the service manager, worker dependencies, and firewall rules is an administrator task outside the pipeline example.

Rootless BuildKit can reduce worker privileges, but its kernel, namespace, snapshotter, and sandbox requirements depend on the host environment. Some documented containerized configurations relax security profiles or process isolation. Follow the rootless deployment requirements and assess those tradeoffs instead of treating the `rootless` image name as a complete isolation guarantee. [BuildKit rootless requirements](https://github.com/moby/buildkit/blob/master/docs/rootless.md)

## Supply client credentials to one Drone step

Create repository secrets containing the CA certificate PEM that validates the BuildKit server, client certificate PEM, client private key PEM, and Docker registry configuration JSON. Give the registry credential only the permissions needed to publish this repository's image.

The following pipeline expects the configured BuildKit service at `builder.example.com:1234`:

```yaml
kind: pipeline
type: docker
name: remote-image-build

trigger:
  event: [push]
  branch: [main]

steps:
  - name: image
    image: moby/buildkit:latest
    environment:
      BUILDKIT_CA:
        from_secret: buildkit_client_ca
      BUILDKIT_CERT:
        from_secret: buildkit_client_cert
      BUILDKIT_KEY:
        from_secret: buildkit_client_key
      REGISTRY_CONFIG:
        from_secret: registry_write_config
    commands:
      - |
        set +x
        set -eu
        umask 077
        build_auth_dir=$(mktemp -d)
        trap 'rm -rf "$build_auth_dir"' EXIT
        printf '%s' "$${BUILDKIT_CA}" > "$build_auth_dir/ca.pem"
        printf '%s' "$${BUILDKIT_CERT}" > "$build_auth_dir/cert.pem"
        printf '%s' "$${BUILDKIT_KEY}" > "$build_auth_dir/key.pem"
        printf '%s' "$${REGISTRY_CONFIG}" > "$build_auth_dir/config.json"
        export DOCKER_CONFIG="$build_auth_dir"
        buildctl \
          --addr tcp://builder.example.com:1234 \
          --tlscacert "$build_auth_dir/ca.pem" \
          --tlscert "$build_auth_dir/cert.pem" \
          --tlskey "$build_auth_dir/key.pem" \
          build \
          --frontend dockerfile.v0 \
          --local context=. \
          --local dockerfile=. \
          --output "type=image,name=registry.example.com/acme/api:$${DRONE_COMMIT_SHA},push=true"
```

Replace the illustrative `latest` image with an approved BuildKit client release or digest compatible with your service. The repository must contain a Dockerfile. The temporary credential directory is outside the build context, and the shell removes it on normal exit or command failure. Drone's double-dollar escaping leaves runtime expressions for the shell. [Buildctl reference](https://github.com/moby/buildkit/blob/master/docs/reference/buildctl.md), [Drone substitution](https://docs.drone.io/pipeline/environment/substitution/)

BuildKit reads registry authentication through the client's Docker configuration. This JSON is separate from Drone's `image_pull_secrets`, which would be needed only if the client step image itself were private. [BuildKit authentication and registry output](https://github.com/moby/buildkit)

## Verify both the build and the boundary

Run a controlled image build, inspect the pushed commit tag, and record its digest. Confirm the step has no socket mount and no privileged setting. Check the runner's effective injected volumes as well.

Test that a client without the issued certificate cannot connect and that the registry credential cannot write outside its intended namespace. Keep these tests on a disposable image and builder.

A successful result is an ordinary Drone container that uploads a build context to an authenticated, isolated worker and publishes a verifiable artifact. Builder patching, cache isolation, certificate rotation, and access to internal services remain part of operating that worker.

# Docker-in-Docker or Host Socket in Woodpecker: Which Image-Build Pattern Is Safer?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, Docker, CI/CD, Container Security, Buildx

Description: Compare Docker-in-Docker and host-socket image builds in Woodpecker and reduce their privilege with isolated agents and purpose-built builders.

---

Mounting `/var/run/docker.sock` gives a pipeline client control over the agent's host Docker daemon. Docker-in-Docker gives the workflow a separate daemon, but that daemon normally runs in a privileged container. Neither pattern is appropriate for untrusted code.

If forced to choose, an ephemeral Docker-in-Docker daemon usually has a smaller *daemon-state* blast radius than a shared host socket, but `privileged: true` is not a security sandbox. The safest practical pattern is a purpose-built, admin-allowlisted image builder on isolated, disposable agents, with no general workflow access to the host daemon.

## What the Host Socket Actually Grants

This pattern is short and fast:

~~~yaml
steps:
  - name: build
    image: docker:29-cli
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    commands:
      - docker build -t registry.example.com/acme/api:$CI_COMMIT_SHA .
~~~

The Docker CLI runs in the step, but every command is executed by the host daemon. A workflow that can talk to that socket can generally:

- start privileged containers;
- mount arbitrary host paths into a new container;
- inspect or modify other containers and networks;
- read images and named volumes on that daemon;
- consume host CPU, memory, disk, and ports;
- affect later pipelines using the same host.

The step container's own restrictions do not meaningfully contain what it asks the daemon to do. Treat writable Docker-socket access as host-level administrative capability.

Woodpecker requires volume-enabled trusted repositories for such mounts, but repository trust is an authorization gate, not isolation. A malicious pull request that can alter an eligible workflow remains dangerous.

## What Docker-in-Docker Changes

Docker-in-Docker, or DinD, starts a daemon as a workflow service and points a client step at it:

~~~yaml
steps:
  - name: build
    image: docker:29-cli
    environment:
      DOCKER_HOST: tcp://docker:2376
      DOCKER_CERT_PATH: /dind-certs/client
      DOCKER_TLS_VERIFY: '1'
    volumes:
      - /opt/woodpeckerci/dind-certs:/dind-certs
    commands:
      - docker version
      - docker build -t registry.example.com/acme/api:$CI_COMMIT_SHA .

services:
  - name: docker
    image: docker:29-dind
    privileged: true
    environment:
      DOCKER_TLS_CERTDIR: /dind-certs
    volumes:
      - /opt/woodpeckerci/dind-certs:/dind-certs
    ports:
      - 2376
~~~

The images, containers, and networks created by the client belong to the DinD daemon rather than the agent's normal Docker daemon. Destroying the service removes that execution state when its storage is ephemeral.

However, the daemon service is privileged. A privileged container has broad kernel and device access and may escape intended container boundaries, especially on a long-lived, multi-tenant host. DinD separates daemon state; it does not make hostile build code safe.

The certificate directory in the official Docker-backend example is an agent host volume used by the service and client. Scope it carefully and clean it; do not reuse one writable certificate directory across unrelated concurrent workflows. An ephemeral agent per workflow removes many cross-run concerns.

## Use TLS, Not an Unauthenticated TCP Daemon

Old examples often set `DOCKER_HOST=tcp://docker:2375` and disable TLS. Current Woodpecker guidance uses port 2376 with certificates. Docker deprecated unauthenticated TCP daemon connections and tightened behavior in recent releases.

The client needs:

~~~yaml
environment:
  DOCKER_HOST: tcp://docker:2376
  DOCKER_CERT_PATH: /dind-certs/client
  DOCKER_TLS_VERIFY: '1'
~~~

The daemon needs:

~~~yaml
environment:
  DOCKER_TLS_CERTDIR: /dind-certs
~~~

Do not publish the DinD port outside the workflow network. TLS protects the daemon endpoint from other network participants; it does not compensate for an over-privileged service.

## Prefer the Docker Buildx Plugin for Image Publication

Woodpecker's advanced-usage documentation explicitly recommends considering its Docker Buildx plugin when the goal is to build and publish OCI images. A purpose-built plugin narrows the interface compared with a general shell holding a Docker client.

~~~yaml
steps:
  - name: publish
    image: woodpeckerci/plugin-docker-buildx:6.1.1
    settings:
      repo: registry.example.com/acme/api
      tags:
        - ${CI_COMMIT_SHA}
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
~~~

Pin the plugin to a reviewed version or digest and follow its current plugin documentation for settings. Woodpecker 3.x no longer grants official plugins privileged mode automatically. Administrators must explicitly allow images requiring privilege through `WOODPECKER_PLUGINS_PRIVILEGED`, preferably with exact tags. That allowlist is a security control: a similarly named or unpinned image should not inherit privilege.

A plugin does not eliminate builder privilege by itself, but it makes the permitted operation and credential boundary more auditable.

## Compare the Threat Models

| Concern | Host socket | DinD service |
| --- | --- | --- |
| Controls host daemon | yes | normally no |
| Sees other host-daemon workloads | yes | no, if daemon is isolated |
| Requires privileged service | socket grants equivalent power | normally yes |
| Cache reuse | easy but cross-run | needs explicit persistent cache |
| Cleanup | affects shared daemon | destroy ephemeral daemon |
| Nested storage overhead | low | higher |
| Safe for untrusted PRs | no | no |
| Best placement | disposable single-tenant agent | disposable single-tenant agent |

The table compares defaults, not a proof of isolation. Host hardening, rootless builders, virtual machines, and Kubernetes runtime classes can change the boundary.

## When a Host Socket May Be Acceptable

Use it only when all of these are true:

- the agent is dedicated to one trusted repository or organization;
- only protected-branch or reviewed workflows can request the mount;
- the host contains no unrelated workloads or credentials;
- the agent can be destroyed and rebuilt;
- Docker authorization and host auditing are in place;
- registry credentials are scoped to the exact repository;
- build cleanup cannot remove business workloads.

Never mount a production Docker socket into CI. Do not rely on a read-only socket mount: Unix-socket filesystem mode does not turn the Docker API into a read-only API once connected.

## When DinD Is the Better Tradeoff

DinD is useful when:

- Docker-compatible behavior is required for tests;
- the job must start sibling containers;
- a fresh daemon state improves reproducibility;
- the agent host is already isolated or ephemeral;
- extra storage and startup overhead are acceptable.

Use matched, pinned Docker CLI and daemon major versions. Give the service a resource limit. Keep its storage ephemeral unless a dedicated BuildKit cache is intentionally configured. Terminate it after the workflow and do not expose its TLS client certificates to steps that do not need Docker.

## Kubernetes-Specific Considerations

The Kubernetes backend executes workflow steps as Pods and provides a documented DinD pattern using a detached privileged Docker step plus TLS certificate sharing. Cluster Pod Security admission, service-account permissions, runtime class, node isolation, and policy engines may reject or constrain privileged containers.

Do not enable arbitrary `securityContext.privileged` for all repositories. Put image builders in dedicated namespaces or node pools and allow only the reviewed builder workflow. A privileged Pod on a shared node is still a high-impact tenant.

The host-socket pattern is even more node-coupled in Kubernetes: mounting the node runtime socket lets the build affect node workloads and often bypasses cluster-level intent. Avoid it.

## Reduce Privilege Regardless of Pattern

Apply these controls:

1. Separate untrusted validation from protected image publication.
2. Run pull requests without host volumes, privileged services, or publishing secrets.
3. Pin builder, CLI, daemon, and plugin images.
4. Scope registry credentials to one repository and push namespace.
5. Build on disposable agents, VMs, or dedicated nodes.
6. Limit network egress from builder workloads.
7. Publish by immutable digest and record provenance.
8. Clean builder storage without broad Docker prune commands on shared hosts.
9. Monitor unexpected containers, mounts, and registry destinations.
10. Review every change to `volumes`, `privileged`, and builder settings.

## Diagnose Without Broadening Access

For DinD, first test:

~~~sh
docker version
docker info
~~~

Confirm that the client connects to `docker:2376`, verifies TLS, and sees the DinD server version. For a host socket, confirm the file exists and that agent logs show the expected backend, but do not “fix” permission errors with world-writable socket permissions.

If Woodpecker rejects `privileged` or `volumes`, that is an admin trust decision. Do not work around it by exposing an unauthenticated remote daemon. Ask whether the job belongs on a dedicated trusted agent.

## Official Documentation

- [Woodpecker: Docker-in-Docker setup](https://woodpecker-ci.org/docs/usage/advanced-usage#docker-in-docker-dind-setup)
- [Woodpecker: Trusted volumes](https://woodpecker-ci.org/docs/usage/volumes)
- [Woodpecker: Privileged mode and workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax#privileged-mode)
- [Woodpecker: Docker Buildx plugin](https://woodpecker-ci.org/plugins/docker-buildx)
- [Woodpecker: Kubernetes backend](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes)
- [Woodpecker: 3.0 privileged-plugin migration](https://woodpecker-ci.org/migrations#300)
- [Docker: Protect the daemon socket](https://docs.docker.com/engine/security/protect-access/)

## Conclusion

A host socket is compact and fast but effectively hands the workflow control of the agent host. DinD isolates Docker daemon state but normally requires a privileged container, so it is only a relative improvement on an isolated, disposable worker. Prefer a pinned, allowlisted builder plugin and keep all image-building privilege out of untrusted pull requests. If either Docker pattern can touch a long-lived multi-tenant host, the architecture—not the YAML—needs to change.

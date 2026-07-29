# Health Checks for Chainguard Images Without curl, wget, or a Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Docker, Kubernetes, Health Check, Distroless

Description: Implement reliable health checks for distroless Chainguard workloads using orchestrator-native probes or a purpose-built executable.

---

A distroless Chainguard runtime usually has no shell, `curl`, or `wget`. This familiar health check therefore fails:

```dockerfile
HEALTHCHECK CMD curl --fail http://localhost:8080/healthz || exit 1
```

It depends on both a shell for `|| exit 1` and a network client that the image intentionally omits. Choose a check mechanism that does not require either dependency.

## Prefer orchestrator-native probes

Kubernetes HTTP, TCP, and gRPC probes are initiated by the kubelet. They do not execute `curl` inside the application image.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/api@sha256:REPLACE_ME
          ports:
            - name: http
              containerPort: 8080
          startupProbe:
            httpGet:
              path: /health/startup
              port: http
            periodSeconds: 2
            failureThreshold: 30
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            periodSeconds: 5
            failureThreshold: 2
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            periodSeconds: 10
            failureThreshold: 3
```

Use the probes for distinct decisions:

- startup delays liveness and readiness until initialization is complete;
- readiness controls whether the Pod receives Service traffic;
- liveness decides whether Kubernetes should restart the container.

Do not make liveness fail merely because a remote database is temporarily unavailable. Restarting every replica can amplify an upstream outage. Readiness can include dependencies required to serve traffic, while liveness should primarily establish that the process can make progress.

For a service without HTTP, Kubernetes can open a TCP socket:

```yaml
readinessProbe:
  tcpSocket:
    port: 5432
```

A successful TCP connection only proves that something is listening. Use an HTTP or gRPC application-level check when semantic health matters.

## Use an executable Docker health check

Docker's `HEALTHCHECK` runs a command inside the container. In a distroless image, use JSON exec form and include one purposeful executable:

```dockerfile
FROM cgr.dev/chainguard/static:latest

COPY --chown=65532:65532 app /usr/local/bin/app
COPY --chown=65532:65532 healthcheck /usr/local/bin/healthcheck

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/usr/local/bin/healthcheck", "http://127.0.0.1:8080/healthz"]

ENTRYPOINT ["/usr/local/bin/app"]
```

Build the probe as a small static binary, or make the application binary expose a command such as:

```dockerfile
HEALTHCHECK CMD ["/usr/local/bin/app", "healthcheck"]
```

The command must exit `0` for healthy and `1` for unhealthy. Docker reserves exit code `2`. Apply strict timeouts inside the probe as well as in `HEALTHCHECK`, and keep its output short because Docker stores only a limited amount in health status.

## Reuse an existing language runtime carefully

If the image already contains Python, a standard-library request can avoid adding `curl`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=2).read(1)"]
```

This is valid JSON exec form and does not invoke a shell. It does start another interpreter on every check, so measure the overhead. It also couples health behavior to language-level proxy, TLS, and exception handling. A built-in application subcommand is usually clearer.

## Avoid Compose `CMD-SHELL`

Docker Compose distinguishes `CMD` from `CMD-SHELL`:

```yaml
services:
  api:
    image: registry.example.com/api@sha256:REPLACE_ME
    healthcheck:
      test:
        - CMD
        - /usr/local/bin/healthcheck
        - http://127.0.0.1:8080/healthz
```

`CMD-SHELL` explicitly uses the container's default shell and will fail when `/bin/sh` is missing. String-form tests are also treated as shell commands. Use the list-form `CMD` test for a distroless image.

## Do not add a toolbox just for health checking

Installing `curl`, a shell, and their transitive dependencies only for a periodic check weakens the reason for choosing a minimal runtime. Prefer, in order:

1. a native orchestrator probe;
2. a health subcommand in the main application;
3. a small, dedicated probe executable;
4. an existing runtime's standard library when the overhead is acceptable.

Test the unhealthy path as well as the healthy path. Stop the listener, force a dependency timeout, and inspect:

```bash
docker inspect \
  --format '{{json .State.Health}}' \
  api-container
```

A health check that always returns success is worse than no check because it creates false confidence.

## Official Documentation

- [Dockerfile `HEALTHCHECK` reference](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [Docker Compose healthcheck reference](https://docs.docker.com/reference/compose-file/services/#healthcheck)
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)

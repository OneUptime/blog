# How to Debug a Chainguard Distroless Container When `/bin/sh` Is Missing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Container, Distroless, Kubernetes, Debugging

Description: Debug a minimal Chainguard Container safely with development variants, ephemeral containers, and evidence collected outside the production image.

---

An error such as `exec: "sh": executable file not found in $PATH` is usually expected with a standard Chainguard Container. Most standard variants are distroless: they contain the application and required runtime libraries, but deliberately omit a shell, package manager, and general-purpose troubleshooting tools.

The missing shell is not evidence that the image is corrupt. It means the debugging workflow must not depend on executing arbitrary tools inside the application container.

## Confirm that the shell is really absent

First inspect the image configuration and reproduce the failure without changing the image:

```bash
IMAGE=cgr.dev/chainguard/python:latest

docker pull "$IMAGE"

docker image inspect "$IMAGE" \
  --format 'user={{json .Config.User}} entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}}'

docker run --rm -it --entrypoint /bin/sh "$IMAGE"
```

The second command should fail for the standard Python variant. Do not respond by copying a shell into the production image. That changes the artifact under investigation and permanently expands its attack surface.

## Reproduce with the development variant

Most Chainguard application containers have a corresponding development variant tagged `:latest-dev`. It is intended for building, testing, and debugging and commonly includes `apk`, a shell, and ecosystem tooling.

```bash
docker run --rm -it \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/python:latest-dev
```

Chainguard Containers usually run as a nonroot user, including many development variants. If a diagnostic genuinely needs root, opt in explicitly and only in the disposable debug container:

```bash
docker run --rm -it \
  --user root \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/python:latest-dev
```

Use the same application version and architecture as production. A `latest-dev` image pulled today is not a reliable stand-in for a runtime digest from months ago. Record both digests before comparing them:

```bash
docker buildx imagetools inspect cgr.dev/chainguard/python:latest
docker buildx imagetools inspect cgr.dev/chainguard/python:latest-dev
```

Reproduce the workload in the development image, collect the failing command, environment, user ID, file permissions, DNS results, and shared-library requirements, then put the fix into the Dockerfile. The development image is a laboratory, not a place to modify the production container in situ.

## Debug a running Kubernetes Pod

Kubernetes ephemeral containers let a troubleshooting image join namespaces of an existing Pod:

```bash
kubectl debug -it pod/api \
  --image=cgr.dev/chainguard/wolfi-base:latest \
  --target=api
```

From the debug container, inspect networking and processes with the tools available there. If the container runtime supports `--target` and places the debug container in the target's process namespace, the target filesystem may be reachable through its process root:

```bash
ps
ls -la /proc/1/root/
cat /proc/1/root/etc/os-release
```

There are important boundaries:

- An ephemeral container does not automatically receive the target container's volume mounts.
- `/proc/<pid>/root` access depends on shared PID namespaces, matching permissions, and security controls such as seccomp or AppArmor.
- A Pod enforcing `runAsNonRoot` may require an explicit `securityContext` for the debug container.
- Tools in the debug image use the debug image's libraries. Their output does not prove that the target filesystem contains those same libraries.

For volume-heavy debugging, copy the Pod specification and add a temporary sidecar with matching `volumeMounts`, or create an ephemeral container through the Kubernetes API with the required mounts when your cluster supports that workflow.

## Collect evidence without entering the container

Many useful checks do not require a shell in the target:

```bash
kubectl logs pod/api -c api --previous
kubectl describe pod/api
kubectl get pod/api -o yaml
kubectl get events --sort-by=.metadata.creationTimestamp
```

You can also inspect an image offline:

```bash
docker image inspect cgr.dev/chainguard/python:latest
docker history cgr.dev/chainguard/python:latest
```

The Chainguard Directory exposes the image configuration, SBOM, vulnerabilities, signatures, variants, and tag history. Those records are often more useful than an interactive `ls` because they identify exactly which packages should be present.

## A repeatable debugging sequence

Use this order to avoid altering the evidence:

1. Save the exact image reference and resolved digest.
2. Capture logs, Pod events, exit code, signal, and runtime configuration.
3. Inspect the image's configured user, entrypoint, command, architecture, and SBOM.
4. Reproduce with the matching `-dev` variant or a disposable debug container.
5. Compare application files, permissions, environment variables, and dynamic libraries.
6. Encode the correction in the Dockerfile or deployment manifest.
7. Rebuild, test, scan, and redeploy the standard distroless variant.

If the application only works after installing an interactive tool in the runtime, treat that as a dependency discovery result. Add the actual runtime library or application artifact during the image build, rather than retaining the entire debugging toolbox.

## Official Documentation

- [Debugging distroless container images](https://edu.chainguard.dev/chainguard/chainguard-images/troubleshooting/debugging-distroless-images/)
- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Kubernetes ephemeral containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Debug running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)

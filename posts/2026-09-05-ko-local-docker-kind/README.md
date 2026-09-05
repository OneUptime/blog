# How to Load ko Images Directly into Docker or kind Without Pushing to a Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Docker, Kubernetes, Local Development, Container Image

Description: Build Go containers with ko and load them into a local Docker daemon or kind cluster without operating a registry.

---

Remote registries add latency and credentials to a local development loop. `ko` supports two special publishing destinations that avoid a push: `ko.local` loads the image into the active Docker daemon, and `kind.local` imports it into a kind cluster.

These names are routing signals understood by `ko`; they are not public registries. A Kubernetes node that did not receive the image cannot pull `kind.local/...` from the network.

## Load an Image into Docker

With `KO_DOCKER_REPO` unset, this command selects Docker and preserves import paths:

```bash
ko build --local --preserve-import-paths ./cmd/api
```

The environment-based form is:

```bash
export KO_DOCKER_REPO=ko.local
ko build --preserve-import-paths ./cmd/api
```

Both forms compile the program, assemble its image, and write it through the Docker daemon API. With the supplied `--preserve-import-paths`, the returned reference uses the `ko.local` domain and the full import path (lowercased). With `--local`, an already-set `KO_DOCKER_REPO` changes the reference prefix, but the image still loads into Docker. In version 0.19.1, omitting that naming flag produces the normal package-plus-hash name even though the CLI's long example says local mode always preserves paths. Capture the actual result rather than depending on that wording:

```bash
image_ref=$(ko build --local --preserve-import-paths ./cmd/api)
docker image inspect "$image_ref" >/dev/null
docker run --rm -p 8080:8080 "$image_ref"
```

Progress is written separately, so command substitution receives the published reference. If building multiple packages, use `--image-refs` and handle every line instead of assigning multiple references to one variable.

In version 0.19.1, the Docker publisher uses an environment-configured API client: `DOCKER_HOST` selects the endpoint, with the default socket used when it is unset. It does not automatically honor the active Docker CLI context or `DOCKER_CONTEXT`. If `DOCKER_HOST` points at a remote engine, the image is not necessarily on the laptop where the command ran. Compare the CLI context endpoint with the environment before debugging a supposed missing image:

```bash
docker context show
docker context inspect --format '{{.Endpoints.docker.Host}}'
printf 'DOCKER_HOST=%s\n' "${DOCKER_HOST:-<unset>}"
docker info --format '{{.Name}}'
```

Docker or a compatible accessible daemon is required for `--local`; daemonless applies to remote registry publishing, not to loading the Docker image store.

## Load an Image into kind

For kind, set the special repository:

```bash
export KO_DOCKER_REPO=kind.local
ko build ./cmd/api
```

`ko` discovers the default kind cluster, builds the image, and loads it into the cluster's nodes. For a non-default cluster, set its exact name:

```bash
export KO_DOCKER_REPO=kind.local
export KIND_CLUSTER_NAME=integration
ko build ./cmd/api
```

Confirm the name with `kind get clusters`. If the cluster is recreated, its node containers and imported images are recreated too; run the load again.

In version 0.19.1, the kind publisher iterates over every node in the selected cluster and fails on the first load error. Treat any failed load as a failed build; scheduling to a node without the image causes an image-pull attempt against the nonexistent `kind.local` registry with `IfNotPresent`, or a startup failure without a pull with `Never`.

## Deploy a Local Reference Safely

A manifest can retain a `ko://` source reference (replace the example import path with your Go main package and save the manifest under `config/`):

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
          image: ko://example.com/acme/service/cmd/api
          imagePullPolicy: IfNotPresent
```

Resolve and apply it to kind:

```bash
KO_DOCKER_REPO=kind.local \
KIND_CLUSTER_NAME=integration \
ko apply -f config/ -- --context kind-integration
```

`ko apply` builds each `ko://` reference, loads its image, replaces the reference in memory, and invokes `kubectl apply`. The arguments after `--` go to `kubectl`.

Set `imagePullPolicy: IfNotPresent` or `Never` for purely local images. `Always` instructs Kubernetes to contact a registry even when an image is present, which defeats this workflow. `Never` is strict and useful in tests; `IfNotPresent` is more flexible.

## Avoid Reference-Reuse Confusion

Local daemon and kind publication return a tag whose value is derived from the image's SHA-256 digest, rather than a registry-style `@sha256:` reference. That content-derived tag changes when the image changes, but deployments using a guessed mutable tag such as `latest` may continue to run older local content. Preserve the exact reference in the resolved manifest:

```bash
KO_DOCKER_REPO=kind.local \
KIND_CLUSTER_NAME=integration \
ko resolve -f config/ > /tmp/resolved-kind.yaml

kubectl --context kind-integration apply -f /tmp/resolved-kind.yaml
```

Inspect the actual image and pull policy:

```bash
kubectl --context kind-integration get pod \
  -l app=api \
  -o jsonpath='{range .items[*]}{.spec.nodeName}{"  "}{.spec.containers[0].image}{"  "}{.spec.containers[0].imagePullPolicy}{"\n"}{end}'
```

Applying a changed content-derived image reference updates the Deployment's Pod template and automatically triggers a rollout. If a Pod still runs old code, check rollout status, compare the Pod's image ID, and ensure `ko` targeted the same cluster named in the kubectl context.

## Docker and kind Are Different Destinations

Loading into Docker does not always make the image available inside kind. kind nodes are containers with their own containerd image stores. Likewise, an image imported into kind is not guaranteed to appear in `docker image ls` as a runnable host image.

Choose based on the consumer:

| Consumer | ko destination |
| --- | --- |
| `docker run` and local Compose tooling | `--local` or `KO_DOCKER_REPO=ko.local` |
| Pods in the default kind cluster | `KO_DOCKER_REPO=kind.local` |
| Pods in a named kind cluster | `kind.local` plus `KIND_CLUSTER_NAME` |
| Teammates or a remote cluster | A real registry URL |

Do not commit a resolved `kind.local` reference as a production release artifact. It has meaning only while the receiving local cluster retains the loaded content.

## Troubleshoot the Local Path

When Docker loading fails, check daemon connectivity and platform compatibility. A Linux image can be stored by Docker Desktop on macOS, but running it requires the Desktop VM and a supported architecture or emulation.

When kind loading fails, check:

```bash
kind get clusters
docker ps --filter label=io.x-k8s.kind.cluster
kubectl config get-contexts
```

A mismatch between `KIND_CLUSTER_NAME=integration` and kubectl context `kind-dev` is easy to overlook. For Docker-backed kind clusters, ensure the Docker CLI used by ko's kind provider targets the daemon containing the node containers. This path uses kind's provider rather than ko's Docker image-store publisher.

## Conclusion

Use `ko.local` when the next consumer is Docker and `kind.local` when the next consumer is a kind cluster. Capture the reference returned by `ko`, use a local-friendly pull policy, and keep the cluster name aligned across `ko` and kubectl. These special domains accelerate development, but they do not replace a registry for durable or remote delivery.

## Official Documentation

- [ko: Configuration and Local Publishing Options](https://ko.build/configuration/)
- [ko: Kubernetes Integration](https://ko.build/features/k8s/)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [kind: Loading an Image into a Cluster](https://kind.sigs.k8s.io/docs/user/quick-start/#loading-an-image-into-your-cluster)
- [Kubernetes: Image Pull Policy](https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy)

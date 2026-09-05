# How to Deploy `ko://` Image References with `ko resolve` and `ko apply`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Kubernetes, Deployment, OCI, Container Image

Description: Turn ko source references in Kubernetes YAML into built digest-pinned images, then review or apply the resulting resources.

---

`ko://` connects a Go main package to the Kubernetes object that runs it. Instead of building an image, copying its tag into YAML, and hoping the tag still points to the same content, you put the Go import path in the manifest. `ko resolve` builds and publishes the package, replaces the source reference with a registry reference, and writes resolved YAML. `ko apply` performs the same resolution and sends the result to `kubectl apply`.

## Start with a Valid Go Command

Assume the module is `example.com/acme/payments` and its server is in `cmd/api`. Test the package before involving Kubernetes:

```bash
go test ./cmd/api
go build ./cmd/api
```

The target must be a buildable Go `main` package. `ko` is not a general Dockerfile frontend and cannot turn an arbitrary library package into a runnable container.

## Put the Import Path in the Manifest

Use the fully qualified import path after the `ko://` scheme:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: api
          image: ko://example.com/acme/payments/cmd/api
          ports:
            - name: http
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: payments-api
spec:
  selector:
    app: payments-api
  ports:
    - port: 80
      targetPort: http
```

Commit this source manifest. It states what to build without embedding a mutable registry tag.

## Resolve Without Changing the Cluster

Set a real destination and render a release file:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/payments
ko resolve -f config/ > release.yaml
```

The command scans the input documents, builds each unique `ko://` reference, publishes it, substitutes the resulting digest-bearing image reference, and prints YAML on standard output. Build progress goes to standard error, so the redirected file remains YAML.

Review it before deployment:

```bash
kubectl diff -f release.yaml
kubectl apply --server-side --dry-run=server -f release.yaml
```

This two-stage pattern is preferable when a release requires approval, signing, policy evaluation, or promotion between systems. Preserve `release.yaml` and its image digests as release evidence.

By default, `ko resolve -f directory/` processes supported files in that directory. Use `--recursive` when manifests are nested:

```bash
ko resolve --recursive -f config/ > release.yaml
```

## Apply in One Command

For an interactive development cluster, the shortcut is:

```bash
ko apply -f config/
```

`ko apply` performs the build, publication, and substitution, then invokes `kubectl apply`. It requires `kubectl` on `PATH`. Forward kubectl flags after the separator:

```bash
ko apply -f config/ -- \
  --context=dev-eu \
  --namespace=payments \
  --server-side
```

Flags before `--` belong to `ko`; flags after it belong to `kubectl apply`. Mixing the two is a common cause of unknown-flag errors.

For local kind development, replace the remote repository with the special local destination:

```bash
KO_DOCKER_REPO=kind.local \
KIND_CLUSTER_NAME=dev \
ko apply -f config/ -- --context=kind-dev
```

## Understand Tags and Digests

`ko` publishes tags, with `latest` as the default, but resolution normally includes a digest. In version 0.19.1, the default canonical result omits the redundant `latest` tag and looks like:

```text
registry.example.com/acme/payments/api-<hash>@sha256:<digest>
```

The registry still receives the `latest` tag. Kubernetes pulls the immutable digest in the resolved YAML, so later movement of that tag does not make the deployment mutable.

Avoid `--tag-only` unless the target system cannot preserve digests. In version 0.19.1, registry publishing with this flag requires exactly one explicit tag other than `latest`, such as `--tag-only -t v1.8.0`. It intentionally removes the digest from resolved references, allowing a later tag update to change what new Pods run. If a promotion system rewrites or drops digests, fix that system rather than weakening every deployment when possible.

Use release tags when helpful:

```bash
ko resolve -t v1.8.0 -t "$(git rev-parse --short=12 HEAD)" \
  -f config/ > release.yaml
```

The resolved YAML should still carry the digest unless `--tag-only` is requested.

## Use Selectors and Multiple Files Deliberately

The `--selector` flag filters Kubernetes objects by labels. That can reduce a deployment, but it may also omit a Service, ConfigMap, or RBAC object whose labels do not match. Render and inspect the output whenever a selector is introduced.

When the same `ko://` reference appears more than once, `ko` caches the build within the process rather than rebuilding it for every occurrence. Different import paths are distinct images even if they share most Go dependencies.

`ko` scans YAML string nodes for the `ko://` prefix, not just container image fields, so a prefixed value in an environment variable or custom resource can also trigger a build and substitution. It does not replace arbitrary embedded occurrences of `ko://` within larger strings. Keep general configuration substitution separate.

## Separate Build Authority from Deploy Authority

`ko resolve` needs source, Go dependency access, base-image pull access, and registry push access. It does not need Kubernetes credentials. A later deployment job can receive only `release.yaml` and cluster credentials.

`ko apply` combines both authorities in one process. That is convenient locally but broader than necessary for protected environments. A safer production flow is:

```text
source + registry writer -> ko resolve -> reviewed release.yaml -> cluster deployer
```

This division also makes failures easier to classify: build errors happen before deployment approval, while admission or rollout errors happen against a known image digest.

## Delete Resources Carefully

The corresponding convenience command is:

```bash
ko delete -f config/
```

It delegates deletion to kubectl. It does not build packages and does not delete images from the registry. In production, prefer deleting the exact resolved release or using the owning delivery controller so source drift does not change the deletion set.

## Troubleshoot Resolution

If resolution fails:

- Confirm `KO_DOCKER_REPO` is visible to the same process.
- Run `go list` on the import path to catch module-boundary mistakes.
- Authenticate for both the base-image registry and destination registry.
- Check that every YAML document parses before assuming the image reference is at fault.
- Use `ko --verbose resolve ...` temporarily for more detail.
- Inspect `release.yaml` only after a zero exit status; shell redirection may leave a partial file on failure.

For robust automation, write to a temporary file and move it into place only after success.

## Conclusion

Keep `ko://` references in source-controlled manifests, use `ko resolve` when the generated artifact needs review, and reserve `ko apply` for workflows where combined build-and-deploy authority is appropriate. Digest-bearing output is the central safety property: it lets the cluster run exactly what the reviewed build produced, regardless of later tag movement.

## Official Documentation

- [ko: Kubernetes Integration](https://ko.build/features/k8s/)
- [ko: `ko resolve` Reference](https://ko.build/reference/ko_resolve/)
- [ko: `ko apply` Reference](https://ko.build/reference/ko_apply/)
- [ko: `ko delete` Reference](https://ko.build/reference/ko_delete/)
- [Kubernetes: Container Images](https://kubernetes.io/docs/concepts/containers/images/)

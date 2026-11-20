# How to Skip Knative Image Tag Resolution for an HTTP-Only Development Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Container Registry

Description: Scope Knative tag-resolution skipping to a development registry while separately configuring node runtime transport, credentials, and immutable image references.

A local registry serves HTTP, but Knative's controller tries HTTPS while resolving a tag. The Revision fails before a pod can use the image. For an isolated development setup, Knative can skip tag resolution for a named registry.

That setting only changes the controller's lookup. It does not configure containerd to use HTTP, distribute credentials, or make a mutable tag reproducible.

## Understand which lookup is failing

Knative normally turns an application image tag into a digest when creating a Revision. This ensures that later replicas of the Revision use the resolved image. The [tag-resolution documentation](https://knative.dev/docs/serving/tag-resolution/) describes the controller's registry access requirements.

Inspect the Revision condition and controller log. If the message says an HTTP response arrived at an HTTPS client during tag resolution, check the registry's intended transport and address. If the failure comes from a node's image pull instead, this controller setting is not the repair for that failure.

## Add only the development registry

The [deployment configuration reference](https://knative.dev/docs/serving/configuration/deployment/#skipping-tag-resolution) documents `registries-skipping-tag-resolving`. For a YAML-managed installation, add the host and port to the comma-separated value in the managed `config-deployment` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-deployment
  namespace: knative-serving
data:
  registries-skipping-tag-resolving: "kind.local,ko.local,dev.local,registry.dev.example:5000"
```

This is a configuration fragment. Preserve the existing ConfigMap data, including queue-proxy settings and any already-approved registry exceptions. Use the registry authority from the image reference, such as `registry.dev.example:5000`; do not include `http://` or a repository path.

For an Operator-managed installation, merge the equivalent value into the existing resource instead:

```yaml
spec:
  config:
    deployment:
      registries-skipping-tag-resolving: "kind.local,ko.local,dev.local,registry.dev.example:5000"
```

The [Operator configuration guide](https://knative.dev/docs/install/operator/configuring-with-operator/) explains why direct ConfigMap edits would be overwritten. Avoid adding public production registries simply to suppress an unrelated authentication or certificate failure.

## Configure the node runtime independently

Every node that may run the Service must resolve and reach the development registry. The node's container runtime needs its documented HTTP registry configuration. A registry on your laptop's loopback interface is not automatically reachable as `localhost` from a node VM or a containerized cluster node.

For containerd, consult its [registry host configuration](https://github.com/containerd/containerd/blob/main/docs/hosts.md). Plain HTTP requires the appropriate host URL and runtime configuration. A TLS option that skips certificate verification is not the same as selecting HTTP. Restart or reload the runtime configuration only as required by the particular version and cluster distribution.

Keep credentials scoped to the test registry and avoid sending sensitive production credentials over HTTP. Configure image-pull secrets or node credentials through the normal Kubernetes mechanism if the development registry requires authentication.

## Verify with a new Revision

Deploy an image reference from the approved registry, using your actual built image:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: dev-checkout
  namespace: development
spec:
  template:
    spec:
      containers:
        - image: registry.dev.example:5000/apps/checkout:build-42
          ports:
            - containerPort: 8080
```

Confirm the controller no longer attempts the skipped tag lookup, then inspect the generated pod events and container `imageID` values. A new `ImagePullBackOff` indicates a node-side image-pull failure; use the pod events to check the image reference, registry availability, credentials, and runtime transport configuration rather than adding more controller exceptions.

A cached image can hide a broken registry path. Test on an uncached development node or use a genuinely new build reference, and make an HTTP request through the Knative route once readiness succeeds.

## Keep image identity predictable

Without controller-side digest resolution, a mutable tag may resolve differently for replicas created at different times. Use unique, never-reused build tags and record the resulting image IDs. Prefer a digest-pinned reference when your development workflow supports it.

When moving the workload to a production registry, configure valid TLS, controller CA trust, and credentials, then remove the skip exception. Create a new Revision and verify its resolved image identity. The development workaround should have a clear owner and scope so it does not silently become the production image policy.

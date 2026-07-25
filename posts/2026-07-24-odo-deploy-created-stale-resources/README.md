# What odo deploy Actually Creates—and How to Find and Remove Stale Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: odo, Devfile, Kubernetes, Deployment, Troubleshooting

Description: Understand odo deploy outputs, trace labeled Kubernetes objects and pushed images, and remove stale resources without deleting unrelated workloads.

---

`odo deploy` does not create one fixed set of Kubernetes objects. It executes the Devfile's deployment contract: it may build and push images, apply resources defined by Kubernetes or OpenShift manifests, and run deployment commands as Jobs. Consequently, a stale deployment might be a Deployment, a custom resource, a persistent volume claim, an unfinished Job, or an image tag outside the cluster.

Lifecycle context matters before troubleshooting an old workflow. Red Hat deprecated odo effective October 23, 2025, and its GitHub repository was archived on April 1, 2026. This article describes the final odo v3 behavior for teams maintaining a pinned installation. odo's documentation targets Devfile 2.2.0; the current Devfile specification is 2.3.0. Plan migration for long-lived workflows rather than assuming future odo fixes.

## Read the deploy command before inspecting the cluster

`odo deploy` looks for the default command in the Devfile's `deploy` group. A typical command is a composite that invokes several child commands:

```yaml
schemaVersion: 2.2.0
metadata:
  name: inventory-api
components:
  - name: api-image
    image:
      imageName: registry.example.com/apps/inventory-api
      dockerfile:
        uri: Dockerfile
        buildContext: .
      autoBuild: false
  - name: runtime
    kubernetes:
      uri: deploy/runtime.yaml
      deployByDefault: false
commands:
  - id: build-image
    apply:
      component: api-image
  - id: apply-runtime
    apply:
      component: runtime
  - id: deploy
    composite:
      commands:
        - build-image
        - apply-runtime
      group:
        kind: deploy
        isDefault: true
```

The `build-image` apply command builds the image and pushes it to the configured registry. The `apply-runtime` command applies every object represented by `deploy/runtime.yaml`; it is not limited to Deployments and Services. That file might contain an Ingress, ConfigMap, Secret, service account, role binding, PVC, or a custom resource.

Image and Kubernetes components can also be applied implicitly. An image with `autoBuild: true`, or with the field unset and no apply command referencing it, is built automatically. Kubernetes and OpenShift components follow the corresponding `deployByDefault` behavior. A component explicitly set to `false` and not referenced by an apply command is not applied. Review both the deploy composite and these component-level defaults when explaining what a run created.

An `exec` command in the deploy group is different from an ordinary long-running application container. odo creates a Kubernetes Job to run the command through `/bin/sh`. Its name follows `<component-name>-app-<command-id>` with length trimming when necessary, and it can retry once after a failure. odo sets `ttlSecondsAfterFinished` to 60 seconds when it creates the Job and also attempts to delete the Job after the command completes or fails. The TTL is a backup if explicit deletion does not happen or fails. A Job left behind may therefore still be active or retrying, or it may indicate interruption or a cluster cleanup problem.

Exec commands can call Helm, Kustomize, or a custom deployment script. Those tools can create resources that odo never sees directly. Unless the downstream tool propagates odo's labels or maintains its own release inventory, `odo delete component` might not find everything it created. Treat every such command as a separate ownership boundary with an explicit uninstall procedure.

## Separate Kubernetes objects from registry artifacts

An image component has two categories of output:

- local build work performed through Podman or Docker; and
- an OCI image pushed to an external registry.

When an image name is relative, odo can use its configured image registry and generate a unique tag. It can also substitute the resulting image reference into standard Kubernetes workload manifests. The pushed image is not a Kubernetes object, however, and the documented component-deletion flow does not promise to remove remote tags or manifests.

Use the container registry's retention policy, repository API, or signed release process to manage those artifacts. Do not infer that deleting a Deployment, or even deleting the whole odo component, reclaimed the registry storage. Conversely, do not delete a digest merely because one Kubernetes namespace no longer references it; another environment may be using the same immutable image.

## Inventory the component through odo first

Before using raw `kubectl`, confirm the context and namespace:

```bash
kubectl config current-context
kubectl config view --minify --output 'jsonpath={..namespace}'
```

An empty namespace in the second result generally means the client default applies. Pass the intended namespace explicitly in subsequent commands so that a context change cannot redirect cleanup.

odo's own inventory is the safest starting point:

```bash
odo list --namespace dev-team
odo describe component \
  --name inventory-api \
  --namespace dev-team
```

`odo list` shows components and their running mode. `odo describe component` can inspect a named component using labels and annotations even when the original Devfile is unavailable. Record the exact component name, namespace, and whether the objects are marked for `Deploy` or `Dev` mode.

odo labels its managed resources. Useful selectors include:

- `app.kubernetes.io/managed-by=odo`
- `app.kubernetes.io/instance=<component-name>`
- `component=<component-name>`
- `odo.dev/mode=Deploy`

Start with a read-only query:

```bash
kubectl get deployment,service,ingress,job,cronjob,pvc,configmap,secret \
  --namespace dev-team \
  --selector 'app.kubernetes.io/managed-by=odo,odo.dev/mode=Deploy' \
  --show-labels
```

Then narrow it to the instance:

```bash
kubectl get deployment,service,job,pvc \
  --namespace dev-team \
  --selector 'app.kubernetes.io/instance=inventory-api,odo.dev/mode=Deploy' \
  --show-labels
```

This list is illustrative, not exhaustive. `kubectl get all` is also incomplete: it does not mean every namespaced resource type, and it will not reveal arbitrary custom resources. Read the manifests and deployment scripts, identify every API kind they can create, and query those kinds explicitly. Cluster-scoped resources require a separate, especially careful review because their effect is not confined to one namespace.

## Prefer component-aware deletion

When the original Devfile is present, preview and run odo's component deletion in deploy mode:

```bash
odo delete component \
  --running-in deploy \
  --platform cluster
```

Without the Devfile, identify the component and namespace explicitly:

```bash
odo delete component \
  --name inventory-api \
  --namespace dev-team \
  --running-in deploy \
  --platform cluster
```

The interactive prompt is a useful safety barrier. Reserve `--force` for automation that has already verified the context, namespace, component name, and selected resources.

There is a subtle reason to retain the name-based form. The official deletion documentation warns that, when deletion is driven by the current Devfile, resources removed from that Devfile may no longer be discovered. Suppose version one contained `legacy-worker`, version two removed it, and then a developer ran deletion with version two. The stale worker can remain. Running outside the Devfile directory with the explicit component name lets odo locate attached resources from their metadata.

After deletion, repeat the read-only odo and `kubectl` inventories. Cleanup is complete only when the expected objects are gone and any external deployment system and image-retention records have also been reconciled.

## Diagnose why resources survived

Common causes of stale resources include:

- the Devfile metadata name changed, producing a second component identity;
- a command ran against a different Kubernetes context or namespace;
- `odo deploy` or `odo delete` was interrupted;
- a manifest or component was removed before deletion;
- a downstream Helm, Kustomize, or shell command created unlabelled objects;
- the caller lacked permission to list or delete one of the resource kinds; or
- a Kubernetes finalizer is waiting for a controller to complete cleanup.

Inspect a candidate before deleting it:

```bash
kubectl get deployment inventory-api \
  --namespace dev-team \
  --output yaml

kubectl describe deployment inventory-api \
  --namespace dev-team
```

Check labels, annotations, owner references, events, image references, and creation timestamps. Labels help select related objects, but they are not ownership. Kubernetes owner references drive garbage collection: deleting a Deployment normally allows the control plane to remove its ReplicaSets and Pods. Manually deleting every dependent Pod can obscure the real owner and accomplish nothing because the controller recreates it.

A resource stuck in `Terminating` may have finalizers. A finalizer is a request for a controller to finish cleanup before Kubernetes removes the object. Inspect which controller owns the finalizer and resolve the underlying failure. Stripping a finalizer by hand can leak infrastructure or corrupt controller state, so it should not be the routine odo cleanup technique.

## Use manual deletion as the precise fallback

If odo no longer recognizes an object but ownership is certain, delete the exact kind and name:

```bash
kubectl delete deployment inventory-api \
  --namespace dev-team

kubectl delete service inventory-api \
  --namespace dev-team
```

For a Helm command, prefer the recorded Helm release's uninstall operation. For an operator-managed custom resource, normally delete the top-level custom resource and allow its controller to handle dependents. For an image, follow the registry's policy and verify digest consumers first.

Avoid broad commands such as deleting a namespace or deleting every object with one generic label unless that complete scope is intentionally owned by this component and independently verified. They can remove shared Secrets, PVCs, or services, and they still may miss custom or cluster-scoped resources.

The durable fix is a deployment contract that can answer three questions: what does it create, how is every output identified, and what command reverses it? Version the manifest inventory alongside the Devfile, propagate stable labels through downstream tools, publish images under immutable digests, and test deletion in an isolated namespace. That turns cleanup from archaeology into a repeatable operation.

## Official Documentation

- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement/)
- [odo deploy command reference](https://odo.dev/docs/command-reference/deploy/)
- [Deleting an odo component](https://odo.dev/docs/command-reference/delete-component/)
- [Listing odo components](https://odo.dev/docs/command-reference/list/)
- [Describing an odo component](https://odo.dev/docs/command-reference/describe-component/)
- [Devfile support in odo](https://odo.dev/docs/development/devfile/)
- [How odo works and labels resources](https://odo.dev/docs/development/architecture/how-odo-works/)
- [Kubernetes labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [kubectl delete reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
- [Archived odo GitHub repository](https://github.com/redhat-developer/odo)

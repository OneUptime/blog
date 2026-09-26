# How to Make kubectl rollout restart Pull Fresh Bytes—and Why Immutable Tags Are Safer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment, Container, Troubleshooting

Description: Reconcile rolling restarts with image pull policy, registry tag changes, cached content, and runtime image identity before adopting immutable release references.

---

A rolling restart replaces Pods using the Deployment's current template. It does not change the image reference or make a mutable tag represent a particular build. If the template says `api:staging` with `IfNotPresent`, replacement containers can use an image already cached on each node.

Separate three questions: did Kubernetes replace the Pods, what image reference did it request, and which image did each runtime start? Answering only the first question can leave a successful rollout running unexpected code.

## Inspect the template before restarting

Use a specific namespace and Deployment. The examples assume the application container is named `api`, and `app=api` uniquely selects this application's Pods.

```bash
ns=production
deployment=api
kubectl -n "$ns" get deployment "$deployment" -o json |
  jq '.spec.template.spec.containers[] | {name, image, imagePullPolicy}'
kubectl -n "$ns" get pods -l app=api -o wide
```

The [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/) describes the relevant behavior. `IfNotPresent` permits a locally present image. `Always` causes a registry resolution when the container starts; cached layers can still be reused. `Never` requires locally available content. Therefore, “fresh bytes” really means executing the current resolved image, not downloading every layer again.

Pull policy is defaulted when an object is created. Changing an existing image reference to `:latest` does not automatically change a previously defaulted `IfNotPresent` to `Always`. Inspect the stored field rather than inferring it from today's tag.

## Choose whether the policy or only the Pods must change

When a development workflow intentionally reuses a tag, explicitly configure `Always` in the source manifest. For an imperative diagnostic change, update only the intended container:

```bash
kubectl -n "$ns" patch deployment "$deployment" --type=strategic -p '
{"spec":{"template":{"spec":{"containers":[
  {"name":"api","imagePullPolicy":"Always"}
]}}}}'
kubectl -n "$ns" rollout status deployment/"$deployment" --timeout=5m
```

If that patch changes the Pod template, it already starts a rollout. An additional restart would create unnecessary overlap. If the policy was already `Always` and only the registry tag changed, use:

```bash
kubectl -n "$ns" rollout restart deployment/"$deployment"
kubectl -n "$ns" rollout status deployment/"$deployment" --timeout=5m
```

The [restart command](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/) initiates replacement through the workload controller. It does not bypass scheduling, quota, readiness, or rollout availability settings. Coordinate this change with the owner of the declarative configuration so reconciliation does not undo the policy.

## Check the containers that actually started

Inspect runtime status after replacement:

```bash
kubectl -n "$ns" get pods -l app=api -o json |
  jq -r '.items[] as $p |
    $p.status.containerStatuses[]? |
    select(.name == "api") |
    [$p.metadata.name, $p.metadata.creationTimestamp,
     .image, .imageID, (.ready | tostring)] | @tsv'
```

Compare the output with the approved build's registry metadata and the application's version endpoint. Include all serving Pods, not just the first new one. A readiness check establishes the condition that the application exposes; it does not establish that the intended release was deployed.

Do not blindly compare every `imageID` string with one top-level registry digest. Runtime formatting varies, and a multi-platform image index can resolve to a different platform-specific manifest on each architecture. Record the approved index and platform mappings in the release evidence. Docker's [image digest explanation](https://docs.docker.com/dhi/explore/security-concepts/digests/) distinguishes immutable content identity from a movable tag.

If the rollout stalls, describe an affected Pod and inspect image-pull events. `Always` can introduce a dependency on registry access during startup even when relevant layers are cached. Authentication, DNS, rate limits, and missing manifests require their own fixes.

## Make production releases reproducible

An immutable tag is a registry policy: the registry must reject moving that tag. A version-looking string such as `v2.4.1` is still mutable if the registry allows overwrites. Digest pinning makes the selected content explicit in the Deployment:

```bash
# Set APPROVED_IMAGE to your verified repository@sha256:<digest> reference.
: "${APPROVED_IMAGE:?Set an approved image reference}"
kubectl -n "$ns" set image deployment/"$deployment" "api=$APPROVED_IMAGE"
kubectl -n "$ns" rollout status deployment/"$deployment" --timeout=5m
```

Keep the old digest available for recovery and update the configuration repository through the normal release process. Pinning content does not authenticate its publisher; signature and provenance verification belong in the image admission or promotion process.

A registry tag can change between two replacement Pods starting, so `Always` alone cannot guarantee a uniform release. With an approved digest, the expected image is part of the reviewed change. A later rolling restart then recreates the same release, making restart and deployment separate operational decisions.

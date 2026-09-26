# How to Update a Deployment Image Safely with kubectl set image and Verify the Result

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Deployment, CI/CD

Description: Update one named Deployment container with an approved image, preview the change, bound rollout waiting, and verify both the stored template and running application.

---

`kubectl set image` changes an image reference in a workload's Pod template. A successful command means the API accepted the update. It does not mean the new containers are ready or that requests reach the intended application version.

Treat the command as the middle of a release procedure: select the target, inspect the change, submit it, and verify the resulting workload. The example uses one Deployment called `api` in the `production` namespace and an application container also called `api`.

## Establish the release owner and baseline

Serialize releases to this Deployment. If GitOps or another controller owns its image field, make the change in that controller's source of truth or follow the team's agreed emergency override procedure. Competing writers can replace your template while your command is waiting.

Inspect the target and its named containers:

```bash
kubectl config current-context
ns=production
deployment=api
kubectl -n "$ns" get deployment "$deployment" -o json |
  jq '{name:.metadata.name, uid:.metadata.uid,
       paused:(.spec.paused // false), strategy:.spec.strategy,
       containers:[.spec.template.spec.containers[] | {name,image}]}'
kubectl -n "$ns" rollout status deployment/"$deployment" --timeout=60s
kubectl -n "$ns" rollout history deployment/"$deployment"
```

Stop if the Deployment is paused or already unhealthy unless the release is explicitly intended to recover it. Save the current image reference and retained revision for recovery. A full manifest can contain sensitive literal environment variables, so treat any saved baseline as an access-controlled artifact.

The [set image reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/) accepts container-name/image pairs. Avoid `*=...` when a Pod includes sidecars that must retain their existing images.

## Preview one approved content change

Resolve and approve the image before deployment, preferably as a repository plus digest. Supply that reference from your release process:

```bash
: "${APPROVED_IMAGE:?Set repository@sha256:digest from the approved release}"
case "$APPROVED_IMAGE" in
  *@sha256:*) ;;
  *) echo 'Expected a digest-pinned image reference' >&2; exit 1 ;;
esac

kubectl -n "$ns" set image deployment/"$deployment" \
  "api=$APPROVED_IMAGE" --dry-run=server -o json |
  jq '.spec.template.spec.containers[] | {name,image}'
```

The shell check only recognizes the intended reference shape; registry availability, signature policy, architecture support, and digest correctness must be checked by the release pipeline. Server dry-run exercises API validation and applicable admission without persisting the patch. It does not schedule Pods or prove that nodes can pull and run the image. See [Kubernetes API dry-run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run).

If the stored image is already identical, `set image` may not change the template and no rollout is needed. Investigate why a restart is desired instead of manufacturing another image version.

## Submit and propagate failure to CI

Use a shell that exits when either operation fails:

```bash
set -euo pipefail
kubectl -n "$ns" set image deployment/"$deployment" "api=$APPROVED_IMAGE"
kubectl -n "$ns" rollout status deployment/"$deployment" --timeout=5m
```

The timeout bounds this client wait. It does not cancel the Deployment controller's work or automatically roll back the image. Choose the duration from observed startup and rollout behavior, then investigate failure conditions instead of repeatedly resubmitting the same update.

By default, [rollout status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/) follows the latest revision if another update occurs. A release controller can bind the wait to its verified revision using `--revision=N`; capturing that revision must include waiting for the Deployment controller to observe the submitted template. Reading an old revision annotation immediately after patching is insufficient.

## Verify desired and running state separately

First ensure the accepted template still selects your image:

```bash
kubectl -n "$ns" get deployment "$deployment" -o json |
  jq -e --arg expected "$APPROVED_IMAGE" '
    [.spec.template.spec.containers[] | select(.name == "api") | .image]
    == [$expected]'
```

Then inspect the application containers. This example assumes `app=api` uniquely identifies the Deployment's Pods; otherwise follow Pod owner references through its ReplicaSets.

```bash
kubectl -n "$ns" get pods -l app=api -o json |
  jq -r '.items[] as $p | $p.status.containerStatuses[]? |
    select(.name == "api") |
    [$p.metadata.name,.image,.imageID,(.ready|tostring)] | @tsv'
```

Compare runtime identities with the approved manifest for each node architecture, allowing for image-index versus platform-manifest digests and runtime-specific status formatting. Exercise the application's version endpoint and representative requests through its normal Service or ingress. Check error rate and latency during the observation window.

## Preserve a usable recovery path

If the new release is unhealthy, stop concurrent changes and inspect Deployment conditions, ReplicaSet events, Pod startup, and readiness. Recovery may use a retained good revision or an explicit known-good image digest. Check database and external configuration compatibility before selecting either path.

[Kubernetes Deployment history](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) records Pod-template revisions, not registry contents or every external dependency. Keep old images and compatible configuration available. Finally, reconcile the verified release with the configuration repository so the next routine sync preserves the image you just tested.

# How to Fix kubectl rollout undo When Mutable Tags Restore the Bad Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rollback, Container, Troubleshooting

Description: Recover from a rollback that restores a mutable image tag by locating the known-good digest, checking configuration compatibility, and verifying the replacement containers.

---

A Deployment rollback can succeed while restoring the wrong executable. The revision stores an image reference such as `registry.example.com/api:production`. If that tag now points to a bad build, restoring the old reference does not recover the old content.

The failure is especially confusing when some nodes cache an older image and others pull the newer one. The Deployment history looks correct, yet application versions differ across Pods. Start by comparing the stored references with runtime identities and the release system's records.

## Understand what undo restores

[Kubernetes Deployment rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment) restores a retained Pod template. It does not snapshot a registry tag's historical meaning. It also does not revert database migrations, external services, or the current contents of a referenced mutable ConfigMap or Secret.

Inspect the intended revision before another recovery attempt:

```bash
ns=production
deployment=api
revision=12
kubectl -n "$ns" rollout history deployment/"$deployment"
kubectl -n "$ns" rollout history deployment/"$deployment" --revision="$revision"
kubectl -n "$ns" get deployment "$deployment" -o json |
  jq '.spec.template.spec.containers[] | {name,image,imagePullPolicy}'
```

Suppose revision 12 used `api:production`, which originally resolved to build A. A later release moved that tag to build B. Revision 12 still says `api:production`; it does not contain a hidden pointer to build A.

Changing `imagePullPolicy` to `Always` will not recover A. It resolves the current tag, which is B. `IfNotPresent` is no recovery guarantee either: its outcome depends on node-local content. The [image policy documentation](https://kubernetes.io/docs/concepts/containers/images/) explains those distinct behaviors.

## Establish which content is actually serving

Use the selector that uniquely identifies this application's Pods:

```bash
kubectl -n "$ns" get pods -l app=api -o json |
  jq -r '.items[] as $p | $p.status.containerStatuses[]? |
    select(.name == "api") |
    [$p.metadata.name,$p.spec.nodeName,.image,.imageID,
     (.ready|tostring)] | @tsv'
```

Inspect an application version endpoint as well. A Pod can be Ready and still execute the defective release. Record the node architecture when comparing multi-platform images: a registry index digest and a platform-specific manifest digest are different identities, and `imageID` presentation depends on the runtime.

Use this evidence to distinguish the mutable-tag problem from a failed image pull, a rollout still replacing old Pods, or a configuration problem shared by both releases. Do not assume a particular node's cached image is trustworthy solely because requests to it currently succeed.

## Recover the approved good digest

Look in CI build outputs, signed release metadata, an artifact promotion record, or retained registry manifests. You need a verified mapping from the good release to an available image digest. Docker documents [digest-based identity](https://docs.docker.com/dhi/explore/security-concepts/digests/) and how it differs from a tag.

Verify that the old manifest and its referenced layers remain accessible to the cluster and that required architectures are present. If the registry garbage-collected the artifact and no trusted copy exists, moving a tag cannot recreate it. Restore an archived artifact through the normal trust process or build and test a forward fix.

Choose the recovery scope deliberately. Updating only the image leaves the current template's environment, volumes, commands, and probes intact. Restoring an older whole template may be necessary if those fields are incompatible with the good image. Prepare the complete intended template in your configuration repository when multiple fields must change together; avoid briefly deploying a known-bad mutable tag as an intermediate step.

## Apply the chosen recovery and verify it

For an image-only recovery whose remaining template is compatible:

```bash
set -euo pipefail
: "${GOOD_IMAGE:?Set the verified repository@sha256:digest}"
kubectl -n "$ns" set image deployment/"$deployment" "api=$GOOD_IMAGE"
kubectl -n "$ns" rollout status deployment/"$deployment" --timeout=10m
```

This is a new template change that selects the good content explicitly. Coordinate with GitOps and other release writers before applying it. The [set image command](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/) targets the named container; it does not restore the rest of an old revision.

Check all serving application containers, the desired image in the Deployment, readiness, representative requests, and error/latency signals. A failed wait requires diagnosis; the client timeout does not stop reconciliation. Keep the incident open if the workload is healthy but data compatibility or configuration recovery remains unresolved.

## Make the next rollback deterministic

Store approved digest references in release manifests and retain previous artifacts for the recovery period. If your workflow also uses version tags, enforce tag immutability in the registry. Naming a tag `v1.2.3` alone does not enforce that rule.

Version external configuration when rollback depends on its old contents, and use a migration approach that permits the intended recovery window. Rehearse rollback after nodes with empty image caches join the cluster. That test reveals whether recovery depends on reproducible artifacts or on an accidental cache left by the last successful release.

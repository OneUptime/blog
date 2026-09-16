# How to Prevent an Older Drone Build from Deploying After a Newer Commit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Kubernetes, CI/CD, Deployment, DevOps

Description: Reject stale Drone deployment requests with a monotonic build marker and an atomic Kubernetes resource-version check.

Build 201 starts first, but its integration tests are slow. Build 202 finishes and deploys. When 201 finally reaches production, an ordinary deployment command can replace the newer image with the older one.

A one-at-a-time pipeline prevents overlapping execution, but it does not by itself express which release is still eligible. Put the ordering decision at the deployment target and update that decision atomically with the desired image.

## Define the ordering boundary

The following example is deliberately narrow: one Drone repository, one protected push branch, and one Kubernetes Deployment with one application container at index zero. Each candidate has already produced a trusted immutable image digest. The Drone build number is the ordering key within that repository and branch.

Do not compare build numbers from unrelated repositories. Do not treat the number of a newly created rollback or promotion execution as the age of its source artifact. Broader deployment workflows need a separate, authoritative deployment-request sequence and explicit rollback policy.

The target Deployment carries an annotation, `ci.example.com/source-build`, recording the highest accepted candidate. Accepting a request means updating desired state, not proving a healthy rollout. Keeping that distinction prevents an old request from slipping through while a newer rollout is still progressing.

## Compare and patch one Kubernetes object

Kubernetes exposes a resource version for optimistic concurrency. Read the Deployment, reject older or equal build numbers, then send a JSON Patch that tests the observed version before changing both the image and annotation. Another writer changing the object invalidates the test.

Save this as a reviewed deployment helper and supply its arguments from trusted build metadata and a verified artifact manifest:

```python
import json
import subprocess
import sys
import time

context, namespace, deployment, number, image = sys.argv[1:]
build = int(number)
if build <= 0 or '@sha256:' not in image:
    raise SystemExit('positive build number and immutable digest required')

base = ['kubectl', '--context', context, '--namespace', namespace]
key = 'ci.example.com/source-build'
for attempt in range(5):
    current = json.loads(subprocess.check_output(
        base + ['get', 'deployment', deployment, '-o', 'json'], text=True))
    annotations = dict(current['metadata'].get('annotations') or {})
    previous = int(annotations.get(key, '0'))
    if build <= previous:
        print(f'skipped: candidate {build}, accepted {previous}')
        raise SystemExit(0)
    annotations[key] = str(build)
    patch = [
        {'op': 'test', 'path': '/metadata/resourceVersion',
         'value': current['metadata']['resourceVersion']},
        {'op': 'add', 'path': '/metadata/annotations', 'value': annotations},
        {'op': 'replace', 'path': '/spec/template/spec/containers/0/image',
         'value': image},
    ]
    result = subprocess.run(
        base + ['patch', 'deployment', deployment, '--type=json',
                '-p', json.dumps(patch)],
        text=True, capture_output=True)
    if result.returncode == 0:
        print(f'accepted build {build}')
        break
    # Re-read on any failed patch, but never retry indefinitely.
    if attempt == 4:
        raise SystemExit('deployment patch failed after five attempts')
    time.sleep(0.2 * (attempt + 1))
```

This uses the [Kubernetes API's conditional update semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/) and the documented [`kubectl patch` interface](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/). The resource-version test and the changes are one patch request. There is no separate marker write that can succeed while leaving the image unchanged.

The container-index assumption matters. Adapt the helper to locate and verify the intended container by name before using it with sidecars. The digest check is only a basic shape check; trust, signature verification, registry restrictions, and exact digest validation belong to artifact admission.

## Understand the two possible races

If 201 patches first, 202 observes the newer resource version, sees the lower accepted number, and advances the target to 202. If 202 patches first, 201 either observes its marker and skips or fails its stale resource-version test, re-reads, and skips.

An API timeout can leave the client uncertain whether the patch committed. Re-reading handles that case: an equal marker means the request has already been accepted. It does not mean a rollout has completed. A separate observer should verify convergence, especially after an uncertain response.

Metadata changes by another controller can also invalidate the test. Bounded retries tolerate that contention while authentication, admission, and persistent API errors ultimately fail the job. Record sanitized error details in your deployment system for diagnosis.

## Protect the invariant and verify rollout

Restrict deployment credentials to the protected execution path. Every writer changing this application image must preserve the ordering annotation and follow the same rule. A manual patch, GitOps controller, or another CI system that ignores the marker can defeat the guarantee. Choose one owner for desired state or implement ordering in that owner's reconciliation logic.

After acceptance, monitor the Deployment's rollout and application health separately. A failed newer deployment must enter an explicit recovery workflow; quietly allowing an old queued build to replace it makes the outcome timing-dependent.

A deliberate rollback should be a newer authorized deployment operation referencing an older image, with an ordering model designed for that use. Do not casually delete the marker to bypass the check. Keep an audit record of accepted, skipped, failed, and rollback requests, and test the two arrival orders before enabling automatic production deployments.

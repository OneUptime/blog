# Add imagePullSecrets Without Duplicating ServiceAccount References

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps

Description: Append only missing Pod pull-secret references, preserve ServiceAccount defaults and user choices, and keep credential material out of admission logic.

A webhook injects a container from a private registry and adds its pull secret. The Pod's ServiceAccount already supplies the same reference, so the resulting list contains duplicates. A more serious variation replaces the entire list and removes credentials needed by the application's original containers.

The fix is a small, deliberate operation: inspect the pull-secret references already present on the admitted Pod, preserve them, and append only missing names required by the injector's approved policy. Do not fetch and copy credential contents merely to add a reference.

## Understand the ServiceAccount default

A ServiceAccount can list image pull secrets for Pods that use it. However, this is not a continuously synchronized union of ServiceAccount and Pod lists. In the [Kubernetes v1.35 ServiceAccount admission source](https://github.com/kubernetes/kubernetes/blob/v1.35.0/plugin/pkg/admission/serviceaccount/admission.go), the copy occurs when the Pod's `imagePullSecrets` list has length zero.

Consequently, a Pod with an explicit nonempty list does not automatically receive every ServiceAccount entry. Changing the ServiceAccount later also does not retroactively rewrite already stored Pods. The [ServiceAccount configuration guide](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#add-imagepullsecrets-to-a-service-account) describes configuring this default for newly created Pods.

The upstream [v1.35 admission ordering](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/kubeapiserver/options/plugins.go) places ServiceAccount admission before the mutating webhook stage. Your webhook should work from the object it receives, including defaults already applied, rather than reconstructing the original manifest. Verify behavior against the admission chain in your environment.

| Pod input | Built-in ServiceAccount behavior | Injector responsibility |
|---|---|---|
| Missing or empty pull-secret list | Copy the ServiceAccount's references. | Preserve that result and add only missing policy entries. |
| Nonempty explicit list | Keep the Pod's list rather than automatically merging defaults. | Preserve explicit references; add only what the injector owns. |
| Injector reference already present | No special ownership can be inferred from the name. | Return no additional operation for that reference. |

## Start with named references, not credentials

This ServiceAccount example uses Kubernetes v1.35 fields. Assume that `application-pull` already exists in the `payments` namespace through your normal secret-management process:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: billing
  namespace: payments
imagePullSecrets:
  - name: application-pull
```

A newly created Pod using `serviceAccountName: billing` and no explicit pull-secret list can receive that reference. If your injected container requires `platform-pull`, provision that Secret in the same namespace before enabling injection there.

Kubernetes pull-secret references are [namespace-local](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/). A Secret with the same name in a platform namespace does not satisfy a reference in `payments`. Also distinguish image-pull credentials from a ServiceAccount token: the latter represents an identity for API access, as explained in the [ServiceAccount overview](https://kubernetes.io/docs/concepts/security/service-accounts/). Disabling token mounting is not a mechanism for managing registry credentials.

## Generate a minimal patch

The following helper uses Python 3.11. It accepts the admitted Pod and an ordered sequence of required Secret names selected by trusted server configuration. It does not accept arbitrary names from an untrusted annotation as an authorization decision.

Save it as `pull_secrets.py`:

```python
def missing_pull_secret_patch(pod, required_names):
    spec = pod.get("spec")
    if not isinstance(spec, dict):
        raise ValueError("expected Pod spec object")
    existing = spec.get("imagePullSecrets")
    if existing is not None and not isinstance(existing, list):
        raise ValueError("imagePullSecrets must be a list")

    seen = set()
    for entry in existing or []:
        if not isinstance(entry, dict):
            raise ValueError("pull-secret reference must be an object")
        name = entry.get("name")
        if not isinstance(name, str) or not name:
            raise ValueError("pull-secret reference needs a name")
        seen.add(name)

    additions = []
    for name in required_names:
        if not isinstance(name, str) or not name:
            raise ValueError("configured pull-secret name must be nonempty")
        if name not in seen:
            additions.append({"name": name})
            seen.add(name)
    if not additions:
        return []
    if existing is None:
        return [{"op": "add", "path": "/spec/imagePullSecrets", "value": additions}]
    return [
        {"op": "add", "path": "/spec/imagePullSecrets/-", "value": entry}
        for entry in additions
    ]
```

The helper creates the parent list only when it is absent or null. Otherwise, each operation appends to the existing list. It neither reorders entries nor removes an existing duplicate that another actor supplied. Its contract is to avoid introducing duplicates, not to normalize fields it does not own.

The `seen` set includes each new addition immediately. That also prevents a repeated name in the configured policy from generating two operations. Validate configured names against Kubernetes naming rules when loading policy; the helper's basic checks are not a complete Secret-name validator.

The surrounding handler still needs resource and operation matching, error handling, and the AdmissionReview response envelope. Keep this helper limited to Pod creation unless you have explicitly reviewed update rules. A reference patch does not create the Secret or verify registry access.

## Check reinvocation with the updated object

A mutating webhook must tolerate being called again. Kubernetes documents [idempotence and reinvocation](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#reinvocation-policy): applying the same desired transformation again should not keep adding changes.

With `jsonpatch==1.33` installed, this local example applies the helper's patch and calls the helper again on the result:

```python
import jsonpatch
from pull_secrets import missing_pull_secret_patch

pod = {"spec": {"imagePullSecrets": [{"name": "application-pull"}]}}
required = ["platform-pull", "platform-pull"]
patch = missing_pull_secret_patch(pod, required)
result = jsonpatch.apply_patch(pod, patch, in_place=False)
assert result["spec"]["imagePullSecrets"] == [
    {"name": "application-pull"},
    {"name": "platform-pull"},
]
assert missing_pull_secret_patch(result, required) == []
print("Existing reference preserved; one new reference added")
```

The fixture represents the list visible after ServiceAccount defaulting; it does not execute that admission plugin. The [pinned JSON Patch implementation](https://pypi.org/project/jsonpatch/1.33/) applies the same operation format used by admission responses. This fixture is intentionally not a deployable Pod.

Add cases for absent, null, and empty lists; a required name already present; multiple required names; and preexisting duplicates. Verify that unrelated Pod fields remain unchanged. Repeat with sanitized inputs representing both ServiceAccount defaults and explicit Pod configuration.

## Keep policy and access boundaries clear

If your platform intentionally merges all ServiceAccount references into explicit Pod lists, make that a separate documented policy. The helper above does not do it. Such a policy needs a reliable view of the selected ServiceAccount and must handle lookup failure or stale cached data deliberately. Do not quietly turn a failed lookup into permission to use a broad fallback credential.

Adding a known Secret reference does not require the webhook to read its credential payload. Avoid granting broad Secret-reading privileges solely for this transformation. Provision and rotate credentials through the component responsible for their lifecycle, and restrict where injection is enabled.

For troubleshooting, inspect the stored Pod's Secret names, confirm the Secrets exist in that namespace, and test an actual pull on an uncached staging node. Keep credential contents out of logs and incident screenshots. A successful admission response proves only that the object was accepted; it does not prove the registry accepts the referenced credential or that the node trusts its certificate.

When retiring an injector, do not remove a pull-secret reference just because it matches the injector's preferred name. Another container may still need it. Treat removal as an ownership and usage review, while keeping the ordinary injection path a predictable append-if-missing operation.

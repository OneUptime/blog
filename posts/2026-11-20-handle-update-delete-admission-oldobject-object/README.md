# Handle UPDATE and DELETE Admission Requests with the Right Object

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Python, Reliability

Description: Route admission requests by operation, compare proposed updates with oldObject, and handle deletion without treating the stored resource as a mutable request.

A webhook written around CREATE requests often assumes that every AdmissionReview contains a new object to patch. That assumption breaks during deletion. It can also produce subtle update bugs when the handler compares the wrong snapshots or reapplies defaults that a user deliberately removed.

The fix starts with an explicit operation boundary. Decide whether you are inspecting an object being created, a proposed replacement for an existing object, or an existing object being deleted. Then give each path its own behavior.

The examples use **Kubernetes v1.35.0** and **Python 3.11**. They focus on ordinary core `v1` ConfigMaps, which makes before-and-after comparison easy to demonstrate. They are local handler components, not a complete webhook server.

## Read the admission operation, not the HTTP method

An AdmissionRequest's `operation` describes the operation Kubernetes is admitting. It can differ from the client's original request: an HTTP patch can lead to CREATE or UPDATE. The webhook receives the resulting object representation, not simply the user's original patch document.

For the ordinary resource operations covered here, use this table:

| Operation | `object` | `oldObject` | Main question |
|---|---|---|---|
| CREATE | Proposed object | Absent or null | What defaults or additions are appropriate? |
| UPDATE | Proposed new object | Existing object | What changed, and is the proposed result acceptable? |
| DELETE | Absent or null | Existing object | Should this deletion be allowed? |

These fields, the operation, and operation-specific `options` are defined in the [v1.35.0 AdmissionRequest API](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/admission/v1/types.go). DELETE options are not a replacement resource that your webhook can patch.

CONNECT and subresource requests need separate routing. For example, a request to a scale subresource does not necessarily carry the parent workload's object shape. Do not decode every matching request as a full Pod or ConfigMap simply because its URL concerns that resource family.

## Validate the route before choosing the snapshots

Keep the registration narrow: core `v1`, resource `configmaps`, the intended operations, and explicitly enrolled namespaces. This helper also checks the route defensively. It accepts the decoded `request` member after your HTTP layer has validated the AdmissionReview envelope and request UID.

```python
from copy import deepcopy


def configmap_inputs(request):
    if not isinstance(request, dict):
        raise ValueError("expected an AdmissionRequest object")
    if request.get("resource") != {
        "group": "", "version": "v1", "resource": "configmaps"
    } or request.get("subResource", "") != "":
        raise ValueError("unexpected resource route")
    if request.get("kind") != {"group": "", "version": "v1", "kind": "ConfigMap"}:
        raise ValueError("unexpected object kind")

    operation = request.get("operation")
    if operation not in {"CREATE", "UPDATE", "DELETE"}:
        raise ValueError("unsupported operation")
    before = request.get("oldObject")
    after = request.get("object")
    expected = {
        "CREATE": (False, True),
        "UPDATE": (True, True),
        "DELETE": (True, False),
    }[operation]
    for value, required in zip((before, after), expected):
        if not required:
            if value is not None:
                raise ValueError("unexpected object for operation")
        elif not isinstance(value, dict) or (
            value.get("apiVersion"), value.get("kind")
        ) != ("v1", "ConfigMap"):
            raise ValueError("missing or invalid ConfigMap snapshot")
    return operation, deepcopy(before), deepcopy(after)
```

The returned `before` and `after` values are copies. That makes it harder for downstream comparison code to accidentally modify the decoded request. Missing optional JSON members and explicit null both become `None`.

The helper intentionally rejects routes outside its contract. It does not silently allow an unexpected request, and it is not a complete Kubernetes schema validator. Your surrounding server should turn handled input problems into its documented admission error behavior rather than expose an unhandled Python traceback.

If you support equivalent API versions or additional resource kinds, extend the routing and decoding deliberately. Kubernetes carries both converted and originally requested kind/resource information where relevant; see its [admission request construction](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/request/admissionreview.go).

## Compare UPDATE snapshots without replacing the proposal

An update has two useful inputs. `oldObject` explains the previous state; `object` is the proposed state your mutation would modify. Do not fetch the resource again just to obtain the previous version: that adds a dependency and may give you a different observation from the snapshots supplied for this admission request.

For example, this small function identifies which textual ConfigMap entries changed. Save it beside the helper:

```python
def changed_data_keys(before, after):
    old_data = before.get("data")
    new_data = after.get("data")
    old_data = {} if old_data is None else old_data
    new_data = {} if new_data is None else new_data
    if not isinstance(old_data, dict) or not isinstance(new_data, dict):
        raise ValueError("data must be a map")
    missing = object()
    return sorted(
        key for key in old_data.keys() | new_data.keys()
        if old_data.get(key, missing) != new_data.get(key, missing)
    )
```

Call this only after routing an UPDATE. The private sentinel distinguishes a missing key from an existing key whose value happens to be empty. The output contains names of added, removed, and changed entries, not their values. Decide whether even those names are suitable for your logs. ConfigMaps can still contain sensitive operational information.

This function covers `data`, not `binaryData`, annotations, or the whole resource. ConfigMap fields are documented in the [ConfigMap concept guide](https://kubernetes.io/docs/concepts/configuration/configmap/). Expand the comparison only for fields your feature actually owns.

If a mutation is needed, build the patch against `after`. Do not serialize `before` as the replacement object: that can discard unrelated user edits. Also distinguish creation defaults from update enforcement. Reintroducing a removed optional field on every UPDATE can make it impossible for users to clear that setting.

Resource update restrictions still apply after your webhook runs. A valid JSON Patch does not make an otherwise forbidden resource change legal. Pod updates, for example, have [specific field restrictions](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement); do not reuse a create-time container injection routine indiscriminately on UPDATE.

## Treat DELETE as a decision, not a patch opportunity

On DELETE, inspect `oldObject` if your policy needs the existing resource's labels or ownership information. Return an allow or deny response without a mutation patch. There is no incoming resource object to mutate on that path. The [mutating dispatcher](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/mutating/dispatcher.go) rejects attempts to apply a nonempty patch to a nil object.

Do not perform irreversible cleanup while deciding admission. Another admission check can still reject the request, and a dry-run request must not carry out real cleanup. If deletion requires coordinated external work, design a controller and finalizer workflow with explicit ownership and recovery.

A finalizer keeps deletion pending while its owner completes cleanup. It must be arranged before deletion begins; Kubernetes does not permit adding new finalizers after the deletion timestamp is set. Never strip unfamiliar finalizers merely to make a webhook-related deletion succeed. The [finalizer lifecycle documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/) explains these boundaries.

## Exercise operation boundaries explicitly

Test CREATE with absent and null `oldObject`, UPDATE with both snapshots, and DELETE with absent and null `object`. Malformed combinations should fail clearly, rather than fall through to the CREATE path. Add cases for the wrong kind, a subresource, and an unsupported operation.

For updates, test an added key, a removed key, a changed value, an unchanged value, and an empty-string value. Verify that comparison and patch planning leave the original snapshots unchanged. For deletes, assert that the response has no patch or patch type, including when the existing object contains fields your CREATE handler normally changes.

The two Python helpers were exercised locally across those routing and comparison cases. No Kubernetes cluster requests or actual deletions were performed. Before rollout, repeat the relevant cases in a canary namespace and inspect the full AdmissionReview response, including its copied request UID.

Clear operation boundaries make the handler easier to reason about: compare before and after on UPDATE, mutate only the proposal, and make DELETE an explicit decision with cleanup handled by its proper owner.

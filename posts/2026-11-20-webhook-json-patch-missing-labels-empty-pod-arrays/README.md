# Write Webhook JSON Patches for Missing Labels and Empty Pod Arrays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, JSON, Python, Testing

Description: Build shape-aware webhook patches that preserve existing labels, handle absent or empty optional Pod lists, avoid duplicate entries, and pass local fixture tests.

A patch that works for your sample Pod can fail on a much smaller manifest. The sample might already contain `metadata.labels` and `spec.imagePullSecrets`; another workload may omit both. Appending to a list that does not exist is not the same operation as creating that list.

The fix is to build the patch from the object actually received by the webhook. This article uses Python 3.11 and Kubernetes **v1.35.0 API types** as a concrete reference, with local patch application through **jsonpatch 1.33**. It focuses on the mutation logic, not the HTTPS server or AdmissionReview response encoder.

## Decide what shape you are changing

JSON Patch operations address exact locations in a JSON document. The `add` operation can create an object member, but it cannot invent every missing parent in the path. For arrays, `/-` appends only when the parent is already an array. See [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902.txt).

These distinctions produce different patches:

| Incoming shape | Appropriate operation |
|---|---|
| `metadata` exists; `labels` is absent | Add `/metadata/labels` with the desired map |
| `labels` is an existing map | Add only the owned key, preserving other entries |
| Optional list is absent or null | Add the list field with a one-element array |
| Optional list is `[]` | Append to `/-`, or add the complete intended empty-to-one list |
| Optional list contains other entries | Append the new entry without replacing the list |
| Desired entry already exists | Return no operation for it |

Null handling is defensive behavior for local JSON input. Kubernetes may normalize omitted and null optional fields before admission; do not require every raw-input form to appear on the wire.

An empty list is not always a valid Kubernetes value. `spec.imagePullSecrets` is optional, while a Pod requires at least one application container. The [v0.35.0 PodSpec definition](https://github.com/kubernetes/api/blob/v0.35.0/core/v1/types.go) distinguishes those fields. A label injector should not invent a container to repair an invalid workload.

## Choose a narrow, explicit mutation

Our example has two responsibilities for opted-in Pod creation:

- Add `platform.example.com/managed: "true"` without replacing other labels.
- Ensure an existing registry Secret is referenced in `spec.imagePullSecrets` exactly once.

The label prefix is an example domain; use a prefix your platform owns. Labels can affect selectors, so agree on this label's meaning before rollout. Kubernetes describes label prefixes and selector behavior in [Labels and Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/).

The Secret name `registry-credentials` below is a placeholder for a pre-provisioned Secret in each selected namespace. A reference does not create credentials, grant access, or establish trust in a registry certificate. Image pull Secrets must exist in the Pod's namespace; see [image pull Secret requirements](https://kubernetes.io/docs/concepts/containers/images/#specifying-imagepullsecrets-on-a-pod).

At the admission boundary, match only core `v1` Pod `CREATE` requests with no subresource, in an opt-in scope. Pass the actual `request.object` to this builder. Do not apply it to a Deployment wrapper, a DELETE request, or an already running Pod update.

## Build small operations from the incoming object

Save the following as `pod_patch.py`. It returns operations without modifying its input. Conflicting ownership or malformed input raises an error for the caller to classify; it does not silently overwrite somebody else's policy.

```python
LABEL = "platform.example.com/managed"


def pointer_token(value):
    return value.replace("~", "~0").replace("/", "~1")


def build_patch(pod, secret_name):
    if not isinstance(pod, dict):
        raise ValueError("Expected a Pod object")
    if pod.get("apiVersion") != "v1" or pod.get("kind") != "Pod":
        raise ValueError("Expected a core v1 Pod")
    metadata, spec = pod.get("metadata"), pod.get("spec")
    if not isinstance(metadata, dict) or not isinstance(spec, dict):
        raise ValueError("Pod metadata and spec must be objects")
    containers = spec.get("containers")
    if not isinstance(containers, list) or not containers:
        raise ValueError("Pod must have at least one application container")
    if not isinstance(secret_name, str) or not secret_name:
        raise ValueError("A pre-provisioned Secret name is required")

    patch = []
    labels = metadata.get("labels")
    if labels is None:
        patch.append({"op": "add", "path": "/metadata/labels",
                      "value": {LABEL: "true"}})
    elif not isinstance(labels, dict):
        raise ValueError("labels must be a map")
    elif LABEL not in labels:
        patch.append({"op": "add",
                      "path": "/metadata/labels/" + pointer_token(LABEL),
                      "value": "true"})
    elif labels[LABEL] != "true":
        raise ValueError("Managed label conflicts with the approved policy")

    refs = spec.get("imagePullSecrets")
    item = {"name": secret_name}
    if refs is None:
        patch.append({"op": "add", "path": "/spec/imagePullSecrets",
                      "value": [item]})
    else:
        if not isinstance(refs, list) or any(
            not isinstance(ref, dict)
            or not isinstance(ref.get("name"), str)
            or not ref["name"] for ref in refs
        ):
            raise ValueError("imagePullSecrets must contain named references")
        matches = sum(ref["name"] == secret_name for ref in refs)
        if matches > 1:
            raise ValueError("Target Secret reference is already duplicated")
        if matches == 0:
            patch.append({"op": "add", "path": "/spec/imagePullSecrets/-",
                          "value": item})
    return patch
```

The existing-map branch escapes the label key before putting it into a path. In JSON Pointer, `/` separates path segments, so the slash inside the key must become `~1`; a literal tilde becomes `~0`. Escape the tilde first. These rules are defined in [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.txt).

For existing Secret references, the code searches by name but still emits positional JSON Patch syntax. The API's list merge metadata does not make JSON Patch understand `/imagePullSecrets/name=registry-credentials`. That would address a nonexistent location, not select an entry.

The code intentionally does not rebuild the whole Pod from a limited model. It changes only the owned label and Secret reference. Unknown fields, annotations, container settings, and existing references remain in the original object for the API server to retain.

## Execute the patch against a fixture

Install `jsonpatch==1.33` in your test environment. Its [tagged implementation](https://github.com/stefankoegl/python-json-patch/blob/v1.33/jsonpatch.py) provides `apply_patch`; it is a local test dependency, not a requirement for a webhook that only constructs operations.

```python
from copy import deepcopy
import jsonpatch
from pod_patch import LABEL, build_patch

# Local structural fixture; the image is a placeholder, not a deployment.
pod = {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "demo", "labels": {"team": "payments"}},
    "spec": {
        "containers": [{"name": "app", "image": "example.invalid/app:fixture"}],
        "imagePullSecrets": [],
    },
}
original = deepcopy(pod)
operations = build_patch(pod, "registry-credentials")
changed = jsonpatch.apply_patch(pod, operations, in_place=False)
assert pod == original
assert changed["metadata"]["labels"]["team"] == "payments"
assert changed["metadata"]["labels"][LABEL] == "true"
assert changed["spec"]["containers"] == pod["spec"]["containers"]
assert changed["spec"]["imagePullSecrets"] == [{"name": "registry-credentials"}]
assert build_patch(changed, "registry-credentials") == []
print("Patch application and repeat-run checks passed")
```

The final assertion tests idempotence: running the mutation again should not add another entry. Kubernetes recommends checking this property and avoiding assumptions about webhook invocation order in its [webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/#mutating-webhook-ordering-and-idempotence).

## Expand the test matrix before deployment

Run the same assertions for labels that are absent, null, empty, populated with unrelated keys, and already correct. Cross those with Secret references that are absent, null, empty, unrelated, and already present. Verify existing entries retain their values and order, not just that the new value exists.

Add negative cases for a conflicting managed label, a map where an array belongs, malformed reference entries, and an empty application-container list. Returning an exception is deliberate in this helper, but your admission handler must translate expected policy conflicts into a clear response rather than leaking a stack trace.

A patch is generated for one received object. Never cache and reuse an array-index patch across requests. If you later add operations that remove list elements, test index shifts after each preceding operation; successful tests for append-only behavior do not cover removal logic.

Finally, exercise the deployed webhook in a canary namespace with representative workload manifests. Local patch application proves JSON behavior, not namespace Secret availability, image pull success, authorization, certificate trust, or Kubernetes field validation. Keep those acceptance checks separate so a passing patch test cannot conceal a broken workload rollout.

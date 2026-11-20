# Escape JSON Patch Paths for Kubernetes Labels and Annotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Python, Automation

Description: Escape JSON Pointer tokens correctly, preserve annotation values and sibling keys, and preview a Kubernetes JSON Patch without confusing path and JSON encoding.

An annotation key such as `platform.example.com/profile` is one map key. A JSON Patch path written as `/metadata/annotations/platform.example.com/profile` instead asks for nested keys. That small difference can turn an otherwise correct mutation into a missing-path error.

The fix is to encode each path token, not the entire path and not the annotation value. This tutorial uses **Python 3.11**, **jsonpatch 1.33**, and the **Kubernetes v1.35.0** API as its example baseline. All live object names below are illustrative.

## Separate path syntax from metadata syntax

JSON Patch identifies fields with JSON Pointer paths. In a pointer token, a tilde becomes `~0` and a slash becomes `~1`. The slashes between tokens remain separators. These rules come from [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901).

| Raw token | Encoded token |
|---|---|
| `platform.example.com/profile` | `platform.example.com~1profile` |
| `a~b` | `a~0b` |
| `~1` | `~01` |
| `a/b~c` | `a~1b~0c` |

Only the first row is a realistic Kubernetes label or annotation key. Kubernetes permits a DNS-style prefix separated from a name by one slash; the name has its own character restrictions. A tilde is not valid in those metadata keys. The other rows exercise a general JSON Pointer encoder, not valid metadata examples. Check the [label key rules](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set) and [annotation key rules](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/#syntax-and-character-set).

Escaping cannot make an invalid Kubernetes key valid. It only tells a JSON Patch implementation which JSON key you mean.

## Encode tokens once, in the correct order

Save this helper as `pointer.py`:

```python
def pointer(*tokens):
    if any(not isinstance(token, str) for token in tokens):
        raise TypeError("JSON Pointer tokens must be strings")
    return "".join(
        "/" + token.replace("~", "~0").replace("/", "~1")
        for token in tokens
    )


assert pointer("metadata", "annotations", "platform.example.com/profile") == (
    "/metadata/annotations/platform.example.com~1profile"
)
assert pointer("~1") == "/~01"
assert pointer() == ""
```

Replacing tildes first prevents a newly created `~1` slash escape from becoming `~01`. Pass original keys into the helper, not already escaped keys. Re-encoding an encoded token changes its meaning.

The zero-token result is the pointer to the entire document, not a child field. The metadata examples always supply three tokens. If you need an array index elsewhere, pass its decimal string deliberately rather than letting the helper guess whether a number is a field name or an index.

## Build a patch without hand-writing JSON strings

For a local exercise, save this small object as `object.json`. It has an existing annotation map so the next patch can address one key directly.

```json
{
  "apiVersion": "v1",
  "kind": "ConfigMap",
  "metadata": {
    "name": "profile-demo",
    "namespace": "team-canary",
    "annotations": {"owner.example.com/team": "platform"}
  },
  "data": {"message": "unchanged"}
}
```

Save the following as `make_patch.py` beside `pointer.py`:

```python
import json
from pointer import pointer

operations = [{
    "op": "add",
    "path": pointer("metadata", "annotations", "platform.example.com/profile"),
    "value": "path/a~b",
}]

with open("patch.json", "w") as stream:
    json.dump(operations, stream, indent=2)
    stream.write("\n")
```

Run it with Python 3.11. The resulting path ends in `platform.example.com~1profile`, while the value remains the literal string `path/a~b`. Annotation values do not use pointer escaping.

Use the JSON serializer for quotes, backslashes, and string encoding. Python's [`json.dump` documentation](https://docs.python.org/3.11/library/json.html) explains this serialization layer. Pointer escaping and JSON string escaping solve different problems; neither is URL percent-encoding.

This example deliberately assigns a value to one owned key. `add` replaces that key's value if it already exists. If your policy is default-only, first inspect the incoming object and return no patch when an explicit value is already present.

## Apply the patch locally before touching a cluster

In an isolated Python 3.11 environment with `jsonpatch==1.33` installed, run this after generating `patch.json`:

```python
import json
import jsonpatch

with open("object.json") as stream:
    original = json.load(stream)
with open("patch.json") as stream:
    operations = json.load(stream)

result = jsonpatch.apply_patch(original, operations, in_place=False)
annotations = result["metadata"]["annotations"]
assert annotations["platform.example.com/profile"] == "path/a~b"
assert annotations["owner.example.com/team"] == "platform"
assert result["data"] == original["data"]
assert "platform.example.com/profile" not in original["metadata"]["annotations"]
print(json.dumps(result, indent=2))
```

Expect the new annotation beside the existing one and unchanged ConfigMap data. This uses the pinned [jsonpatch implementation](https://github.com/stefankoegl/python-json-patch/blob/v1.33/jsonpatch.py). It does not contact Kubernetes or prove API validation.

## Handle missing parents separately

A correctly escaped key still fails if `metadata.annotations` does not exist as a map. JSON Patch does not recursively create missing parent objects. If annotations are absent or null, add the whole map at `/metadata/annotations`. If the map exists, add just the escaped key path.

Do not always add the whole map: doing so replaces existing annotations, potentially removing another component's settings. The [JSON Patch operation semantics](https://www.rfc-editor.org/rfc/rfc6902) distinguish a missing member from replacing an existing one.

This is why a general webhook builds its patch from the exact incoming object. For an administrative patch against a live object, review the current state and use suitable UID or resource-version preconditions if the patch depends on that snapshot. An old local fixture is not a safe source of assumptions about production.

## Preview the API operation with the intended patch type

If an approved staging ConfigMap named `profile-demo` already exists in `team-canary` and has an annotation map, this command previews the one-key patch:

```bash
kubectl -n team-canary patch configmap profile-demo \
  --type=json --patch-file=patch.json \
  --dry-run=server -o yaml
```

The `--type=json` choice matters: JSON Patch is a list of operations, unlike merge patch documents. `--patch-file` avoids embedding JSON inside shell quoting. `--dry-run=server` asks the API server to evaluate the request without storing the change. These flags are documented in [`kubectl patch`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/).

Inspect the returned annotations and any admission-induced changes. This preview still requires authorization and can invoke admission webhooks. It is not a local syntax check. Do not remove the dry-run option until the target and intended overwrite behavior have been reviewed.

## Keep regression cases focused on meaning

Test that two different raw keys never collapse into the same pointer target. Include slash, tilde, literal escape-looking strings such as `~1`, quotes, Unicode, and empty tokens in generic JSON fixtures. Keep invalid metadata keys out of Kubernetes acceptance fixtures.

Then test the practical failure modes independently: missing annotation maps, preservation of sibling annotations, existing owned values, and unchanged input documents. When a request fails, distinguish pointer resolution from Kubernetes key validation, authorization, and admission rejection. Fixing the escape sequence only addresses the first of those layers.

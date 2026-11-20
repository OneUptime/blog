# Use Equivalent Webhook Matching Without Mixing API Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Python, Reliability

Description: Distinguish original and converted admission versions, register a supported payload contract, and test version-aware mutations with an HPA example.

A client submits one API version, but your webhook receives another. That can be correct behavior under `matchPolicy: Equivalent`. The API server can recognize the requested resource as equivalent to a rule you registered, convert it to a matching version, and call your handler with that representation.

The dangerous mistake is choosing your decoder or patch paths from the client's original version instead of the object actually delivered. A second mistake is assuming that `Equivalent` makes every payload arrive in one preferred version regardless of how you write the rules.

This article uses **Kubernetes v1.35.0**, **Python 3.11**, and the HorizontalPodAutoscaler, or HPA. An HPA adjusts a workload's replica count. Kubernetes v1.35.0 exposes HPA storage through both `autoscaling/v1` and `autoscaling/v2` when those resources are enabled, as shown in its [storage provider](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/registry/autoscaling/rest/storage_autoscaling.go).

## Separate matching from decoding

`Exact` matches the resource versions listed in the webhook's rules. `Equivalent` can also match another served representation of the same resource and deliver a representation covered by those rules. The latter is the default, but spelling it out makes the registration's intent easier to review. See the [match policy documentation](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-matchpolicy).

Suppose your handler understands HPA v2. This fragment belongs inside one existing `webhooks` entry:

```yaml
matchPolicy: Equivalent
rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["autoscaling"]
    apiVersions: ["v2"]
    resources: ["horizontalpodautoscalers"]
    scope: Namespaced
```

Keep the entry's service reference, trusted CA, review versions, side-effect declaration, and narrow namespace enrollment. The fragment does not match the HPA status subresource, because it lists the main resource only.

With this rule, a directly matching v2 request already has the handler's expected representation. An equivalent v1 request requires conversion for this webhook. However, if you change `apiVersions` to include both v1 and v2, a v1 request can match directly and arrive as v1. `Equivalent` is not an instruction to always prefer the highest version.

That distinction follows the [v1.35.0 matching implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/generic/webhook.go): direct rule matching is attempted before equivalent-resource matching. Register only versions your handler can actually decode.

## Identify three different versions

An admission exchange contains several version fields with different jobs:

| Field | Meaning |
|---|---|
| Outer `AdmissionReview.apiVersion` | Version of the admission protocol envelope |
| `request.kind`, `request.resource`, `object.apiVersion` | Representation delivered to the webhook |
| `request.requestKind`, `request.requestResource` | Original requested kind and resource when supplied |

For an HPA v1 request converted to v2, the relevant fields look like this. This is an illustrative excerpt, not a captured request or complete AdmissionReview:

```json
{
  "kind": {"group": "autoscaling", "version": "v2", "kind": "HorizontalPodAutoscaler"},
  "resource": {"group": "autoscaling", "version": "v2", "resource": "horizontalpodautoscalers"},
  "requestKind": {"group": "autoscaling", "version": "v1", "kind": "HorizontalPodAutoscaler"},
  "requestResource": {"group": "autoscaling", "version": "v1", "resource": "horizontalpodautoscalers"},
  "object": {"apiVersion": "autoscaling/v2", "kind": "HorizontalPodAutoscaler"}
}
```

Use the delivered kind/resource to select your mutation implementation. Keep the original request fields for context, debugging, or an explicitly designed policy decision. They may be absent, and they are not instructions to reinterpret the object as the older schema. The [AdmissionRequest API](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/admission/v1/types.go) defines these distinctions.

## Build a mutation with an explicit payload contract

Here is an illustrative policy for enrolled application namespaces: an HPA must allow at least two replicas, and its minimum is raised to two if lower. This changes workload capacity, so use it only where that requirement has been agreed. It is not a universal recommendation for every HPA.

The planner below expects an already validated AdmissionReview `request`. The surrounding server handles UID copying, response encoding, namespace scope, and turning handled policy conflicts into clear denials.

```python
def hpa_floor_patch(request):
    expected_kind = {"group": "autoscaling", "version": "v2",
                     "kind": "HorizontalPodAutoscaler"}
    expected_resource = {"group": "autoscaling", "version": "v2",
                         "resource": "horizontalpodautoscalers"}
    if request.get("kind") != expected_kind or request.get("resource") != expected_resource:
        raise ValueError("handler requires an autoscaling/v2 HPA")
    if request.get("subResource", "") or request.get("operation") not in {"CREATE", "UPDATE"}:
        raise ValueError("unexpected operation or subresource")
    obj = request.get("object")
    if not isinstance(obj, dict) or (
        obj.get("apiVersion"), obj.get("kind")
    ) != ("autoscaling/v2", "HorizontalPodAutoscaler"):
        raise ValueError("object does not match the delivered kind")
    spec = obj.get("spec")
    if not isinstance(spec, dict):
        raise ValueError("missing HPA spec")
    minimum = spec.get("minReplicas")
    minimum = 1 if minimum is None else minimum
    maximum = spec.get("maxReplicas")
    if type(minimum) is not int or type(maximum) is not int:
        raise ValueError("replica bounds must be integers")
    if minimum < 0 or maximum < max(2, minimum):
        raise ValueError("replica bounds conflict with the two-replica floor")
    if minimum >= 2:
        return []
    return [{"op": "add", "path": "/spec/minReplicas", "value": 2}]
```

The function intentionally ignores `requestKind` when choosing the schema. A converted v1 request and a direct v2 request should receive the same patch for equivalent delivered objects. A directly delivered v1 object is rejected by this handler rather than guessed at.

An absent minimum defaults to one in the HPA API. A maximum below the required floor is a conflict, not permission to silently raise the upper limit. These fields are defined in the [v2 HPA type](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/autoscaling/v2/types.go). The code is a focused planner, not a full HPA validator.

The JSON Patch `add` operation sets the object member whether it is absent or already exists. It requires the parent `spec` to exist, which the function checks. It leaves metrics, scaling behavior, target references, and metadata untouched. See [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902) for the operation's semantics.

## Test conversion boundaries, not just the version string

Local fixtures should include a delivered v2 object with original v1 metadata, a direct v2 request, and missing optional original-request fields. Confirm that the same delivered object produces the same patch. Add negative cases where the delivered kind, resource, or object's own version disagrees.

Exercise minimum values below, at, and above the floor, along with a conflicting maximum. Apply the patch to a copy and verify a second call returns no patch. Preserve advanced HPA fields in the fixture so the test detects accidental replacement of the entire spec.

These planner checks were executed locally using Python 3.11 and `jsonpatch==1.33`. They do not run Kubernetes conversion. A JSON fixture labelled v2 is not evidence that every v1-to-v2 conversion preserves every field.

For cluster acceptance, use a canary namespace and submit requests through both served endpoints. Record the delivered and original version identifiers, inspect the final object, and test updates from each supported client version. HPA v2 supports features beyond the older v1 API, so include the actual metrics and behavior configuration your workloads use; see the [HPA documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/).

## Keep the contract valid across API changes

Equivalent matching cannot resurrect an API version the server no longer serves. Keep webhook rules on supported versions and review them before cluster upgrades. A rule tied only to a removed version can stop covering requests you expected to match.

Custom resources add another layer: their version conversion may be performed by a separate conversion webhook. `matchPolicy` does not implement that conversion or make incompatible schemas interchangeable. Review the [CRD versioning and conversion contract](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/) and test its round trips separately.

The practical rule is simple: register a clear payload contract, check the representation you receive, and patch that representation. Original request metadata is valuable context, but the delivered object determines the schema your mutation must respect.

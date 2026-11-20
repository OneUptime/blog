# Kubernetes 1.36 Mutation Policies: ApplyConfiguration vs. JSONPatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Automation, Security

Description: Replace a small webhook with a scoped Kubernetes 1.36 mutation policy, compare merge and JSON Patch expressions, and test the migration without losing coverage.

A webhook that only supplies one default still needs a server, certificates, networking, and an availability plan. For a small mutation based on the admission request, Kubernetes can perform the calculation inside the API server instead.

**MutatingAdmissionPolicy is stable in Kubernetes 1.36 and enabled by default.** This article targets **v1.36.0** and its `admissionregistration.k8s.io/v1` API. Check your actual cluster's API discovery and administrator configuration before adopting it. Earlier releases have different maturity and API-version requirements. The [versioned policy guide](https://v1-36.docs.kubernetes.io/docs/reference/access-authn-authz/mutating-admission-policy/) is the starting reference.

The example supplies a default for one Pod field. It intentionally avoids external lookups, custom helper images, and changes to arrays so the difference between the two mutation styles stays visible.

## Choose a contract before choosing a patch style

Our contract is: in an enrolled namespace, a new Pod that omits `automountServiceAccountToken` receives `false`. An explicitly supplied `true` or `false` is preserved.

This is a default, not an enforcement policy. A workload can explicitly opt into a token. If your security requirement prohibits that, use a separately reviewed validation rule rather than describing this default as a prohibition.

Turning off automatic token mounting can break applications that call the Kubernetes API using their Pod's identity. Enroll a namespace only after reviewing those consumers. The Pod-level setting takes precedence over the ServiceAccount's setting, as described in the [service account configuration guide](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#opt-out-of-api-credential-automounting).

CEL means Common Expression Language. Here it reads fields from the incoming object and constructs the requested mutation. It is not a general-purpose script runner with arbitrary HTTP access. Kubernetes documents the [available CEL inputs, functions, and resource limits](https://kubernetes.io/docs/reference/using-api/cel/).

## Express the default as an apply configuration

Save this complete policy as `token-default-policy.yaml`:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionPolicy
metadata:
  name: token-default.example.com
spec:
  failurePolicy: Fail
  reinvocationPolicy: IfNeeded
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["pods"]
        scope: Namespaced
  matchConditions:
    - name: token-setting-is-absent
      expression: "!has(object.spec.automountServiceAccountToken)"
  mutations:
    - patchType: ApplyConfiguration
      applyConfiguration:
        expression: >
          Object{
            spec: Object.spec{
              automountServiceAccountToken: false
            }
          }
```

The condition makes explicit values ineligible. `CREATE` and the main `pods` resource keep the example away from Pod updates and subresources. `IfNeeded` allows reevaluation when relevant admission changes occur; the condition stops this default from repeatedly replacing an already present value.

An apply configuration describes the fields you want to contribute. Its CEL result uses `Object` constructors rather than a JSON string or a YAML fragment. Kubernetes merges that result using its schema-aware merge machinery. The [v0.36.0 apply-configuration implementation](https://github.com/kubernetes/apiserver/blob/v0.36.0/pkg/admission/plugin/policy/mutating/patch/smd.go) shows that this is a structured merge operation.

Do not infer that every list can be safely supplied as a partial value. Apply configurations cannot modify atomic structs, maps, or arrays through this mechanism. An atomic field is treated as a whole rather than as independently mergeable elements. Check the resource schema before converting an existing webhook that manipulates lists.

## Activate it only for an explicit cohort

A policy needs a binding to select where it applies. Save this as `token-default-binding.yaml`:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionPolicyBinding
metadata:
  name: token-default-canary
spec:
  policyName: token-default.example.com
  matchResources:
    namespaceSelector:
      matchLabels:
        platform.example.com/token-default: enabled
```

The binding refers to the policy by name. It does not reference a webhook Service or certificate. This example has no parameter resource, so it needs neither `paramKind` nor `paramRef`. Those fields are available when configuration needs to be separated from the expression itself; see the [v1.36 API definitions](https://github.com/kubernetes/api/blob/v0.36.0/admissionregistration/v1/types.go).

Keep namespace enrollment under the appropriate administrator's control. An opt-in selector is a rollout boundary, not a security boundary if the same users can freely change the enrollment label.

## Write the same change as JSON Patch

To compare the second style, replace only the `mutations` section in the policy above with this fragment. Do not create two active bindings just to compare results.

```yaml
mutations:
  - patchType: JSONPatch
    jsonPatch:
      expression: >
        [
          JSONPatch{
            op: "add",
            path: "/spec/automountServiceAccountToken",
            value: false
          }
        ]
```

The condition and scope remain unchanged. The CEL result is a list of typed `JSONPatch` operations. It is not the base64-encoded patch field used in a webhook response. Kubernetes evaluates and applies it internally; the [v0.36.0 JSON Patch implementation](https://github.com/kubernetes/apiserver/blob/v0.36.0/pkg/admission/plugin/policy/mutating/patch/json_patch.go) handles that conversion.

For this scalar field, both styles have the same intended result. JSON Patch becomes useful when you need precise paths and operations, but you take responsibility for those paths. An append path requires an existing array, and an array index identifies a position rather than a named container. Keys containing slashes or tildes require JSON Pointer escaping. These are [JSON Patch rules](https://www.rfc-editor.org/rfc/rfc6902), not conveniences automatically supplied by CEL.

| Decision | ApplyConfiguration | JSONPatch |
|---|---|---|
| Desired expression result | Typed object containing desired fields | List of typed operations |
| Main responsibility | Understand schema merge semantics | Understand paths and incoming structure |
| Small scalar default | Usually easy to read | Also straightforward |
| Array change | Inspect list topology and atomic restrictions | Handle parents, indices, and duplicates explicitly |

## Migrate without silently dropping behavior

Inventory the old webhook's actual behavior before replacing it. Include scope, explicit-value handling, error policy, reinvocation, and version matching. A default that looks identical on one clean Pod may behave differently on an object changed by another admission component.

Use a dedicated staging namespace and a small fixture matrix:

| Fixture | Expected result |
|---|---|
| Enrolled namespace, field omitted | Field becomes `false` |
| Enrolled namespace, explicit `true` | Value stays `true` |
| Enrolled namespace, explicit `false` | Value stays `false` |
| Unenrolled namespace | This policy makes no change |
| Reevaluate an already defaulted Pod | Condition no longer matches |

Submit server-side dry-run requests to compare returned objects before running real workloads. Dry run exercises admission without persisting the object, but it does not prove that an application can run without its token. The [API dry-run documentation](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run) explains that distinction.

Keep the old and new cohorts disjoint while comparing them. Otherwise, one mutator can mask a mistake in the other. Plan the selector transition so workloads do not unexpectedly lose required mutation coverage. Retain a reviewed way to restore the previous configuration; removing a binding does not undo fields on existing Pods.

Local checks for this article cover YAML shapes and CEL syntax, with the absence condition evaluated against fixtures. They do not constitute a Kubernetes 1.36 deployment test. Before retiring the old webhook, verify both patch styles on your API server, observe admission failures, and run representative workloads through a controlled rollout.

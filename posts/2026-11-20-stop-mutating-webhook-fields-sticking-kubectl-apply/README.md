# Stop Webhook Fields from Sticking Across kubectl apply Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Go, Automation

Description: Diagnose retained webhook fields by comparing apply history, live state and mutation behavior, then define explicit ownership and removal rules.

You remove an injection annotation from a manifest, apply the file, and still see the injected setting on the live object. That does not automatically mean the webhook ran again. Apply may have preserved a field that was never part of your declared configuration, or a later admission step may have restored it.

Those are different problems. First identify who retained or wrote the field; then change that component's contract. Repeatedly applying the same file or forcing field ownership is not a reliable cleanup strategy.

This walkthrough targets **Kubernetes and kubectl v1.35.0**. Its local merge example uses **Go 1.25.0** and **Kubernetes libraries v0.35.0**, without contacting an API server.

## Separate declared input from generated output

Consider a ConfigMap with an input annotation that enables a feature. A webhook adds a separate output annotation describing its selected profile. Later, the user removes the input annotation from the source file.

That change communicates something about the input, but it does not inherently define what should happen to the generated output. Decide whether omission means “use the default,” “leave the existing value alone,” or “disable and remove generated fields.”

Use different keys for user intent and generated state. If both user and webhook write the same key, it becomes harder to tell whether an existing value is an override or stale output. A version marker can help identify generated state, but it is not proof that all fields still match the generated configuration.

## Understand client-side apply's three inputs

Client-side apply compares the previously applied configuration, the new configuration, and the current live object. A field absent from both applied configurations can remain in the live object. Fields removed from the previous applied configuration are candidates for deletion. Kubernetes documents this in its [declarative configuration guide](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/).

For example:

| Location | Generated profile annotation |
|---|---|
| Previous applied file | Absent |
| New applied file | Absent |
| Live object after webhook mutation | Present |

Removing an entire previously declared annotation map can also behave differently from removing one key while retaining the map. A whole-map deletion can remove live sibling annotations. Inspect the calculated result rather than assuming every omission is a narrow key deletion.

Omitting that key again is not necessarily a deletion instruction. This is deliberate preservation of changes outside the applied configuration, not a cache that needs clearing.

Use these read-only commands for an illustrative staging ConfigMap named `profile-demo` in `team-canary`:

```bash
kubectl -n team-canary get configmap profile-demo -o yaml --show-managed-fields
kubectl -n team-canary apply view-last-applied configmap/profile-demo -o yaml
```

The first shows current state and managed fields; the second shows the client-side apply record when one exists. The flags are documented in [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [`view-last-applied`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/kubectl_apply_view-last-applied/). Do not manufacture or rewrite a missing apply history just to make an unwanted field disappear.

## Reproduce retention without a webhook

Save this as `main.go` in a disposable Go module with `k8s.io/api` and `k8s.io/apimachinery` pinned to `v0.35.0`:

```go
package main

import (
    "fmt"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/util/strategicpatch"
)

func main() {
    original := []byte(`{
      "apiVersion":"v1","kind":"ConfigMap",
      "metadata":{"name":"profile-demo"},
      "data":{"message":"before"}
    }`)
    modified := []byte(`{
      "apiVersion":"v1","kind":"ConfigMap",
      "metadata":{"name":"profile-demo"},
      "data":{"message":"after"}
    }`)
    current := []byte(`{
      "apiVersion":"v1","kind":"ConfigMap",
      "metadata":{"name":"profile-demo","annotations":{
        "platform.example.com/generated-profile":"standard"
      }},
      "data":{"message":"before"}
    }`)
    schema, err := strategicpatch.NewPatchMetaFromStruct(corev1.ConfigMap{})
    if err != nil { panic(err) }
    patch, err := strategicpatch.CreateThreeWayMergePatch(
        original, modified, current, schema, true,
    )
    if err != nil { panic(err) }
    result, err := strategicpatch.StrategicMergePatch(
        current, patch, corev1.ConfigMap{},
    )
    if err != nil { panic(err) }
    fmt.Println(string(patch))
    fmt.Println(string(result))
}
```

The result should change `data.message` to `after` and retain `platform.example.com/generated-profile`. No webhook was needed to produce that behavior.

This exercises the [strategic merge implementation](https://github.com/kubernetes/apimachinery/blob/v0.35.0/pkg/util/strategicpatch/patch.go), one part of the client-side apply path. It does not reproduce all kubectl bookkeeping, discovery, API defaulting, or admission. The tagged [kubectl patcher](https://github.com/kubernetes/kubectl/blob/v0.35.0/pkg/cmd/apply/patcher.go) provides the surrounding context.

## Check whether admission restores the field

If the client actually requests removal, a webhook matching UPDATE may add the field back. The handler sees the incoming object after patch processing, not merely the original YAML file. A missing field can look like a request for defaulting unless the mutation contract distinguishes disablement.

Conversely, a webhook registered only for CREATE will not clean up existing resources during UPDATE. Also, an unchanged client-side apply can calculate an empty patch and avoid sending an update request, so do not expect every apply command to trigger admission. Inspect the request and mutation evidence rather than assuming an invocation.

Review the webhook's [operation matching rules](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-rules). If cleanup on UPDATE is intended, define and test it explicitly. For example, an explicit disabled input can remove an owned generated annotation only when its identity and expected value still match your contract. Preserve unrelated annotations and report ownership conflicts instead of clearing an entire map.

## Treat server-side apply as a different ownership model

Server-side apply tracks field management in `metadata.managedFields` rather than relying only on the client-side last-applied annotation. Removing a field from a manager's desired configuration relinquishes its claim; whether the value disappears depends on other ownership and defaulting behavior. See the [server-side apply reference](https://kubernetes.io/docs/reference/using-api/server-side-apply/).

Do not assume every webhook appears as its own field manager. Inspect the actual entries and request path. Switching to `--server-side` is not a general command to remove all admission-generated fields, and `--force-conflicts` can transfer ownership without resolving the webhook's decision to restore a value.

Keep one documented management model for each field group. Migrating apply modes deserves its own reviewed change, not an incidental troubleshooting flag.

## Use an explicit cleanup and migration contract

For existing resources, choose a controlled migration when ordinary admission cannot safely express removal. Inventory the exact generated keys, expected values, versions, and target objects. Preview changes, protect against concurrent edits, and remove only fields you can establish are owned by the old behavior.

If the generated field changes a Pod's container layout, an in-place cleanup may be illegal. Update the owning workload template and use an appropriate replacement rollout. The [Pod update restrictions](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement) still apply regardless of who originally injected the field.

In staging, test enabled, disabled, omitted, user-overridden, and previously injected objects through both creation and update. Compare the pre-admission patch result with the returned object and the final stored state. Server-side dry runs help inspect admission results without persistence, but they do not establish a working workload rollout; see the [dry-run semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run).

The durable fix is a field ownership rule with a defined removal path. Once those are explicit, apply history and webhook behavior become evidence you can reason about instead of competing attempts to guess the user's intent.

# Switch a Mutating Webhook from Ignore to Fail with a Canary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reliability, Testing

Description: Move webhook failures from fail-open to fail-closed behavior using narrow canary scope, request-path checks, guarded changes, and a rehearsed recovery path.

Changing `failurePolicy: Ignore` to `Fail` is an availability change. Under Ignore, certain webhook call failures can leave a request proceeding without that mutation. Under Fail, those failures can reject the matching request. A webhook that looked harmless during an outage can suddenly block workload creation or updates.

The migration should therefore test the failure path, not merely confirm that healthy requests still work. Start with a small scope, prove that recovery remains possible, and expand only with evidence.

This guide uses **Kubernetes v1.35.0** semantics and **Python 3.11** for a guarded patch helper. All resource names are examples. The local checks described here did not change a cluster.

## Decide whether Fail is the right contract

`failurePolicy` controls errors calling the webhook, such as timeouts and connection failures. It does not convert an explicit `allowed: false` response into an allow. A functioning webhook can deny a request under either policy. The default policy is Fail; see the [failure policy documentation](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#failure-policy).

If the mutation is optional, making its availability a prerequisite for every matching workload may be unnecessary. If a final property is mandatory, consider separating an available mutation path from a validating policy that checks the resulting object. Kubernetes' [webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/) discuss failing open for mutation and validating final state where appropriate.

Record the intended tradeoff before changing anything. Which workloads may stop creating during a webhook outage? Who owns the recovery action? Which omitted mutations would need later reconciliation if you return to Ignore?

## Establish a canary scope first

Use a disposable application namespace with representative workloads. The webhook must exclude its own infrastructure and other namespaces needed to restore service. A webhook that blocks replacement Pods for itself can turn a small failure into a recovery loop.

If the existing registration already covers production, do not simply narrow it and accidentally remove existing coverage. One option is a separate canary entry with a disjoint namespace selector, while the original entry retains Ignore for the remaining enrolled namespaces. Ensure the selectors cannot both match the same test request. Keep the same reviewed handler version and mutation logic so the canary is meaningful.

An alternative is to rehearse the change in a staging cluster with the intended production scope. In either case, document which exact entry you will change. A configuration can contain multiple entries; changing an arbitrary array index is not sufficient identification.

## Prove readiness along the admission path

Check the service's EndpointSlices before moving to Fail. For an example service named `injector` in `platform-system`:

```bash
kubectl get endpointslices -n platform-system \
  -l kubernetes.io/service-name=injector -o yaml
```

Inspect addresses, ports, and endpoint conditions. EndpointSlices describe service backends and readiness, but they do not prove that the control plane can reach them. Read the [EndpointSlice condition documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) when interpreting terminating endpoints or a service that publishes unready addresses.

Then submit a valid, uniquely identifiable request that actually matches the canary entry. Confirm successful admission, the expected mutation, and a corresponding webhook request record. A Pod marked Ready or a successful laptop port-forward does not prove API-server-to-webhook routing and certificate trust.

Measure request latency under representative load. The webhook must finish comfortably inside its configured timeout, including certificate checks and any downstream dependency. An increased timeout is not a repair for unreachable endpoints.

## Prepare a guarded policy change

Save a fresh snapshot of the canary configuration. Replace `injector-canary` with the actual configuration name:

```bash
kubectl get mutatingwebhookconfiguration injector-canary -o json > current.json
kubectl auth can-i patch mutatingwebhookconfigurations.admissionregistration.k8s.io
```

The first command is read-only. The second checks the current identity's authorization; a `yes` is useful but does not guarantee that other admission controls will permit recovery. See the [get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [authorization check](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/) references.

Save the following as `policy_patch.py`. It creates a JSON Patch file from a reviewed snapshot and a named entry. It does not contact Kubernetes.

```python
import json
import sys

snapshot, name, expected, desired = sys.argv[1:]
if (expected, desired) not in {("Ignore", "Fail"), ("Fail", "Ignore")}:
    raise SystemExit("expected an explicit Ignore/Fail transition")
with open(snapshot, encoding="utf-8") as source:
    document = json.load(source)
entries = document["webhooks"]
matches = [index for index, entry in enumerate(entries) if entry["name"] == name]
if len(matches) != 1:
    raise SystemExit("expected exactly one named webhook")
index = matches[0]
if entries[index].get("failurePolicy") != expected:
    raise SystemExit("current policy does not match the reviewed transition")
version = document["metadata"]["resourceVersion"]
if not isinstance(version, str) or not version:
    raise SystemExit("snapshot has no resourceVersion")
base = f"/webhooks/{index}"
patch = [
    {"op": "test", "path": "/metadata/resourceVersion", "value": version},
    {"op": "test", "path": base + "/name", "value": name},
    {"op": "test", "path": base + "/failurePolicy", "value": expected},
    {"op": "replace", "path": base + "/failurePolicy", "value": desired},
]
print(json.dumps(patch, indent=2))
```

Generate the change for the actual webhook entry name, illustrated here as `injector-canary.example.com`. Proceed only if generation succeeds and the file contains the intended four operations:

```bash
python3 policy_patch.py current.json injector-canary.example.com Ignore Fail > to-fail.json
kubectl patch mutatingwebhookconfiguration injector-canary \
  --type=json --patch-file=to-fail.json
```

Run those steps separately so a failed generator is not followed by a patch attempt. The resource-version test rejects stale snapshots. The name and policy tests guard the selected entry. JSON Patch's `test` operation aborts on a mismatch; see [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902). The command uses the documented [kubectl patch options](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/).

Coordinate the change with the configuration's owner. If GitOps or an operator manages this object, update the desired configuration through that workflow or arrange an explicit maintenance exception. Otherwise reconciliation may immediately undo the canary change.

## Rehearse both success and failure

Agree on acceptance criteria before the exercise:

| Case | Required observation |
|---|---|
| Healthy matching request | Accepted with the expected mutation |
| Explicit policy denial | Rejected with a clear reason under both policies |
| Controlled webhook outage in isolated staging | Matching request rejected under Fail |
| Request outside the canary scope | Unaffected by this entry |
| Recovery action | Authorized operator can restore the intended policy |

Use an isolated staging endpoint or test deployment for the outage exercise. Do not take down a shared production webhook merely to demonstrate Fail behavior. Keep recovery tools, access, and instructions outside dependencies that the tested webhook can block.

## Revert deliberately and assess what was missed

For recovery, fetch a fresh `current.json`, generate the reverse transition with `Fail Ignore`, review it, and apply that new patch. Do not reuse the old resource version. If the tests fail, inspect the changed object and regenerate from a fresh reviewed snapshot; do not remove the safeguards blindly.

Returning to Ignore does not undo previous mutations, override an explicit denial, or repair objects admitted while the webhook was unavailable. Inventory affected workloads and use an approved reconciliation or rollout process where necessary. For security-sensitive requirements, a scoped pause in affected writes may be preferable to permitting incomplete objects.

Expand enrollment only after the canary demonstrates healthy requests, controlled failure, and recovery. The helper was tested locally against multi-entry fixtures, stale versions, reordered entries, and both transition directions. Cluster routing, outage behavior, authorization, and recovery remain tests to perform in your environment.

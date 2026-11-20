# Scope Mutating Webhooks Without Breaking System Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reliability, Security

Description: Combine namespace enrollment, protected namespace exclusions, and workload opt-in selectors to limit webhook impact and preserve recovery paths during an outage.

A webhook that mutates every Pod can become a dependency of the infrastructure needed to repair it. If its own replacement Pods require a successful call to that same unavailable webhook, a routine restart can turn into a recovery problem.

A useful boundary is explicit enrollment: platform owners enroll application namespaces, workload owners opt into the feature, and system namespaces remain outside its reach. This design is appropriate for an optional injection feature. It is not a security policy that users must be unable to bypass.

The examples use **Kubernetes v1.35.0** selector semantics. They show a matching fragment to incorporate into an existing, working webhook registration, not a complete webhook deployment.

## Separate namespace ownership from workload choice

Use two different labels for two different decisions:

| Label location | Example | Decision owner |
|---|---|---|
| Namespace | `platform.example.com/admission=enabled` | Platform team approves this namespace |
| Pod | `platform.example.com/injection=enabled` | Workload owner requests the optional mutation |

The names are examples; replace the domain prefix with one your organization controls. A Pod label does not satisfy a namespace selector, and a Namespace label does not become a label on its Pods.

Protect the webhook's own namespace regardless of accidental enrollment. Also review namespaces containing cluster networking, DNS, certificate management, and other dependencies needed for recovery. The exclusion list below is a starting point, not a complete list for every managed Kubernetes platform. Kubernetes recommends narrow filtering and avoiding self-mutation dependencies in its [webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/).

## Combine positive enrollment with explicit exclusions

Place this fragment inside the intended entry of your existing `webhooks` array:

```yaml
rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    scope: Namespaced
namespaceSelector:
  matchLabels:
    platform.example.com/admission: "enabled"
  matchExpressions:
    - key: kubernetes.io/metadata.name
      operator: NotIn
      values:
        - kube-system
        - kube-public
        - kube-node-lease
        - platform-system
objectSelector:
  matchLabels:
    platform.example.com/injection: "enabled"
```

Here `platform-system` is the example namespace hosting the webhook. Replace it with the real namespace and add other explicitly protected infrastructure namespaces. Preserve the entry's existing Service, certificate trust, review versions, and truthful side-effect declaration.

The namespace must have the enrollment label **and** pass the name exclusion. Label-selector requirements are combined with logical AND; the exclusion does not become an alternative route into the webhook. The Pod must also match `objectSelector`. See [label selector semantics](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors).

Kubernetes automatically gives each Namespace an immutable `kubernetes.io/metadata.name` label matching its name. That makes it useful for a name-based guard even if someone mistakenly adds your custom enrollment label to a protected namespace. See [automatic namespace labeling](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#automatic-labelling).

The rule explicitly targets namespaced Pod creation. A namespace selector does not filter arbitrary cluster-scoped resources such as Nodes. For Namespace objects themselves, it evaluates the object's labels. Do not generalize this fragment to wildcard resources and assume it protects everything in the same way. The [v1.35 namespace matcher](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/predicates/namespace/matcher.go) implements those distinctions.

## Make the effective scope visible before enrollment

First list the namespaces the selector would currently admit:

```bash
kubectl get namespaces \
  -l 'platform.example.com/admission=enabled,kubernetes.io/metadata.name notin (kube-system,kube-public,kube-node-lease,platform-system)' \
  --show-labels
```

This read-only query mirrors the example namespace selector. Update its exclusion list whenever you update the configuration. An empty result is expected before enrollment; unexpected namespaces should stop the rollout review.

Check the application Pods in one candidate namespace separately:

```bash
kubectl -n team-canary get pods \
  -l 'platform.example.com/injection=enabled' --show-labels
```

These queries inventory scope; they do not replay admission for existing Pods. The [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) documents selector and label-display options.

For an approved staging namespace, an authorized platform operator can enroll it with:

```bash
kubectl label namespace team-canary platform.example.com/admission=enabled
```

The command deliberately omits `--overwrite`. If the label already has another value, investigate that ownership conflict instead of silently changing it. The [kubectl label documentation](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/) explains overwrite and label-removal behavior.

Treat permission to change Namespace labels as part of the enrollment control. The label itself does not authenticate an administrator; Kubernetes authorization determines who may modify the Namespace.

## Put workload opt-in on the Pod template

For a controller-managed workload, add the opt-in label to the Pod template in the workload's source configuration. This is a fragment of a Deployment's `spec`, not a standalone Deployment:

```yaml
spec:
  template:
    metadata:
      labels:
        platform.example.com/injection: "enabled"
```

Merge it with the template's existing labels. Do not replace labels used by the Deployment's selector. A label only on the Deployment's top-level metadata does not opt its Pods into a Pod webhook.

Changing the Pod template can trigger a workload rollout. Plan that change as an application deployment, and observe the newly created Pods rather than expecting existing Pods to be rewritten. Kubernetes describes controller templates in its [Pod template documentation](https://kubernetes.io/docs/concepts/workloads/pods/#pod-templates).

The example registration handles only `CREATE`. If you later add `UPDATE`, remember that `objectSelector` matches when either the old or new object matches. Removing the opt-in label does not necessarily bypass that same update, and mutations must be valid for the update operation. See the [v1.35 object selector implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/predicates/object/matcher.go).

## Test the boundary as well as the positive case

In staging, verify the expected matrix with representative requests:

| Namespace and workload state | Expected eligibility |
|---|---|
| Enrolled application namespace, opted-in Pod CREATE | Eligible |
| Enrolled application namespace, Pod without opt-in | Excluded |
| Unenrolled application namespace, opted-in Pod | Excluded |
| Protected namespace, both custom labels present | Excluded by namespace name |
| Webhook's own namespace, opted-in Pod | Excluded by namespace name |
| Existing Pod UPDATE | Excluded by the CREATE-only rule |
| Node CREATE | Excluded by resource and scope rules |

Do not label real system namespaces just to prove the negative case. Use local configuration tests for those names and a representative isolated staging setup for operational tests. Compare the deployed selector with the reviewed file so an unrelated chart value cannot silently widen it.

A server-side dry run can check admission without storing a Pod, provided the webhook correctly supports dry-run behavior. A successful request alone is insufficient: an excluded request should succeed without invoking this webhook, while an eligible request should produce the intended mutation and corresponding handler evidence.

Also test a controlled webhook outage in the isolated environment. Confirm that protected infrastructure and replacement webhook Pods remain outside this registration's dependency path. Other admission webhooks can still affect those resources; this selector is not a blanket guarantee that all cluster operations remain available.

## Keep an enrollment rollback that does not require mutation

To stop future optional injections in the staging namespace, the platform owner can remove its enrollment label:

```bash
kubectl label namespace team-canary platform.example.com/admission-
```

Because this registration matches Pod creates rather than Namespace updates, it does not intercept that label-removal request itself. Other cluster policies still apply.

Wait for the effective scope change to be observed and confirm it with a new canary request. Removing enrollment does not remove injected containers, environment variables, or volumes from existing Pods. Any application rollback must separately restore the workload template and handle recreation safely.

Finally, keep mandatory security enforcement separate from a user-controlled object opt-in. This configuration deliberately lets application owners decline an optional feature. Clear ownership, explicit protected namespaces, and tests for excluded requests make that choice manageable without turning the webhook into a dependency of its own recovery.

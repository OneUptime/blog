# Exclude Namespaces Without Creating a Gatekeeper Bypass

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Namespaces, Security, Admission Control

Description: Exclude Kubernetes namespaces at the right Gatekeeper layer while preventing ordinary namespace editors from granting themselves a policy bypass.

---

Some system workloads need different policy. Excluding them safely requires deciding which Gatekeeper process should ignore them and who is allowed to create the exemption.

Gatekeeper has three distinct mechanisms:

1. A Constraint can exclude namespaces from that one policy.
2. Gatekeeper `Config` can exclude namespaces from selected processes.
3. The admission webhook can be skipped entirely for explicitly authorized namespaces.

They are not equivalent.

## Prefer a Constraint-level exclusion

If only one policy is incompatible with a system namespace, keep the exception local to that Constraint. This example assumes the matching `K8sRequiredLabels` ConstraintTemplate is already installed:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: workloads-must-have-owner
spec:
  enforcementAction: deny
  match:
    scope: Namespaced
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
  parameters:
    labels:
      - owner.example.com/team
```

This leaves every other Constraint active in those namespaces. It is usually the least powerful and easiest exception to review.

Set `scope: Namespaced` when using namespace matchers. Cluster-scoped objects do not belong to `kube-system`, so excluding that namespace does not protect operations on Nodes, ClusterRoles, custom resource definitions, or other cluster-scoped resources.

## Use namespace labels for positive selection

Positive selection often ages better than a growing exclusion list. Label namespaces that are ready for a policy:

```bash
kubectl label namespace production \
  policy.example.com/owner-label=enforced
```

Then use `namespaceSelector`:

```yaml
spec:
  match:
    scope: Namespaced
    namespaceSelector:
      matchLabels:
        policy.example.com/owner-label: enforced
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
```

Gatekeeper applies a namespace selector to the containing Namespace. When the reviewed object is itself a Namespace, the selector applies to that Namespace object.

Protect policy-selection labels by limiting Namespace update and patch permissions with RBAC. If users need broader Namespace-update access, enforce the labels with a separate admission policy because Kubernetes RBAC cannot restrict individual metadata fields. If application owners can freely remove an enforcement label from their Namespace, positive selection becomes a bypass.

## Use Config for process-specific exclusions

The singleton Gatekeeper `Config` can exclude a namespace across constraints, but only for named processes:

```yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  match:
    - excludedNamespaces:
        - kube-system
      processes:
        - audit
    - excludedNamespaces:
        - emergency-tools
      processes:
        - webhook
        - audit
```

The supported process names include `audit`, `webhook`, `sync`, and `mutation-webhook`. The wildcard `*` includes current and future processes, which makes it broader than it first appears.

Important effects:

- Excluding `audit` hides existing violations there.
- Excluding `sync` removes those objects from data available to referential policy.
- Excluding `webhook` is evaluated inside Gatekeeper, so the API server still calls the webhook.
- Excluding `mutation-webhook` prevents Gatekeeper mutations but not validation.

The `Config` resource is alpha and must be named `config` in Gatekeeper's installation namespace (`gatekeeper-system` for the default install). Gatekeeper ignores instances with another name or namespace.

## Use a webhook-level exemption only when required

Gatekeeper's default validating webhook uses a namespace selector that skips namespaces labeled:

```text
admission.gatekeeper.sh/ignore
```

If anyone who could label a Namespace could add that label, namespace-edit permission would become cluster policy bypass permission. Gatekeeper therefore runs a second namespace-label validating webhook and requires an operator to pre-authorize names or prefixes with flags such as:

```text
--exempt-namespace=kube-system
--exempt-namespace-prefix=platform-
```

With the Helm chart, use `controllerManager.exemptNamespaces` for exact names and `controllerManager.exemptNamespacePrefixes` for prefixes. Only then label the intended Namespace:

```bash
kubectl label namespace kube-system \
  admission.gatekeeper.sh/ignore="approved-platform-exemption"
```

The label value is informational; the presence of the label controls matching.

This exemption happens in the API server's webhook matching. Gatekeeper is not called for resources in that namespace, so a Gatekeeper outage does not delay those requests. The resources are still audited unless audit is separately excluded.

## Avoid broad wildcard exemptions

Prefix and suffix exemptions are operationally convenient but create future authorization. For example, authorizing `--exempt-namespace-prefix=kube-` permits the ignore label on any future Namespace with that prefix.

Use these controls:

- Require code review for exemption configuration.
- Keep the list explicit where practical.
- Restrict who can update or patch Namespace objects with RBAC, and use admission policy for label-specific controls.
- Record an owner, reason, and expiry in annotations.
- Alert on additions of `admission.gatekeeper.sh/ignore`.
- Recheck exemptions during cluster and add-on upgrades.

Do not exclude `kube-system` from every policy merely because it is a system namespace. Some policies, such as approved image registries, may be valuable there. Test each policy against actual add-on manifests.

## Test the boundary

Verify all three paths:

First, confirm that a normal namespace is still evaluated:

```bash
kubectl apply --dry-run=server -f violating-pod.yaml
```

Then confirm that the approved namespace behaves as designed:

```bash
kubectl -n kube-system apply --dry-run=server -f test-object.yaml
```

Finally, verify that an unapproved namespace cannot grant itself a bypass:

```bash
kubectl label namespace development \
  admission.gatekeeper.sh/ignore=test
```

Run the last command with the same identity used by a normal namespace administrator. It should be rejected unless that Namespace was explicitly authorized.

## Official documentation

- [Gatekeeper exempting namespaces](https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/)
- [Gatekeeper customizing admission behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper Constraint matching](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Kubernetes admission webhook request matching](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-namespaceSelector)

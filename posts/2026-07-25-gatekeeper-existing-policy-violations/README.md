# Why Gatekeeper Blocks New Resources but Misses Existing Policy Violations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Audit, Admission Control, Compliance

Description: Understand the forward-looking admission path, the separate audit path for stored resources, and why Gatekeeper does not remediate violations.

---

Gatekeeper admission and Gatekeeper audit answer different questions:

- Admission asks whether a current API request should be allowed.
- Audit asks which stored objects currently violate policy.

A `deny` Constraint can reject a new Pod immediately and still leave older non-compliant Pods running. That is expected behavior, not evidence that the policy is inconsistent.

## Admission is not a retroactive scan

Kubernetes calls validating admission webhooks for matching API operations. Gatekeeper's default validating webhook configuration covers create and update operations. An object that is already stored does not pass through admission again just because a new Constraint was created.

The next meaningful update to that object may be denied, even when the changed field is unrelated:

```bash
kubectl label deployment legacy-api \
  owner.example.com/team=payments
```

The API server sends the complete proposed object to admission. If another required field is still missing, Gatekeeper can reject the update.

Gatekeeper does not stop a running container, rewrite a Deployment, or delete an invalid object. Validation is deliberately non-remediating.

## Audit finds stored violations

Gatekeeper's audit operation periodically evaluates existing resources against Constraints. By default, the audit interval is 60 seconds. Results appear in several places:

- `status.totalViolations` on the Constraint.
- A capped list in `status.violations`.
- JSON audit logs with `event_type: violation_audited`.
- Prometheus metrics, including `gatekeeper_violations`.
- Optional violation export integrations.

Check the timestamp and count:

```bash
kubectl get <constraint-kind> <constraint-name> \
  -o jsonpath='{.status.auditTimestamp}{"\n"}{.status.totalViolations}{"\n"}'
```

Only the latest audit run is represented in Constraint status. The default individual violation limit is 20, so a short `.status.violations` list does not mean only 20 resources are invalid.

## Confirm audit is actually running

Installations often separate audit from admission:

```bash
kubectl get deploy,pods -n gatekeeper-system
kubectl get deploy -n gatekeeper-system gatekeeper-audit \
  -o jsonpath='{.spec.template.spec.containers[0].args}'
kubectl logs -n gatekeeper-system deploy/gatekeeper-audit \
  --since=10m
```

Names vary by installation method. In a split deployment, locate the Pod whose arguments include `--operation=audit`. If no `--operation` arguments are present, that Gatekeeper process enables all operations by default, including audit.

An `--audit-interval=0` argument disables the periodic audit operation. Removing an audit Deployment can also remove singleton responsibilities in some Gatekeeper layouts, so use the documented chart setting or disable only the audit operation.

## Match the stored kind you intend to audit

A Constraint that matches `Pod` does not automatically match `Deployment`:

```yaml
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

Audit can find violating Pods that already exist. It does not report the owning Deployment as the violating resource unless the policy also evaluates Deployments or Gatekeeper workload expansion is configured.

Check:

- Core kinds use `apiGroups: [""]`.
- Deployments and StatefulSets use `apiGroups: ["apps"]`.
- `scope`, namespace selectors, names, and labels match the stored object.
- Constraint and global exclusions do not remove the namespace from audit.

## Know what audit cannot reconstruct

Stored objects do not retain the original AdmissionReview. During audit, Kubernetes cannot populate:

- `input.review.userInfo`
- `input.review.operation`
- `input.review.uid`
- `input.review.dryRun`

A policy whose violation depends on the submitting user is not auditable. Write it so missing admission-only fields do not mark every stored object invalid. Use Kubernetes audit logs if historical actor identity is required.

Mutation also does not repair existing objects. A Gatekeeper mutator applies during supported admission operations; deploying it later does not revisit stored resources.

## Remediate through the owning API

Treat audit findings as a work queue:

1. Group violations by Constraint and owning workload.
2. Fix the source manifest, Helm values, or operator configuration.
3. Roll out the controller change.
4. Wait for a completed audit.
5. Confirm `totalViolations` falls.

For a Deployment, change the Pod template rather than patching one generated Pod:

```bash
kubectl patch deployment legacy-api --type=merge -p \
  '{"spec":{"template":{"metadata":{"labels":{"owner.example.com/team":"payments"}}}}}'
```

Prefer a reviewed manifest change over an imperative patch in production. A controller will recreate manual Pod edits from its template.

Do not automate deletion based only on a violation message. Some resources are control-plane dependencies, and policy false positives must remain recoverable.

## A safe policy adoption pattern

Roll out the Constraint as `dryrun`, use audit to build a complete baseline, remediate, move to `warn`, and finally select `deny`. This separates legacy cleanup from protection against new drift.

If Gatekeeper's validating webhook uses its default `failurePolicy: Ignore`, invalid objects can also enter during webhook failures. Audit provides detection after service returns, but it is not an atomic substitute for fail-closed admission.

## Official documentation

- [Gatekeeper audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper handling Constraint violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Gatekeeper workload resources](https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)


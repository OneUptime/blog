# Gatekeeper Fail-Open vs Fail-Closed Without Bypass or Lockout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Admission Webhook, High Availability, Security

Description: Choose Gatekeeper webhook failure behavior deliberately, harden fail-closed admission, and keep a tested recovery path for control-plane incidents.

---

Gatekeeper's Constraint webhook defaults to `failurePolicy: Ignore`. If the webhook times out, returns an error, or is unreachable, the API server continues the request without enforcement from that webhook. Other configured enforcement points, such as a generated Kubernetes `ValidatingAdmissionPolicy`, may still evaluate the request.

Changing the policy to `Fail` closes that webhook availability bypass, but makes matching Kubernetes API writes depend on Gatekeeper's availability. The correct choice comes from explicit risk and recovery requirements.

## What failure policy does and does not do

Kubernetes applies `failurePolicy` when the webhook call fails. Typical failures include:

- Service has no ready endpoints.
- Network or DNS lookup fails.
- TLS verification fails.
- Webhook returns a server error.
- `timeoutSeconds` expires.

It does not override an intentional policy response. If Gatekeeper successfully returns `allowed: false` for a `deny` violation, the API server rejects the request regardless of `Ignore`.

The two values are:

- `Ignore`: skip the failed webhook and continue admission.
- `Fail`: reject the request because admission could not be completed.

Gatekeeper's separate namespace-label protection webhook defaults to `Fail`, even though the general validation webhook defaults to `Ignore`. This prevents a webhook outage from turning namespace label permission into an easy exemption.

## Inspect the live configuration

Do not infer behavior from chart defaults alone:

```bash
kubectl get validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration \
  -o jsonpath='{range .webhooks[*]}{.name}{"  failurePolicy="}{.failurePolicy}{"  timeout="}{.timeoutSeconds}{"s\n"}{end}'
```

Also review each webhook's operations, resources, namespace selector, object selector, and match conditions. Failure policy matters only for requests that match.

## When fail-open is reasonable

`Ignore` favors cluster write availability. It can be appropriate when:

- Policy is advisory or defense in depth.
- The cluster cannot tolerate admission dependency outages.
- Audit and incident response can detect and remediate drift.
- Another independent control enforces the critical invariant.
- Gatekeeper is still being introduced and its availability is unproven.

Treat audit as detection, not equivalent prevention. An invalid object may run before the next audit and remediation.

Monitor webhook errors and compare audit findings after any outage. A fail-open configuration without detection is a silent bypass.

## When fail-closed is justified

`Fail` is appropriate for admission controls whose bypass would create unacceptable exposure, provided Gatekeeper is engineered as part of the control plane.

For a manifest-based installation, the relevant field is:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: gatekeeper-validating-webhook-configuration
webhooks:
  - name: validation.gatekeeper.sh
    failurePolicy: Fail
    timeoutSeconds: 3
```

Apply the change through the source chart, operator, or GitOps manifest. Confirm the installation manager will not revert it.

## Harden before changing to `Fail`

Fail-closed admission needs:

- Multiple ready webhook replicas.
- Pod anti-affinity or topology spread across failure domains.
- Sufficient CPU and memory with low throttling.
- A Service that routes only to ready endpoints.
- A PodDisruptionBudget compatible with upgrades and node maintenance.
- Tested certificate rotation.
- Narrow webhook scope to reduce dependencies and load.
- Low-latency policy, especially for external data.
- Alerts on availability, TLS failures, and p99 latency.

Do not place all replicas on the same node or behind the same fragile dependency. Replica count alone does not remove a shared failure domain.

Test failure scenarios in a non-production cluster. Use your environment's approved disruption method to simulate one unavailable replica, one unavailable zone, and a complete webhook outage. The following command is observational:

```bash
kubectl get pods,endpointslices -n gatekeeper-system
```

Confirm which API operations fail, whether critical controllers recover, and whether the on-call team can execute the runbook.

## Avoid admission deadlock

A self-hosted webhook can block resources needed to restore itself. Gatekeeper's documentation gives the extreme example of missing Nodes: fail-closed admission prevents adding a Node, while Gatekeeper cannot run until a Node exists.

Map dependencies beyond `kube-system`:

- Nodes and node leases.
- Networking and DNS add-ons.
- Storage controllers.
- Certificate management.
- Gatekeeper's own Deployment and ServiceAccount.
- Leader-election ConfigMaps or Leases.

Scope the webhook deliberately. Namespace exclusions do not cover cluster-scoped resources.

## Maintain a break-glass path

Gatekeeper's official emergency procedure for the validating webhook deletes its configuration:

```bash
kubectl delete validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration
```

This disables that Gatekeeper validating webhook cluster-wide. It does not remove Gatekeeper's separate mutating webhook configuration or any generated `ValidatingAdmissionPolicy` resources. Use it only during a confirmed admission emergency, with elevated authorization, incident logging, and immediate follow-up.

The recovery plan must also account for an operator or GitOps controller that recreates the configuration. Keep credentials and instructions available even when normal in-cluster tooling is affected.

After restoring Gatekeeper:

1. Redeploy the pinned webhook configuration.
2. Confirm ready endpoints and TLS.
3. Test an allowed and denied server-side dry run.
4. Review objects admitted during the gap.
5. Wait for audit completion and remediate violations.

## Make the decision measurable

Define objectives before choosing:

- Maximum acceptable policy bypass window.
- Maximum acceptable API write outage.
- Webhook availability target.
- Admission latency budget.
- Audit detection and remediation time.
- Recovery time for certificate, network, and capacity failures.

Fail-open and fail-closed are not maturity labels. They allocate failure risk differently. Use evidence from the cluster, not a generic security slogan.

## Official documentation

- [Gatekeeper failing closed](https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/)
- [Gatekeeper emergency recovery](https://open-policy-agent.github.io/gatekeeper/website/docs/emergency/)
- [Gatekeeper customizing admission behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Kubernetes admission webhook failure policy](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#failure-policy)

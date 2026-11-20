# How to Detect and Prevent Manual Replica Overrides on HPA-Controlled Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Identify unexpected writers to Deployment replicas through managed fields and audit logs, then preserve HPA ownership with deployment and access controls.

---

A manual `kubectl scale` command changes the same desired replica count that an HPA manages. The change may appear to work, then disappear on a later HPA reconciliation. A release pipeline that keeps applying `spec.replicas` can repeat that conflict indefinitely.

Investigate who wrote the field and why before changing the HPA. Replica movement alone does not identify the writer: normal autoscaling, rollout behavior, scripts, and operators can all change what you observe.

## Capture desired replicas separately from Pod count

```bash
kubectl get deployment checkout -n production -o json |
  jq '{uid: .metadata.uid, replicas: .spec.replicas,
       generation: .metadata.generation, status: .status}'
kubectl get hpa checkout -n production -o json |
  jq '{target: .spec.scaleTargetRef, current: .status.currentReplicas,
       desired: .status.desiredReplicas, conditions: .status.conditions}'
```

A rollout can add surge Pods without an equivalent increase in `Deployment.spec.replicas`. Start with the field that the HPA controls rather than treating every additional Pod as an override.

Save timestamps and recent HPA events. An unexpected change immediately after a deployment-system reconciliation is a useful lead, but it is not definitive attribution.

## Use managed fields as an ownership clue

```bash
kubectl get deployment checkout -n production -o json --show-managed-fields |
  jq '.metadata.managedFields[]? |
      select(.fieldsV1."f:spec"."f:replicas" != null) |
      {manager, operation, subresource, time}'
```

You may see managers associated with an autoscaler, an apply operation, or a scale command. Manager names and managed-field timestamps help explain current ownership. They are not a complete historical audit trail, and the manager name alone is not a trustworthy user identity.

The [server-side apply documentation](https://kubernetes.io/docs/reference/using-api/server-side-apply/) explains field management and conflict handling. Normal update operations and controllers can still change fields; managed ownership is not a permission system that locks replicas against every writer.

## Use audit records for attribution

Kubernetes audit events identify request users, verbs, resources, subresources, and response status when auditing is configured. A focused policy can capture write requests for Deployments and their scale subresource:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Request
    verbs: [update, patch]
    resources:
      - group: apps
        resources: [deployments, deployments/scale]
    namespaces: [production]
  - level: Metadata
```

This is an audit-policy example for cluster administrators, not a namespaced object to apply with `kubectl`. Integrate it into the existing policy and retention design. Request-level records can include deployment configuration, so keep their scope and access appropriate.

Filter retained audit events for the target namespace/name and `/scale` writes, then inspect `user.username`, `userAgent`, request body, and response code. Also inspect whole-Deployment writes because a patch to `spec.replicas` need not use the scale subresource. The [auditing guide](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) describes policy levels and event contents.

## Remove recurring replica declarations safely

For an autoscaled workload, render deployment configuration without a recurring fixed `spec.replicas` value. Set the operating floor and ceiling in the HPA instead. Check chart defaults and overlays so a later release does not reintroduce the field.

Transferring ownership needs care. Removing replicas from a server-side-applied manifest before another manager owns the field can reset a Deployment to its default replica count. Follow the documented [HPA ownership transfer procedure](https://kubernetes.io/docs/reference/using-api/server-side-apply/#transferring-ownership) or wait until the HPA has claimed the field before relinquishing it.

Test a normal release while the HPA has scaled above its minimum. Confirm the release preserves the HPA-controlled desired count and updates only the intended application configuration.

## Restrict writers without breaking normal releases

Review update and patch permissions on both `deployments` and `deployments/scale`. [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) distinguishes resources and subresources, but it does not provide general field-level restrictions within a Deployment update.

Removing scale-subresource permission alone is insufficient when a user can patch the full Deployment. If releases need broad Deployment writes, a carefully scoped admission policy can protect replica changes while allowing the approved autoscaler identity and emergency procedure. Verify both API paths and actual controller identities before enforcing it.

Define temporary capacity changes through HPA bounds when appropriate. A manual replica edit is not a durable override of an active control loop. Emergency procedures should state who owns scaling during the intervention and how ownership returns afterward.

## Verify that the conflict stays resolved

Observe several HPA evaluations and at least one release reconciliation. Check that unexpected replica writers disappear from audit logs, legitimate scale changes still succeed, and ready capacity tracks demand.

Alert on unauthorized or unexpected replica-write identities rather than replica changes alone. That produces a precise signal while allowing the HPA to do the work it was configured to do.

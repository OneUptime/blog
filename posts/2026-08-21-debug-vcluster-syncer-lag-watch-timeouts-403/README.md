# How to Debug vCluster Syncer Lag, Watch Timeouts, and `403 Forbidden` API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Troubleshooting, RBAC, Synchronization

Description: Separate normal watch reconnects from real sync lag, identify which API returns 403, and verify the vCluster service account's generated RBAC.

---

The vCluster syncer watches both the tenant API and the control plane cluster and reconciles translated resources. A message containing “watch closed” is not automatically an outage: Kubernetes watches are finite and clients relist and reconnect. The serious pattern is repeated watch failure with no successful relist, growing resource delay, hot reconciliation errors, or `403 Forbidden` for a required verb.

This guide targets vCluster **0.36** on shared nodes. Diagnose from the control plane cluster because the syncer runs in the vCluster control-plane Pod and uses its host ServiceAccount.

## Prove That There Is Actual Lag

Create a harmless tenant canary and time its host appearance:

```bash
kubectl create configmap sync-canary \
  --namespace default \
  --from-literal=created-at="$(date -u +%FT%TZ)"
```

On the control plane cluster, find the translated ConfigMap by management labels and its original tenant metadata instead of assuming the translated name:

```bash
kubectl get configmap -A \
  -l vcluster.loft.sh/managed-by \
  --sort-by=.metadata.creationTimestamp
```

Repeat with the affected resource kind. A ConfigMap success does not prove a custom resource, Gateway route, PVC, or cluster-scoped import has the correct controller and RBAC.

Inspect tenant events:

```bash
kubectl get events -A --sort-by=.lastTimestamp
kubectl describe <kind> <name> -n <namespace>
```

vCluster records `SyncWarning` and `SyncError` events for many selector and reference failures. Those are deterministic policy problems, not performance lag.

## Check the Control-Plane Pod and Logs

On the control plane cluster:

```bash
kubectl get pod -n team-a-vcluster -o wide
kubectl describe pod -n team-a-vcluster <vcluster-pod>
kubectl logs -n team-a-vcluster <vcluster-pod> \
  --since=20m --timestamps
kubectl logs -n team-a-vcluster <vcluster-pod> \
  --previous --timestamps
```

Look for restarts, OOM kills, CPU throttling, leader-election churn, API dial failures, repeated relists, and one controller producing a dense error loop. The same log stream covers syncer activity, tenant API handling, and controller reconciliation.

Structured logs make multi-tenant filtering easier:

```yaml
logging:
  encoding: json
```

For a short diagnostic window, vCluster documents debug logging through an environment variable:

```yaml
controlPlane:
  statefulSet:
    env:
      - name: DEBUG
        value: "true"
```

Applying either change restarts the control-plane Pod. Capture old logs first, use debug only for the needed interval, and remove it afterward because volume and sensitive operational context increase.

## Classify Watch Messages

Normal watch lifecycle often looks like a connection closing or an expired resource version followed by a successful LIST and a new WATCH. Investigate when you see:

- repeated timeout or EOF messages with no subsequent successful events,
- `410 Gone` loops that never complete a relist,
- authorization errors on LIST or WATCH,
- host API latency or unavailability,
- proxy or service-mesh idle timeouts shorter than normal watches,
- growing memory, CPU, work queue, or object delay,
- the same object failing every reconcile.

Check both APIs:

```bash
# Control plane cluster
kubectl get --raw='/readyz?verbose'

# Tenant cluster
kubectl --kubeconfig /tmp/team-a.kubeconfig \
  get --raw='/readyz?verbose'
```

The syncer's host path normally uses in-cluster DNS and the Kubernetes Service. Check DNS, NetworkPolicy, service mesh, and API server health on that path rather than the public vCluster endpoint.

Large initial object bursts can take time because controllers self-throttle. Before tuning anything, eliminate an error loop and verify control-plane CPU, memory, API Priority and Fairness, and API server latency.

## Identify Which Identity Received the 403

A `403 Forbidden` means authentication succeeded and authorization denied the verb. Copy the full log line and record:

- API server (tenant or control plane),
- user or ServiceAccount,
- verb,
- API group and resource,
- namespace or cluster scope.

Find the host ServiceAccount used by the vCluster Pod:

```bash
kubectl get pod -n team-a-vcluster <vcluster-pod> \
  -o jsonpath='{.spec.serviceAccountName}{"\n"}'
```

Test the exact denied operation with impersonation. Replace `vc-team-a` and the resource with observed values:

```bash
kubectl auth can-i \
  --as=system:serviceaccount:team-a-vcluster:vc-team-a \
  list pods \
  --namespace team-a-vcluster

kubectl auth can-i \
  --as=system:serviceaccount:team-a-vcluster:vc-team-a \
  watch storageclasses.storage.k8s.io \
  --all-namespaces
```

Impersonation itself requires permission; an operator receiving a denial here may need a cluster administrator to run the check.

## Compare RBAC with Enabled Features

vCluster generates Role and ClusterRole rules from enabled sync and integration settings. A 403 commonly appears when:

- a managed ServiceAccount replaced the chart-created account without equivalent permissions,
- `rbac.role.overwriteRules` omitted a default rule,
- `rbac.clusterRole.enabled: false` conflicts with a cluster-scoped import,
- a new sync feature was enabled but the release was not upgraded with the changed `vcluster.yaml`,
- service replication reads a source namespace outside the granted scope,
- host security tooling removed or mutated a binding.

Inspect bindings and effective rules:

```bash
kubectl get role,rolebinding,clusterrole,clusterrolebinding \
  -A | grep team-a
kubectl auth can-i --list \
  --as=system:serviceaccount:team-a-vcluster:vc-team-a \
  --namespace team-a-vcluster
```

Prefer restoring chart-generated RBAC by applying the intended feature configuration. Use `rbac.role.extraRules` or `clusterRole.extraRules` only for a documented nonstandard requirement. Do not grant `cluster-admin` as a diagnostic shortcut; it conceals the missing rule and expands tenant impact.

## Validate Recovery

After fixing the actual cause:

1. Recreate or update a canary of the affected kind.
2. Confirm its translated host object appears.
3. Confirm status returns to the tenant where supported.
4. Watch logs through at least one watch reconnect.
5. Confirm the 403 rate returns to zero.
6. Remove temporary debug logging.

A one-time successful reconcile is not enough if the controller loses authorization again at the next relist.

## Official Documentation

- [vCluster: How synchronization works](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster: Control-plane logging](https://www.vcluster.com/docs/vcluster/manage/logging)
- [vCluster: Enable debug logging](https://www.vcluster.com/docs/vcluster/learn-how-to/control-plane/container/enable-debug-logging)
- [vCluster: RBAC configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/rbac)
- [Kubernetes: Authorization overview](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)

## Conclusion

Measure lag with an affected-kind canary, treat watch closure as a symptom only when relist and reconciliation fail, and trace every 403 to an API, identity, verb, resource, and scope. Restore the generated least-privilege rule for the enabled feature, then verify the controller through a complete relist/watch cycle.

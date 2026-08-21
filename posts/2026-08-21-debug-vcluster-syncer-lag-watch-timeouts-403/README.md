# How to Debug vCluster Syncer Lag, Watch Timeouts, and `403 Forbidden` API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Troubleshooting, RBAC, Synchronization

Description: Separate normal watch reconnects from real sync lag, identify which API returns 403, and verify the vCluster service account's generated RBAC.

---

The vCluster syncer watches both the tenant API and the control plane cluster and reconciles translated resources. A message containing “watch closed” is not automatically an outage: watch connections can close normally, and clients reconnect and relist when needed. The serious pattern is repeated watch failure with no successful re-establishment, growing resource delay, hot reconciliation errors, or `403 Forbidden` for a required verb.

This guide targets vCluster **0.36** on shared nodes. Diagnose from the control plane cluster because the syncer runs in the vCluster control-plane Pod and uses its host ServiceAccount.

## Prove That There Is Actual Lag

With ConfigMap sync enabled, create a harmless tenant canary, force the standalone ConfigMap to sync, and time its host appearance. vCluster 0.36 does not sync every ConfigMap by default; without the annotation, an unreferenced ConfigMap might never appear on the control plane cluster:

```bash
kubectl create configmap sync-canary \
  --namespace default \
  --from-literal=created-at="$(date -u +%FT%TZ)"
kubectl annotate configmap sync-canary \
  --namespace default \
  vcluster.loft.sh/force-sync=true
```

On the control plane cluster, find the translated ConfigMap for the `team-a` release by its management label and inspect the original tenant name and namespace annotations instead of assuming the translated name:

```bash
kubectl get configmap -A \
  -l vcluster.loft.sh/managed-by=team-a \
  --sort-by=.metadata.creationTimestamp \
  -o yaml
```

Repeat with the affected resource kind. A ConfigMap success does not prove a custom resource, Gateway route, PVC, or cluster-scoped import has the correct controller and RBAC.

Inspect tenant events:

```bash
kubectl events --all-namespaces
kubectl describe <kind> <name> -n <namespace>
```

vCluster records `SyncWarning` and `SyncError` events for many selector and reference failures. Selector and reference validation messages usually identify deterministic policy problems, but classify these events from their messages because the same reasons can also report API, authorization, or transient reconciliation failures.

## Check the Control-Plane Pod and Logs

On the control plane cluster:

```bash
kubectl get pod -n team-a-vcluster -o wide
kubectl describe pod -n team-a-vcluster <vcluster-pod>
kubectl logs -n team-a-vcluster <vcluster-pod> -c syncer \
  --since=20m --timestamps
kubectl logs -n team-a-vcluster <vcluster-pod> -c syncer \
  --previous --timestamps
```

Look for restarts, OOM kills, CPU throttling, leader-election churn, API dial failures, repeated relists, and one controller producing a dense error loop. The `syncer` container's log stream covers syncer activity, tenant API handling, and controller reconciliation.

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

Normal watch lifecycle often looks like a connection closing followed by a new WATCH from the last resource version. If that resource version has expired and the API returns `410 Gone`, the client must perform a fresh LIST before starting a new WATCH. Investigate when you see:

- repeated timeout or EOF messages with no successful LIST or WATCH re-establishment,
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

The syncer's host path normally uses in-cluster configuration and the Kubernetes Service address, not the public vCluster endpoint. Check the `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT` path, Service routing, NetworkPolicy, service mesh, and API server health. Check DNS only if the actual configured endpoint is a hostname.

Large initial object bursts can take time because controllers self-throttle. Before tuning anything, eliminate an error loop and verify control-plane CPU, memory, API Priority and Fairness, and API server latency.

## Identify Which Identity Received the 403

An authorization-style `403 Forbidden`, usually containing `User "..." cannot <verb> resource "..."`, means the API server denied that identity's request. Admission policies and webhooks can also reject an authorized request with `403`, so copy the full status or log line before assuming RBAC is the cause. For an authorization denial, record:

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

`kubectl auth can-i` checks authorization only. If it says `yes` while the same API request is rejected, investigate admission policy, webhook, and audit details instead of expanding RBAC. Impersonation itself requires permission; an operator receiving a denial here may need a cluster administrator to run the check.

## Compare RBAC with Enabled Features

vCluster generates Role and ClusterRole rules from enabled sync and integration settings. A 403 commonly appears when:

- a managed ServiceAccount was configured with automatic RBAC disabled but lacks equivalent permissions,
- `rbac.role.overwriteRules` omitted a default rule,
- `rbac.clusterRole.enabled: false` conflicts with a cluster-scoped import,
- a new sync feature was added to `vcluster.yaml` but the release was not upgraded with the changed file,
- service replication reads from or writes to a control-plane namespace outside the granted scope,
- host security tooling removed or mutated a binding.

Inspect bindings and effective rules:

```bash
kubectl get role,rolebinding,clusterrole,clusterrolebinding \
  -A | grep team-a
kubectl auth can-i --list \
  --as=system:serviceaccount:team-a-vcluster:vc-team-a \
  --namespace team-a-vcluster
```

Prefer restoring chart-generated RBAC by applying the intended feature configuration. Use `rbac.role.extraRules` or `rbac.clusterRole.extraRules` only for a documented nonstandard requirement. Do not grant `cluster-admin` as a diagnostic shortcut; it conceals the missing rule and expands tenant impact.

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

Measure lag with an affected-kind canary, treat watch closure as a symptom only when watch re-establishment and reconciliation fail, and trace every 403 to an API, identity, verb, resource, scope, and denial source. When authorization is the cause, restore the generated least-privilege rule for the enabled feature, then verify the controller through a complete relist/watch cycle.

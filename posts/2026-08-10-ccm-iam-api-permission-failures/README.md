# How to Troubleshoot Cloud Controller Manager IAM and API Permission Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, IAM, RBAC, Cloud API, Troubleshooting, Security

Description: Separate Kubernetes RBAC from cloud IAM, identify the CCM's active principal, and use controller events plus provider audit logs to repair least-privilege access.

---

A cloud-controller-manager (CCM) crosses two independent authorization systems. It needs Kubernetes RBAC to watch and update cluster objects, and it needs cloud IAM to describe or mutate infrastructure. “Forbidden” in either system can stop Node initialization, route reconciliation, load-balancer provisioning, or cloud lifecycle checks, but the fix belongs to a different administrator and policy.

Start by identifying which API denied which principal. Do not attach an administrator role until errors disappear; that hides the missing contract and leaves a highly privileged control-plane credential behind.

## Build a Failure Record

Capture the affected object, Event, elected CCM replica, log line, time, request identifier, cloud principal, API action, resource, and scope. These fields let you correlate Kubernetes with provider audit logs.

```bash
# Node initialization and cloud metadata
kubectl describe node worker-1

# Load balancer reconciliation
kubectl describe service -n app web

# Find provider components and leadership
kubectl get deploy,daemonset,pod -A -o wide | grep -i cloud-controller
kubectl get leases -A | grep -i cloud

# Read the leader's recent logs; use actual provider labels or Pod name
kubectl logs -n kube-system CCM_LEADER_POD --all-containers --since=30m
```

Preserve the full error code and request ID, but redact tokens, signed requests, private keys, and Secret content. An API response such as `403`, `UnauthorizedOperation`, or `PermissionDenied` is more useful than the surrounding retry stack trace.

## First Boundary: Kubernetes RBAC

Kubernetes denial usually contains `forbidden`, a ServiceAccount identity, a verb, and a resource:

```text
User "system:serviceaccount:kube-system:cloud-controller-manager"
cannot patch resource "nodes"
```

Extract the live ServiceAccount and test the exact operation:

```bash
kubectl get pod -n kube-system CCM_POD \
  -o jsonpath='{.spec.serviceAccountName}{"\n"}'

SA=system:serviceaccount:kube-system:cloud-controller-manager
kubectl auth can-i get nodes --as="$SA"
kubectl auth can-i patch nodes --as="$SA"
kubectl auth can-i update nodes/status --as="$SA"
kubectl auth can-i list services --all-namespaces --as="$SA"
kubectl auth can-i update services/status --all-namespaces --as="$SA"
kubectl auth can-i get leases.coordination.k8s.io -n kube-system --as="$SA"
kubectl auth can-i update leases.coordination.k8s.io -n kube-system --as="$SA"
```

The generic Kubernetes CCM documentation lists access used by shared controllers, but external providers can add controllers and API resources. Compare the ClusterRole and binding shipped with the exact provider release. Do not grant `cluster-admin` as a permanent shortcut if the maintained chart supplies narrower RBAC.

If every replica fails before acquiring its Lease, repair Lease access first. If leadership works but one controller fails, test the object and subresource named in the error; permission on `services` does not imply permission on `services/status`.

## Second Boundary: Cloud IAM

Cloud IAM denial originates from the provider API and should appear in the provider's audit log. Determine how the Pod obtains its cloud identity:

- a control-plane VM instance role or managed identity;
- workload identity bound to a Kubernetes ServiceAccount;
- projected service-account token exchanged with the provider;
- a mounted credential file or Secret;
- an external credential process; or
- a provider-specific metadata endpoint.

Inspect references, not secret values:

```bash
kubectl get pod -n kube-system CCM_POD -o json | jq '{
  serviceAccount: .spec.serviceAccountName,
  env: [.spec.containers[].env[]? | {name, valueFrom}],
  envFrom: [.spec.containers[].envFrom[]?],
  volumes: [.spec.volumes[] | {name, secret, configMap, projected}],
  mounts: [.spec.containers[].volumeMounts[]?]
}'
```

Then use official provider identity diagnostics to reveal the principal without printing credentials. Check the workload identity binding, role trust policy, token issuer and audience, subject, account/project/subscription, region, resource group, and API endpoint.

## Match Permissions to the Enabled Controllers

Required cloud actions depend on features:

- Node initialization needs instance, network, address, zone, and related metadata reads.
- Cloud node lifecycle needs enough read access to determine whether a backing server exists.
- Route reconciliation needs route-table discovery and create/update/delete actions, often scoped to cluster networks.
- Service reconciliation needs load balancer, listener, backend/target, address, firewall or security-group, subnet, and health-check operations.

Do not copy a policy for all CCM features if the deployment disables routes or Services. Conversely, do not use a node-read-only policy for a CCM expected to provision load balancers.

Use the provider release's maintained policy as the baseline, diff it against the deployed policy, and confirm each denied action from audit evidence. Scope resources using provider-supported tags and conditions, but make sure creation actions that cannot name a resource in advance remain possible under the provider's IAM model.

## Distinguish Denial from Other API Failures

Not every failed request is IAM:

| Signal | Likely class |
| --- | --- |
| HTTP 401, invalid signature, expired token | Credential acquisition, audience, time, or secret rotation |
| HTTP 403 with principal/action | IAM policy, organization policy, scope, or explicit deny |
| Kubernetes `forbidden` naming a ServiceAccount | Kubernetes RBAC or admission policy |
| HTTP 404 / instance not found | Wrong region/account/identifier, stale Node, or deliberately hidden unauthorized resource |
| HTTP 409 | Conflicting resource state or duplicate reconciliation |
| HTTP 429 / quota exceeded | API throttling or resource quota, not necessarily missing permission |
| TLS/DNS/timeout | Endpoint, CA trust, proxy, firewall, or routing |

Cloud providers sometimes return a not-found response for resources the principal cannot view. Correlate with the audit service rather than granting permissions based on status code alone.

## Credential Rotation and Workload Identity Traps

A new Secret does not guarantee the running process reloaded it. Check rollout timestamps, projected-volume refresh behavior, SDK credential caching, and whether the chart adds a checksum annotation to trigger a restart. Restart only the CCM workload after preserving evidence and only when the provider's credential mechanism requires it.

For federated workload identity, validate the full trust tuple:

- cluster OIDC issuer;
- token audience;
- namespace and ServiceAccount subject;
- provider role or identity binding;
- annotations or labels expected by the admission webhook; and
- the token file path injected into the correct container.

Clock skew can invalidate a token before the request reaches IAM evaluation. Confirm time synchronization on control-plane hosts.

## Verify the Repair by Reconciliation

An IAM simulator or `can-i` result is necessary but not sufficient. Exercise the affected controller with a safe canary:

```bash
# Watch a new Node initialize through normal provisioning
kubectl get nodes -w

# Or inspect a purpose-built test Service
kubectl get service -n ccm-canary test-lb -w
kubectl describe service -n ccm-canary test-lb
```

Confirm the audit log records the intended principal and allowed action, the CCM stops retrying, and Kubernetes status converges. For permissions that include deletion, use a disposable test resource and verify cleanup so stale cloud infrastructure is not left behind.

Keep alerts on denied requests and reconciliation errors. A one-time fix can regress when policies, workload-identity bindings, chart versions, or control-plane instance profiles change.

## Official Documentation

- [Kubernetes: CCM authorization requirements](https://kubernetes.io/docs/concepts/architecture/cloud-controller/#authorization)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)

## Conclusion

Treat a CCM permission incident as two separate authorization investigations. Use `kubectl auth can-i` and Kubernetes audit data for the ServiceAccount boundary; use the exact provider request ID and cloud audit log for IAM. Identify the elected replica and active principal, grant only actions required by enabled controllers, and prove the repair with real reconciliation and cleanup. Broad administrator access may silence the error, but it does not produce a safe control plane.

# Why Is a KubeVela Multi-Cluster Application Stuck? Debugging Topology Policies and Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Troubleshooting, Application Delivery

Description: Trace a stuck KubeVela multi-cluster deployment from workflow and topology selection through Cluster Gateway, target admission, and workload health.

---

A “stuck” multi-cluster Application can be blocked in four distinct places: no clusters matched the topology, the workflow never dispatched, the hub cannot apply to a selected cluster, or resources exist but never become healthy. Start with the KubeVela resource tree and workflow conditions, then move to Cluster Gateway and finally the target cluster. Randomly editing topology YAML obscures which layer failed.

## Capture the control-plane state

```bash
vela version
vela status payments --namespace delivery --tree --detail
vela status payments --namespace delivery -o yaml
kubectl get application payments --namespace delivery -o yaml
vela cluster list
```

Record the current Application generation, publish version, workflow step names/phases/messages, selected clusters shown under Services, and `.status.conditions`. Also preserve KubeVela controller logs around the first failure. The last generic “workflow running” line is usually less useful than the earliest condition or event.

Do not resume, restart, or reapply yet. Those operations can create a new workflow attempt and replace the status you need.

## 1. Prove the topology matches clusters

For explicit placement, compare names character for character:

```yaml
policies:
  - name: eu-targets
    type: topology
    properties:
      clusters: ["cluster-eu-1", "cluster-eu-2"]
```

The values are KubeVela cluster registration names from `vela cluster list`, not cloud provider names or local kubeconfig contexts. The hub is named `local`.

For label selection:

```yaml
properties:
  clusterLabelSelector:
    environment: production
    region: eu
```

Every listed label must match. Inspect labels reported by `vela cluster list` and audit recent label changes. A selector matching zero clusters is a placement issue; a selector unexpectedly matching ten clusters is a change-control incident. Do not “fix” zero matches by loosening a production selector until you enumerate the resulting set.

Check destination namespace as well. The topology namespace may differ from the hub Application namespace, but KubeVela can be configured with `--allow-cross-namespace-resource=false`, and target RBAC can deny namespace creation or resource writes.

## 2. Verify the workflow references the policies

An explicit deploy step must name the policies exactly:

```yaml
workflow:
  steps:
    - name: deploy-eu
      type: deploy
      properties:
        policies: ["eu-targets", "eu-overrides"]
```

Common errors include:

- misspelling a policy name;
- defining topology but using a custom workflow that never references it;
- using an external Policy or Workflow in another namespace;
- listing an `override` without a `topology`, which official guidance warns can deploy nothing;
- waiting at an intentional `suspend` step; and
- a previous workflow step failing or remaining unhealthy.

Inspect the workflow section in `vela status`, not only the overall phase. Query the installed schemas with `vela show deploy`, `vela show topology`, and `vela show override`; old `env-binding` or `deploy2env` examples should not be mixed into a current policy model without a tested migration.

## 3. Test managed-cluster reachability

```bash
vela cluster probe cluster-eu-1
vela cluster probe cluster-eu-2
kubectl get pods --namespace vela-system
kubectl logs --namespace vela-system \
  -l app=kubevela-cluster-gateway --tail=200
```

First list deployments and labels in `vela-system`, because the log selector can differ by chart version or release name. With default Cluster Gateway registration, the hub connects to the managed API endpoint using stored kubeconfig credentials. Diagnose:

- DNS and routes from the hub/control-plane network, not an operator laptop;
- API server TLS name and CA;
- expired client certificates or tokens;
- firewall or private endpoint reachability;
- accepted cluster registration; and
- Cluster Gateway pod readiness and logs.

Never print kubeconfig Secrets into a shared ticket. Redact tokens, client keys, and certificates while preserving endpoint and error class.

If direct hub-to-spoke connectivity is impossible by design, review KubeVela's Open Cluster Management integration instead of making a private API server public.

## 4. Separate rendering from target admission

A component can render successfully on the hub and fail when the spoke API server validates it. Target clusters may have different Kubernetes versions, CRDs, admission webhooks, policy engines, quotas, or RBAC.

Look for messages such as:

- `no matches for kind` - required CRD/addon is absent or API version differs;
- `forbidden` - propagated identity or cluster credential lacks permission;
- admission denial - target policy rejected the object;
- namespace not found - destination was not bootstrapped;
- immutable field - existing target resource cannot be patched; or
- timeout - connectivity or an unavailable admission webhook.

Use `vela status --tree --detail` to identify the cluster, namespace, kind, and name. Then inspect that object and namespace's events with authorized read-only access. A hub-side dry-run cannot reproduce every spoke admission policy.

## 5. Inspect target workload health

If Deployments and Services exist, placement worked. The workflow may be waiting for component health:

```bash
vela status payments --namespace delivery --pod
vela logs payments --namespace delivery
```

On the selected spoke, inspect Pods, events, rollout status, and referenced dependencies. Typical blockers are image pulls, unschedulable replicas, missing Secrets, unavailable storage classes, failing readiness probes, and ingress or custom-resource health logic.

A custom ComponentDefinition determines what KubeVela considers healthy. If its health policy waits for a condition that the target controller never sets, Kubernetes resources can look usable while KubeVela waits forever. Compare the installed definition revision and actual `.status` shape.

## 6. Check override and resource conflicts

An override can make only one destination invalid-for example, an image unavailable in a regional registry, a storage class that exists elsewhere, or replicas exceeding quota. Render each effective policy combination and compare it with the failing target.

Also look for two reconcilers owning the same resource. If Argo CD applies the rendered Deployment while KubeVela also dispatches it, each can revert the other's labels, image, or replicas. GitOps should normally own the hub `Application`; KubeVela should own its generated resources.

## Recover without losing evidence

Fix registration, labels, policy names, prerequisites, or target health in Git. Publish a new version when the desired Application changes. Resume only an intentional and approved `suspend`; restarting a failed workflow may repeat side effects. For a failed release, follow KubeVela's revision and workflow rollback procedure and understand that rollback targets the latest succeeded Application revision.

Do not detach a cluster, delete ResourceTrackers, remove finalizers, or erase Helm release records as a first response. Those actions can orphan or delete dispatched resources.

## Official Documentation

- [KubeVela multi-cluster Application and debugging](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela topology and override policies](https://kubevela.io/docs/end-user/policies/references/)
- [KubeVela `vela status`](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela cluster management](https://kubevela.io/docs/cli/vela_cluster/)
- [KubeVela workflow suspend and resume](https://kubevela.io/docs/end-user/workflow/suspend/)
- [Kubernetes API access control](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)

## Conclusion

Debug placement as a pipeline: prove the topology selects the intended registered clusters, verify the workflow references the right policy set, test Cluster Gateway reachability, inspect target admission, and only then troubleshoot workload health. Preserve the original conditions and avoid destructive cluster or resource-tracker changes. The cluster shown in the resource tree tells you where the investigation should move next.

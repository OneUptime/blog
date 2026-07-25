# Referential Gatekeeper Policies with `data.inventory` and `syncOnly`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Rego, Referential Policy, Data Replication

Description: Build Gatekeeper policies that reference cluster state, configure only the required synchronized kinds, and account for cache consistency.

---

An admission request normally contains the object being created or updated. Some policies need other cluster objects as well. Gatekeeper can replicate selected Kubernetes kinds into its data client and expose them to Rego under `data.inventory`.

This enables referential rules such as:

- Confirming that a referenced ServiceAccount exists.
- Preventing duplicate Ingress hosts.
- Comparing a workload with an approved namespace or configuration object.

It also introduces memory, permissions, and consistency tradeoffs.

## Choose a replication API

Current Gatekeeper documentation recommends `SyncSet` on versions that support it:

```yaml
apiVersion: syncset.gatekeeper.sh/v1alpha1
kind: SyncSet
metadata:
  name: policy-serviceaccounts
spec:
  gvks:
    - group: ""
      version: v1
      kind: ServiceAccount
```

Gatekeeper v3.15 and later support `SyncSet` as an alpha resource. Multiple teams can own separate SyncSets; Gatekeeper synchronizes the union of their GVKs.

The older singleton `Config` uses `syncOnly`:

```yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  sync:
    syncOnly:
      - group: ""
        version: v1
        kind: ServiceAccount
```

The Config must be named `config` in `gatekeeper-system`. Gatekeeper synchronizes the union of `SyncSet.spec.gvks` and `Config.spec.sync.syncOnly`.

## Understand the inventory path

Cluster-scoped resources use:

```rego
data.inventory.cluster[<groupVersion>][<kind>][<name>]
```

Namespaced resources use:

```rego
data.inventory.namespace[<namespace>][<groupVersion>][<kind>][<name>]
```

Core v1 objects use the groupVersion key `"v1"`. For example:

```rego
data.inventory.cluster["v1"]["Namespace"]["production"]
data.inventory.namespace["production"]["v1"]["ServiceAccount"]["payments-api"]
```

Use `object.get` or an existence check when a path may be absent. An undefined Rego reference does not behave like an empty Kubernetes object.

## Example: require an existing ServiceAccount

This template rejects Pods that name a ServiceAccount missing from the same Namespace:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sexistingserviceaccount
spec:
  crd:
    spec:
      names:
        kind: K8sExistingServiceAccount
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sexistingserviceaccount

        violation[{"msg": msg}] {
          namespace := input.review.namespace
          service_account := object.get(input.review.object.spec, "serviceAccountName", "default")
          not data.inventory.namespace[namespace]["v1"]["ServiceAccount"][service_account]
          msg := sprintf(
            "ServiceAccount %q does not exist in namespace %q",
            [service_account, namespace],
          )
        }
```

Apply a narrow Constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sExistingServiceAccount
metadata:
  name: pods-use-existing-serviceaccounts
spec:
  enforcementAction: dryrun
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

The Kubernetes API already performs some reference validation in different lifecycle stages, so treat this as a clear inventory example. Use referential Gatekeeper policy where the native API does not provide the organization-specific relationship you need.

## Wait for synchronization

Replication is eventually consistent. Do not apply a referential Constraint as `deny` immediately after adding its SyncSet.

Check the desired and active watch counts:

```bash
kubectl get syncsets.syncset.gatekeeper.sh -o yaml
kubectl logs -n gatekeeper-system \
  -l control-plane=controller-manager \
  --since=10m | grep -i sync
```

Monitor:

- `gatekeeper_sync`
- `gatekeeper_sync_last_run_time`
- `gatekeeper_watch_manager_intended_watch_gvk`
- `gatekeeper_watch_manager_watched_gvk`

Test an allowed and a denied object after the cache is populated. Roll out as `dryrun`, then `warn`, before using `deny`.

## Account for races

Gatekeeper's runtime flag documentation warns that referential constraints can be subject to race conditions. Examples include:

- A referenced object was just created but has not reached Gatekeeper's cache.
- A referenced object was deleted but remains briefly visible.
- Two concurrent requests each pass because neither is yet stored.

Do not use eventual cache state as the only mechanism for an invariant that must be atomic. Where possible, use Kubernetes-native uniqueness, owner references, a controller that reconciles desired state, or another transactional system.

Design messages to describe a potentially stale lookup and make retries safe.

## Sync the minimum data

Every synchronized GVK adds watches, memory, and object data to Gatekeeper. Avoid broad replication:

- Sync only kinds read by active policies.
- Remove GVKs when the last policy no longer needs them.
- Avoid syncing Secrets unless policy truly requires their contents.
- Review Gatekeeper RBAC for each synchronized kind.
- Load-test high-cardinality kinds such as Pods and Events.

Use separate SyncSets by policy domain so ownership and cleanup are visible.

## Understand cache-backed audit

Referential policy evaluation uses replicated data, but ordinary audit lists objects directly by default. With `--audit-from-cache=true`, audit also uses the informer cache as its source of objects under test. In that mode, a kind must be included in SyncSet or `syncOnly` before audit can evaluate it.

This distinction explains many empty audits:

```text
referenced data needed by policy -> always synchronize that referenced GVK
objects audited from cache       -> synchronize each GVK being audited too
```

Gator tests can provide inventory files for referential cases, making allowed, missing, stale-assumption, and cross-namespace behavior reproducible before cluster rollout.

## Official documentation

- [Gatekeeper replicating data](https://open-policy-agent.github.io/gatekeeper/website/docs/sync/)
- [Gatekeeper ConstraintTemplate built-in data](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/#built-in-variables-across-all-engines)
- [Gatekeeper runtime flags and referential rule warning](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gator inventory testing](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)

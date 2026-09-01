# How to Register, Label, and Select Managed Clusters in KubeVela

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Platform Engineering, Application Delivery

Description: Join managed Kubernetes clusters to KubeVela, apply governed placement labels, select them with topology policies, and verify dispatch safely.

---

KubeVela registers managed clusters on a hub control plane. By default, KubeVela stores endpoint and credential material in a Kubernetes Secret on the hub, which Cluster Gateway uses to connect directly to each managed Kubernetes API. Applications select registration names or labels through a `topology` policy. Registration and labels are therefore privileged platform operations: they decide where workloads can be dispatched and what credentials the hub holds.

The hub appears as the special cluster `local`. KubeVela's documentation notes that it cannot be detached or modified like a managed cluster.

## Prepare a least-privilege registration

Before joining a cluster, decide which namespaces and resource kinds KubeVela must manage there. The credentials in the spoke kubeconfig determine what Cluster Gateway can do. A broad cluster-admin kubeconfig is easy for a lab but creates a high-value credential on the hub. For production, use the access model supported by your KubeVela version and test it against required definitions, CRDs, namespaces, and garbage collection.

Also verify network direction. In the default mode, the hub must reach the API server URL embedded in the spoke kubeconfig. A kubeconfig containing `https://127.0.0.1`, a laptop-only hostname, or a private endpoint unreachable from the hub will register poorly or fail later. KubeVela documents OCM as an alternative when managed clusters can reach the hub but direct hub-to-spoke access is unavailable.

## Join a managed cluster

Confirm that the current context is the hub context for `vela`, while passing the spoke kubeconfig as an argument:

```bash
kubectl config current-context
vela cluster join ./cluster-eu-1.kubeconfig \
  --name cluster-eu-1
```

The official `vela cluster join` command accepts a kubeconfig, optional registration name, labels, and cluster engine. Its `--create-namespace` option names a namespace to create in the managed cluster; it is not the workload destination selected later by a topology policy. KubeVela v1.11 republishes Applications that contain an explicit `clusterLabelSelector` during a join, so a cluster whose join-time labels match an existing selector can receive workloads immediately. Inventory existing selectors before joining, especially a catch-all `clusterLabelSelector: {}`, and add governed placement labels only after readiness validation. Keep kubeconfig files out of Git and shell transcripts, restrict their filesystem permissions, and remove temporary copies securely according to your organization's credential procedure.

List and probe the result:

```bash
vela cluster list
vela cluster probe cluster-eu-1
```

Confirm the registration is accepted, endpoint is correct, and the probe succeeds. Then run a read-only API check through your approved access path. Registration success alone does not prove the credential can create every resource used by an Application.

## Add and remove labels deliberately

The current CLI documents these forms:

```bash
vela cluster labels add cluster-eu-1 \
  environment=production,region=eu,tier=general

vela cluster labels del cluster-eu-1 tier
```

Before changing labels, enumerate Applications whose topology selectors might match the old or new set. The changed set will be used when a matching deploy workflow is next evaluated or re-run, even if the Application manifest itself is unchanged.

Use a controlled vocabulary:

- `environment=dev|staging|production`;
- `region=eu|us|apac` or an approved cloud-region code;
- `data-classification=standard|restricted`;
- `capability=gpu` only when the cluster really provides it; and
- `team` or `tenant` only when it is part of an enforced isolation model.

Labels describe scheduling facts; they do not enforce them. Admission policy, RBAC, network isolation, and quotas must still protect production and restricted clusters. Restrict label-management permissions and audit every change.

## Select exact cluster names

For a fixed set:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: payments-api
  namespace: delivery
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/payments@sha256:<verified-digest>
  policies:
    - name: selected-clusters
      type: topology
      properties:
        clusters: ["cluster-eu-1", "cluster-eu-2"]
        namespace: payments
```

Names must match `vela cluster list`. Direct selection is predictable and reviewable, but the manifest must change when fleet membership changes.

## Select clusters by labels

For a governed fleet:

```yaml
  policies:
    - name: eu-production
      type: topology
      properties:
        clusterLabelSelector:
          environment: production
          region: eu
        namespace: payments
```

All documented key/value entries must match. Before applying, manually compare the selector with the label table and record the expected cluster list in the change review. A label selector is evaluated during deployment, so a newly labeled cluster can receive the same Application the next time its deploy workflow runs.

If different clusters need different configuration, create multiple topology policies and pair each with an `override` in explicit `deploy` workflow steps. Do not encode environment differences in cluster names and parse them with external scripts.

## Validate destination readiness

Cluster registration does not install workload prerequisites. For each selected destination, verify:

- namespace and RBAC policy;
- CRDs and controllers required by components or traits;
- supported Kubernetes APIs;
- registry and chart-repository access;
- Secrets and configuration materialization;
- StorageClasses, ingress classes, and load balancers; and
- quota and schedulable capacity.

Use a harmless smoke-test Application before admitting a cluster to a production label. Confirm create, update, health reporting, and deletion behavior-not only a one-time Pod start.

## Deploy and verify selection

```bash
vela show topology
vela dry-run --file payments-api.yaml
vela up --file payments-api.yaml --namespace delivery
vela status payments-api --namespace delivery --tree --detail
```

The resource tree's `updated` rows should include the expected cluster/namespace pairs. It can also show `not-deployed` placements or `outdated` resources from earlier revisions, so do not treat every row as an active deployment. If an expected active target is absent, check labels and workflow policy references. If the target has deployed resources but the workload is unhealthy, registration worked far enough to select it; inspect Cluster Gateway, target admission, and workload health.

## Rename or detach with care

KubeVela exposes rename and detach commands, but those are lifecycle changes, not cosmetic cleanup. An Application can refer to a cluster name directly, and resource tracking may cover workloads already dispatched there. Before renaming or detaching:

1. inventory topology policies and external workflows;
2. inventory managed resources and desired retention behavior;
3. stop new placement through reviewed policy changes;
4. verify credential and garbage-collection consequences; and
5. follow the version-specific cluster management procedure.

Never detach a cluster simply to clear an unhealthy status. Repair endpoint, credentials, or connectivity while preserving ownership records.

## Official Documentation

- [KubeVela `vela cluster join`](https://kubevela.io/docs/cli/vela_cluster_join/)
- [KubeVela cluster command group](https://kubevela.io/docs/cli/vela_cluster/)
- [KubeVela cluster label add](https://kubevela.io/docs/cli/vela_cluster_labels_add/)
- [KubeVela cluster label delete](https://kubevela.io/docs/cli/vela_cluster_labels_del/)
- [KubeVela multi-cluster Application](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela working with OCM](https://kubevela.io/docs/platform-engineers/system-operation/working-with-ocm/)

## Conclusion

Join managed clusters from the hub with a reachable endpoint and appropriately scoped credentials, then probe them before use. Apply a governed label vocabulary, restrict and audit label changes, and review the exact set matched by every topology selector. Registration establishes reachability; destination prerequisites, RBAC, policy, and capacity still determine whether an Application can run safely.

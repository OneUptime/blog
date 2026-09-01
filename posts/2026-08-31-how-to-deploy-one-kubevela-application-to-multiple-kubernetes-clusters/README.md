# How to Deploy One KubeVela Application to Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Continuous Delivery, Application Delivery

Description: Register managed clusters and dispatch one KubeVela Application to several destinations with topology policies, workflows, and cluster-aware verification.

---

KubeVela's multi-cluster model keeps the `Application`, policies, and workflow on a hub cluster. The KubeVela controller renders resources and dispatches them to managed clusters through Cluster Gateway by default. The target clusters run the workload resources; they do not need a separate copy of the hub Application.

This architecture makes the hub a delivery control plane and a security boundary. Protect its cluster credentials, controller RBAC, definitions, and cluster labels accordingly.

## Verify cluster registration

The hub is registered as the special `local` cluster. Managed clusters must be joined by an operator before an Application can select them:

```bash
vela cluster list
vela cluster probe cluster-eu-1
vela cluster probe cluster-eu-2
```

Exact probe output and flags vary by CLI release; use `vela cluster probe --help`. Confirm each cluster is accepted and reachable. With the default Cluster Gateway mode, the hub must be able to reach the API endpoint recorded in the managed cluster's kubeconfig. KubeVela also documents an Open Cluster Management pull-oriented option for networks where the hub cannot directly reach spokes.

Check destination prerequisites independently: namespace policy, storage classes, ingress controllers, CRDs, addons, registry access, resource quota, and Kubernetes version. Multi-cluster dispatch does not make heterogeneous clusters equivalent.

## Select explicit destinations

The simplest Application names clusters in a `topology` policy:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: edge-api
  namespace: delivery
  annotations:
    app.oam.dev/publishVersion: "edge-api-1.12.0"
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/edge-api@sha256:<verified-digest>
        ports:
          - name: http
            port: 8080
            expose: true
      traits:
        - type: scaler
          properties:
            replicas: 3

  policies:
    - name: production-clusters
      type: topology
      properties:
        clusters: ["cluster-eu-1", "cluster-eu-2"]
        namespace: edge-api
```

Replace the image placeholder with a real digest. Cluster names are KubeVela registration names, not kubeconfig context names on an operator's laptop. They must match `vela cluster list` exactly.

When no custom workflow is present, KubeVela can generate deployment behavior for topology policies. An explicit workflow is clearer when policies must be grouped, ordered, or combined with overrides:

```yaml
  workflow:
    steps:
      - name: deploy-production
        type: deploy
        properties:
          policies: ["production-clusters"]
```

## Select clusters by labels

For a changing fleet, use registered-cluster labels:

```yaml
  policies:
    - name: eu-production
      type: topology
      properties:
        clusterLabelSelector:
          environment: production
          region: eu
        namespace: edge-api
```

The selector is equality-based in this documented shape: all key/value pairs must match. Before deployment, list the labels and enumerate the expected cluster set. A typo or stale label can select zero clusters or the wrong ones. Treat changes to routing labels like production configuration and restrict their RBAC.

The `local` cluster cannot be detached or modified like a managed cluster. Include `clusters: ["local"]` explicitly when the hub should also host workloads; do not assume it is automatically part of every multi-cluster topology.

## Apply per-cluster customization

Combine `topology` with `override` in a `deploy` step:

```yaml
  policies:
    - name: eu-primary
      type: topology
      properties:
        clusters: ["cluster-eu-1"]
        namespace: edge-api
    - name: eu-secondary
      type: topology
      properties:
        clusters: ["cluster-eu-2"]
        namespace: edge-api
    - name: secondary-size
      type: override
      properties:
        components:
          - name: api
            traits:
              - type: scaler
                properties:
                  replicas: 2

  workflow:
    steps:
      - name: deploy-primary
        type: deploy
        properties:
          policies: ["eu-primary"]
      - name: deploy-secondary
        type: deploy
        properties:
          policies: ["eu-secondary", "secondary-size"]
```

An override should be paired with a topology policy. Render array and trait changes carefully; KubeVela's property-map and trait-by-type merge behavior can surprise authors who expect generic JSON merge semantics.

## Render and deploy from the hub

```bash
vela def get topology --type policy
vela def get override --type policy
vela show deploy
vela dry-run --file edge-api.yaml
vela up --file edge-api.yaml --namespace delivery
```

The Application namespace is on the hub. The topology `namespace` is the workload destination. KubeVela can be configured to forbid cross-namespace resources, and each spoke enforces its own RBAC. Pre-create namespaces and required Secrets through the owning platform layer unless your approved workflow does so.

## Verify every destination

```bash
vela status edge-api --namespace delivery --tree --detail
vela status edge-api --namespace delivery --pod
vela logs edge-api --namespace delivery
```

The official multi-cluster guide documents cluster-aware status, logs, exec, and port-forward behavior. When several targets match, the CLI can prompt for a cluster/resource. For automation, prefer flags supported by your CLI or query the Application status as structured output.

Verify that each expected cluster appears once, in the intended namespace, with the correct image and replicas. A globally successful delivery also needs external checks: load-balancer registration, DNS or global traffic management, certificate availability, data replication, and region-level health.

If the resource tree shows a target but it is unhealthy, inspect events and logs in that managed cluster. If it shows no target, debug policy selection and workflow references on the hub. These are different failure layers.

## Plan updates and deletion

Because this example sets `app.oam.dev/publishVersion`, update that annotation to a new value for each release; changes to the Application spec or its dependencies do not take effect until a new publish version triggers a fresh workflow run. That run reconciles destinations selected by its workflow and policies. Review label changes before starting or re-running delivery: an expanded selector can send the same release to newly matched clusters.

KubeVela tracks dispatched resources for garbage collection. Removing a topology or deleting an Application can remove managed workloads depending on policy and version. Test lifecycle behavior in a nonproduction fleet and configure documented garbage-collection policy when resources must be retained. Never detach a managed cluster during an active rollout without understanding how resource tracking and credentials will be handled.

## Official Documentation

- [KubeVela multi-cluster Application](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela cluster management CLI](https://kubevela.io/docs/cli/vela_cluster/)
- [KubeVela `vela cluster join`](https://kubevela.io/docs/cli/vela_cluster_join/)
- [KubeVela topology policy reference](https://kubevela.io/docs/end-user/policies/references/#topology)
- [KubeVela working with Open Cluster Management](https://kubevela.io/docs/platform-engineers/system-operation/working-with-ocm/)

## Conclusion

Register and probe target clusters first, then select them through an explicit topology policy and dispatch with a `deploy` workflow step. Keep customization in paired override policies, protect labels and hub credentials, and verify the rendered resource tree in every destination. KubeVela centralizes delivery, but each managed cluster still enforces its own APIs, RBAC, capacity, networking, and runtime health.

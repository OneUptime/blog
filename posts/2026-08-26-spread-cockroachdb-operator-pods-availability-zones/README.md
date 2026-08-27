# How to Spread Operator-Managed CockroachDB Pods Evenly Across Availability Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Availability Zones, Topology Spread, High Availability

Description: Configure GA v1beta1 CockroachDB pods with explicit zone and hostname spread, matching locality labels, and topology-aware storage while preserving schedulability and quorum.

---

CockroachDB cannot survive a zone failure if all database pods happen to land in that zone. Kubernetes topology-spread constraints control pod placement, while CockroachDB locality tells the database where each node runs so it can make data-placement decisions. They are complementary and neither replaces the other.

This guide targets the GA `crdb.cockroachlabs.com/v1beta1` Operator. Current scheduling configuration belongs in `spec.template.spec.podTemplate.spec`. The CRD retains deprecated compatibility fields such as `spec.template.spec.topologySpreadConstraints` and `affinity`, but new configurations must use `podTemplate`; do not copy the public `v1alpha1` operator's top-level scheduling examples.

## Verify the Failure Domains First

Kubernetes only considers nodes that have the requested topology key. List region and zone labels, then inspect the uncordoned nodes in each domain:

```bash
kubectl get nodes \
  -L topology.kubernetes.io/region,topology.kubernetes.io/zone \
  -o wide

kubectl get nodes -o json |
  jq -r '.items[] |
    select(.spec.unschedulable != true) |
    [.metadata.name,
     .metadata.labels["topology.kubernetes.io/region"],
     .metadata.labels["topology.kubernetes.io/zone"]] | @tsv'
```

For zone survival with a three-replica default, provide at least three zones and enough CPU, memory, storage, and pod slots in each. A label does not create an availability zone. Verify that the cloud provider assigned the label correctly and that node pools, taints, quotas, and autoscaling can actually supply a CockroachDB pod there.

The region entry in a `CrdbCluster` is not a list of availability zones. For a single regional Kubernetes cluster in AWS `us-east-1`, configure one region with three nodes; let `topology.kubernetes.io/zone` distinguish `us-east-1a`, `us-east-1b`, and `us-east-1c`. Creating three `spec.regions` entries for three AZs misrepresents the GA Operator's region model.

## Use the Current v1beta1 Pod Template

The following complete example shows the scheduling and locality shape. It assumes the Operator is configured with `cloudRegion=us-east-1` (or `CLOUD_REGION=us-east-1`), and that the external certificate ConfigMap and Secrets, ServiceAccount/RBAC, and `fast-expandable` StorageClass already exist:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
metadata:
  name: cockroachdb
  namespace: cockroachdb
spec:
  mode: MutableOnly
  tlsEnabled: true
  regions:
    - code: us-east-1
      cloudProvider: aws
      namespace: cockroachdb
      nodes: 3
  rollingRestartDelay: 30s
  template:
    spec:
      image: cockroachdb/cockroach:v26.2.5
      certificates:
        externalCertificates:
          caConfigMapName: cockroachdb-ca
          nodeSecretName: cockroachdb.node
          rootSqlClientSecretName: cockroachdb.client.root
      dataStore:
        volumeClaimTemplate:
          metadata: {}
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi
            storageClassName: fast-expandable
            volumeMode: Filesystem
      localityMappings:
        - nodeLabel: topology.kubernetes.io/region
          localityLabel: region
        - nodeLabel: topology.kubernetes.io/zone
          localityLabel: zone
      grpcPort: 26258
      sqlPort: 26257
      httpPort: 8080
      persistentVolumeClaimRetentionPolicy:
        whenDeleted: Retain
      podTemplate:
        metadata:
          labels:
            app.kubernetes.io/name: cockroachdb
            app.kubernetes.io/instance: cockroachdb
            app.kubernetes.io/component: cockroachdb
        spec:
          serviceAccountName: cockroachdb
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: topology.kubernetes.io/region
                        operator: In
                        values:
                          - us-east-1
          topologySpreadConstraints:
            - maxSkew: 1
              minDomains: 3
              topologyKey: topology.kubernetes.io/zone
              whenUnsatisfiable: DoNotSchedule
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: cockroachdb
                  app.kubernetes.io/instance: cockroachdb
                  app.kubernetes.io/component: cockroachdb
            - maxSkew: 1
              topologyKey: kubernetes.io/hostname
              whenUnsatisfiable: DoNotSchedule
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: cockroachdb
                  app.kubernetes.io/instance: cockroachdb
                  app.kubernetes.io/component: cockroachdb
          containers:
            - name: cockroachdb
              resources:
                requests:
                  cpu: "2"
                  memory: 8Gi
                limits:
                  memory: 8Gi
```

Pin a CockroachDB version supported by your tested Operator/chart combination rather than copying this example indefinitely. The selector must match the pod's own labels. If it does not, the scheduler can place "ghost" pods that do not count toward skew. Use cluster-specific labels when more than one CockroachDB cluster shares a namespace.

`maxSkew: 1` permits counts such as 2/2/1 but not 3/1/1 for five pods across three eligible zones. When fewer than three eligible zones exist, `minDomains: 3` makes the scheduler use zero as the global minimum. It is supported by the Kubernetes 1.30 and later versions required by the GA charts, but check the Kubernetes server version and feature-gate state if applying the manifest to an older cluster.

The hostname constraint keeps counts within one across eligible nodes and therefore avoids co-location while enough empty eligible hostname domains exist. It does not guarantee one pod per node after pod count exceeds eligible nodes or the domain set is constrained; use required pod anti-affinity if strict one-per-node placement is a hard requirement. The node-affinity rule keeps this regional cluster on `us-east-1` nodes.

## Understand `DoNotSchedule` Versus `ScheduleAnyway`

`DoNotSchedule` is fail-closed: Kubernetes leaves a new pod Pending when placing it would violate the skew. That proves the spread objective is real, but a missing or full zone can block initial deployment, scale-up, upgrade, or recovery.

`ScheduleAnyway` is a preference. It improves the odds of getting a replacement pod running when a zone has no capacity, but can co-locate failure domains and reduce actual resilience. If you change the sample's zone constraint to `ScheduleAnyway`, remove `minDomains`; Kubernetes permits `minDomains` only with `DoNotSchedule`. Choose deliberately:

- use `DoNotSchedule` when three-zone placement is a hard requirement and the platform guarantees capacity;
- use `ScheduleAnyway` when restoring pod count is more important than strict placement during an outage; and
- monitor skew in both cases, because neither setting automatically relocates already-running pods when capacity later changes.

Do not delete multiple healthy CockroachDB pods to force rebalance. Pod deletion is a database disruption, not a scheduler command. If placement must change, update the declarative template and let the Operator roll one node at a time after confirming unavailable and under-replicated ranges are healthy.

## Make Storage Topology Compatible

A zone-spread rule can conflict with a pre-bound volume. For topology-constrained block storage, prefer a StorageClass with `volumeBindingMode: WaitForFirstConsumer`. Kubernetes then considers the selected pod's scheduling constraints when provisioning the PV.

```bash
kubectl get storageclass fast-expandable \
  -o jsonpath='binding={.volumeBindingMode}{" provisioner="}{.provisioner}{" expansion="}{.allowVolumeExpansion}{"\n"}'

kubectl get pv -o custom-columns='PV:.metadata.name,CLAIM:.spec.claimRef.name,NODE_AFFINITY:.spec.nodeAffinity'
```

With `Immediate` binding, a PV can be provisioned in one zone before the pod is scheduled; volume node affinity can then make the desired zone impossible. Do not change an existing PVC's StorageClass or delete it to fix placement. Moving an existing CockroachDB store between zones is a data migration or node replacement procedure and must follow CockroachDB and storage-provider safety guidance.

Local persistent volumes need even more care: the PV is tied to a node, and a node loss can make that store unavailable. Topology-spread constraints do not make local storage portable.

## Keep Scheduler Placement and CockroachDB Locality Aligned

`localityMappings` causes the Operator's init path to read Kubernetes node labels and build CockroachDB locality tiers such as `region=us-east-1,zone=us-east-1a`. The pod ServiceAccount therefore needs cluster-scoped permission to read Nodes. The CockroachDB chart creates per-release node-reader RBAC by default; split-chart installations must arrange the exact ServiceAccount binding before disabling that chart resource.

Topology spread controls where the pod runs. Locality tells CockroachDB where it runs. Neither alone guarantees a particular database survival goal. Review CockroachDB multi-region database topology, zone configurations, replication factors, and survival settings for the workload. A three-zone pod layout is necessary infrastructure, but it does not prove every range has the placement required for a zone outage.

## Roll Out and Verify Placement

Applying a pod-template change can cause an Operator-managed rolling restart. Take a tested backup, avoid concurrent scale-down or upgrade operations, and monitor the health gate.

```bash
kubectl apply --server-side -f cockroachdb.yaml

kubectl get crdbcluster cockroachdb -n cockroachdb \
  -o jsonpath='{.metadata.generation}{" observed="}{.status.observedGeneration}{" reconciled="}{.status.reconciled}{"\n"}'

kubectl get pods -n cockroachdb \
  -l app.kubernetes.io/name=cockroachdb,app.kubernetes.io/instance=cockroachdb,app.kubernetes.io/component=cockroachdb \
  -o custom-columns='POD:.metadata.name,READY:.status.containerStatuses[0].ready,NODE:.spec.nodeName,ZONE:.metadata.labels.topology\.kubernetes\.io/zone' \
  --sort-by=.spec.nodeName
```

Pod metadata does not normally copy the node's zone label, so the last column may be empty. Join scheduled pod node names to Node labels for an authoritative view:

```bash
kubectl get pods -n cockroachdb \
  -l app.kubernetes.io/name=cockroachdb,app.kubernetes.io/instance=cockroachdb,app.kubernetes.io/component=cockroachdb \
  -o json |
  jq -r '.items[] |
    select(.spec.nodeName != null and .spec.nodeName != "") |
    [.metadata.name, .spec.nodeName] | @tsv' |
while IFS=$'\t' read -r pod node; do
  zone=$(kubectl get node "$node" \
    -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
  printf '%s\t%s\t%s\n' "$pod" "$node" "$zone"
done
```

For a pending pod, inspect scheduler events before weakening the rule:

```bash
kubectl describe pod PENDING_POD -n cockroachdb
kubectl get events -n cockroachdb --sort-by=.lastTimestamp | tail -50
```

Typical messages identify insufficient resources, untolerated taints, volume-node-affinity conflict, or unsatisfied topology spread. Fix the actual platform constraint and allow the Operator to converge.

## Official Documentation

- [GA v1beta1 pod-template example with topology spread](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [GA `CrdbNodeSpec`, `PodTemplate`, and locality mappings](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB Operator API reference and deprecated scheduling fields](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/README.md)
- [GA CockroachDB chart topology-spread defaults](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [Kubernetes Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes node affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity)
- [Kubernetes volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [CockroachDB topology patterns](https://www.cockroachlabs.com/docs/stable/topology-patterns)
- [CockroachDB `--locality` flag](https://www.cockroachlabs.com/docs/stable/cockroach-start#locality)

## Conclusion

Even zone placement requires explicit failure-domain labels, matching pod selectors, schedulable capacity, and topology-aware storage. Put constraints in the GA `v1beta1` pod template, map region and zone labels into CockroachDB locality, and verify the live pod-to-node-to-zone mapping. Treat `DoNotSchedule` as a real availability-versus-recovery tradeoff, and never rebalance a database by deleting several pods or PVCs at once.

# How to Pin vCluster Workloads to Dedicated Host Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Scheduling, Taints and Tolerations, Multi-Tenancy

Description: Enforce a dedicated host-node selector for translated vCluster Pods and inject the exact toleration required by the reserved tenant pool.

---

A taint alone does not pin a workload to a node pool; it only repels Pods that lack a matching toleration. A node selector alone pins the tenant but does not stop unrelated host workloads from using the same nodes. A dedicated vCluster pool needs both, with vCluster enforcing the selector and injecting only the pool's exact toleration.

This guide targets vCluster **0.36** with a containerized control plane and host-backed worker nodes. vCluster calls this Dedicated Nodes architecture: tenant workloads use a selected set of control plane cluster nodes, but still share that cluster's CNI and CSI. It is not the same as the Private Nodes mode in which workers join the tenant cluster directly.

## Label and Taint the Host Node Pool

Choose a label and taint key reserved for tenant placement. Do not reuse a broad label that is also present on ingress, monitoring, storage, VPN, or management nodes.

For example:

```bash
kubectl --context host label node worker-a-1 worker-a-2 worker-a-3 \
  platform.example.com/tenant-pool=team-a

kubectl --context host taint node worker-a-1 worker-a-2 worker-a-3 \
  platform.example.com/tenant-pool=team-a:NoSchedule
```

Confirm the exact result:

```bash
kubectl --context host get nodes \
  -l platform.example.com/tenant-pool=team-a \
  -o custom-columns='NAME:.metadata.name,TAINTS:.spec.taints'
```

Use at least as many nodes and failure domains as the tenant's availability target requires. Placement cannot make three replicas resilient when the selected pool contains only one node.

## Enforce the Selector and Toleration in `vcluster.yaml`

Configure vCluster rather than asking every tenant workload to repeat the placement fields:

```yaml
sync:
  fromHost:
    nodes:
      enabled: true
      clearImageStatus: true
      selector:
        labels:
          platform.example.com/tenant-pool: team-a

  toHost:
    pods:
      enforceTolerations:
        - platform.example.com/tenant-pool=team-a:NoSchedule
```

In vCluster 0.36, `enforceTolerations` is an array of **strings**, using the form `key=value:Effect`. It is not an array of Kubernetes `Toleration` objects. The example adds this host-side toleration to every translated tenant Pod:

```yaml
key: platform.example.com/tenant-pool
operator: Equal
value: team-a
effect: NoSchedule
```

The labels under `sync.fromHost.nodes.selector.labels` serve two related purposes. They restrict which host Nodes are synchronized into the tenant view, and vCluster enforces those label pairs as a node selector on translated Pods that are scheduled by the host. A tenant Pod cannot broaden placement by omitting that selector or supplying a different value for the same key.

Apply the configuration through the source that owns the release:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

`clearImageStatus: true` avoids exposing the host node's image inventory in the tenant Node object. Decide separately whether tenant users need Node visibility and kubelet proxy features; they are not required for ordinary `kubectl logs` or `exec`.

## Keep Control-Plane Placement Separate

The selector above governs translated **tenant workload Pods**. It does not place the vCluster control-plane StatefulSet. Schedule control-plane Pods with `controlPlane.statefulSet.scheduling.nodeSelector`, affinity, topology spread constraints, and Kubernetes-style toleration objects when needed.

Usually the control plane belongs on a platform infrastructure pool, not on the tenant workload pool. Give that pool its own labels and taints so a tenant workload cannot land beside the vCluster process or other management components.

## Do Not Treat Toleration Injection as Filtering

`enforceTolerations` adds the configured toleration. It does not remove tolerations submitted by a tenant. A tenant with permission to create Pods could add an empty-key `Exists` toleration or a toleration for a protected infrastructure taint.

Close that path with admission at both relevant layers:

- Inside the tenant cluster, reject empty-key or wildcard tolerations and allow only a documented set. This sees the tenant Pod before vCluster adds its enforced toleration.
- In the control plane cluster, reject translated Pods that tolerate protected infrastructure taints. Allow vCluster's exact tenant-pool toleration and Kubernetes node-condition tolerations needed for normal operation.

Keep host Node label and taint mutation permissions out of tenant identities. A selector is a placement mechanism, not a hard security boundary; an operator or compromised host identity that can relabel a node changes the eligible pool.

## Verify Both Positive and Negative Placement

Create a tenant test workload without any node selector or toleration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: placement-check
  namespace: default
spec:
  containers:
    - name: pause
      image: registry.k8s.io/pause:3.10
```

Observe the tenant and host views:

```bash
kubectl --context tenant get nodes --show-labels
kubectl --context tenant get pod placement-check -o wide
kubectl --context host -n team-a-vcluster get pods -o wide
```

Inspect the translated host Pod's `spec.nodeSelector`, `spec.tolerations`, and `spec.nodeName`. The selected node must carry `platform.example.com/tenant-pool=team-a` and the configured taint.

Then run negative tests:

1. Remove capacity from the dedicated pool and confirm the Pod remains Pending rather than spilling into a general node pool.
2. Submit a tenant Pod that requests a conflicting value for the enforced selector and confirm the translated Pod still targets `team-a`.
3. Create an unrelated host Pod without the toleration and confirm the taint keeps it off the dedicated pool.
4. Submit a wildcard or protected-infrastructure toleration as the tenant and confirm admission rejects it.

Use `kubectl describe pod` in both contexts to distinguish selector mismatch, untolerated taint, affinity, capacity, and storage topology failures. A Pending Pod can prove the boundary is working when no eligible capacity exists.

## Plan Node-Pool Changes Safely

Add and validate replacement nodes before removing the label from existing ones. A running Pod is not automatically evicted merely because a node label changes, and a `NoSchedule` taint does not evict existing Pods. Use a deliberate drain, appropriate PodDisruptionBudgets, and enough spare capacity to relocate workloads.

Autoscalers must preserve the exact label and taint on every new node. Audit the effective node set periodically; one mistakenly labeled infrastructure node silently becomes eligible for the tenant.

## Official Documentation

- [vCluster: Deploy with isolated workloads](https://www.vcluster.com/docs/vcluster/deploy/worker-nodes/host-nodes/isolated-workloads)
- [vCluster: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster: Node synchronization configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/nodes)
- [vCluster: Pod synchronization configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/core/pods)
- [Kubernetes: Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes: Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)

## Conclusion

Use the vCluster node selector to enforce the eligible host pool, taint that pool to repel unrelated workloads, and inject only its exact toleration as a string. Protect other taints with admission, schedule the control plane separately, and prove the boundary with spillover and wildcard-toleration tests.

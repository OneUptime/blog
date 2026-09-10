# How to Keep StatefulSets and Persistent Volumes Off Spot Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Spot, StatefulSet, Node Affinity, Persistent Volume

Description: Combine Spot taints, required On-Demand placement, and admission policy to keep StatefulSet and PVC-using Pods away from interruptible nodes.

---

A persistent volume can survive a Spot instance interruption while the application still suffers a long outage. Detaching storage, waiting for a replacement in the correct zone, recovering a database, and rebuilding quorum all take time. If the workload's recovery budget cannot tolerate that sequence, enforce its placement on On-Demand nodes.

PersistentVolumes are storage objects, not processes scheduled onto Spot instances. The policy we need controls Pods that belong to StatefulSets or mount PVCs. The example uses Karpenter's `karpenter.sh/capacity-type` label and a Kubernetes 1.30 or later cluster with ValidatingAdmissionPolicy enabled.

## Establish both positive placement and Spot exclusion

First inspect the capacity labels:

```bash
kubectl get nodes -L karpenter.sh/capacity-type,topology.kubernetes.io/zone
```

Do not manufacture an `on-demand` label on a Spot node. The label must reflect how the infrastructure was provisioned. For EKS managed node groups without Karpenter, adapt the policy to that provider's actual label key and values.

Add a Spot taint in the provisioning configuration so replacement nodes inherit it. For an existing Karpenter Spot NodePool, the fragment is:

```yaml
spec:
  template:
    spec:
      taints:
        - key: workload.example.com/interruptible
          value: "true"
          effect: NoSchedule
```

Merge with existing taints. An interruptible worker can explicitly tolerate this taint, but a toleration only permits placement. It does not require placement on that node type. `NoSchedule` also does not evict Pods that are already running. [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)

Give the StatefulSet a positive On-Demand selector:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        karpenter.sh/capacity-type: on-demand
```

A `nodeSelector` is a hard requirement. Required node affinity can express the same decision with an `In` expression; preferred affinity cannot enforce exclusion. This walkthrough standardizes on the selector form so the admission rule can inspect it unambiguously. [Kubernetes node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Reject Pods that omit the requirement

A namespace-scoped rollout is easier to evaluate than immediately enforcing the policy across system workloads. Apply this policy and binding, then opt application namespaces in with a label:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: persistent-workloads-on-demand
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: [v1]
        operations: [CREATE]
        resources: [pods]
  variables:
    - name: protected
      expression: >-
        (has(object.metadata.ownerReferences) &&
         object.metadata.ownerReferences.exists(o, o.kind == 'StatefulSet')) ||
        (has(object.spec.volumes) &&
         object.spec.volumes.exists(v, has(v.persistentVolumeClaim)))
  validations:
    - expression: >-
        !variables.protected ||
        (has(object.spec.nodeSelector) &&
         'karpenter.sh/capacity-type' in object.spec.nodeSelector &&
         object.spec.nodeSelector['karpenter.sh/capacity-type'] == 'on-demand')
      message: StatefulSet and PVC Pods require the On-Demand node selector
    - expression: >-
        !variables.protected ||
        ((!has(object.spec.nodeName) || object.spec.nodeName == '') &&
         (!has(object.spec.schedulerName) ||
          object.spec.schedulerName == 'default-scheduler'))
      message: Protected Pods must use normal default-scheduler placement
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: persistent-workloads-on-demand
spec:
  policyName: persistent-workloads-on-demand
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        workload.example.com/protect-storage: "true"
```

The policy checks CREATE requests for Pods, including Pods created by controllers. A StatefulSet object can therefore be accepted while its subsequent Pod creation is rejected. A separate controller-template policy can provide earlier feedback, but the Pod rule is the enforcement point used here. Kubernetes documents the [policy and binding model](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/).

The `nodeName` check avoids a direct scheduling bypass at creation. Limit permission to the Pod binding subresource and node label modification as part of cluster administration. This is an operational placement rule, not a complete isolation boundary against a cluster administrator.

## Validate acceptance and rejection in staging

Save the policy as `persistent-placement.yaml` and apply it to a test namespace first:

```bash
kubectl apply --dry-run=server -f persistent-placement.yaml
kubectl apply -f persistent-placement.yaml
kubectl create namespace storage-policy-test
kubectl label namespace storage-policy-test \
  workload.example.com/protect-storage=true
```

Try a Pod manifest mounting a PVC without the selector using `kubectl create --dry-run=server -f pod.yaml`. It should receive the policy's rejection message. Add the On-Demand selector and repeat; admission should succeed even if the PVC is not yet bound. Admission acceptance and successful scheduling are separate checks.

Inspect the policy for CEL type-checking warnings and the controller's events if Pod creation fails:

```bash
kubectl get validatingadmissionpolicy persistent-workloads-on-demand -o yaml
kubectl describe statefulset database -n storage-policy-test
```

Test four cases: a StatefulSet Pod, a Deployment Pod mounting a PVC, a stateless worker without a PVC, and a protected Pod with `nodeName` prefilled. This establishes both the intended scope and its boundaries.

## Plan storage topology and migration

Use a StorageClass with `volumeBindingMode: WaitForFirstConsumer` for new topology-constrained volumes when supported by the CSI driver. It lets provisioning account for Pod placement. Existing volumes retain their own topology; changing the StorageClass does not move their data. [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)

Before restarting an existing StatefulSet, ensure On-Demand capacity exists in each bound volume's zone. Roll out using the application's replication and backup procedure. The new taint and CREATE policy do not relocate existing Pods automatically.

The rule deliberately covers ordinary PVC mounts and direct StatefulSet ownership. Local host paths, CSI inline volumes, generic ephemeral volumes, and state kept in external services need their own classification policy if they should also require On-Demand capacity.

## Conclusion

Use a hard positive placement rule, inherit Spot taints through provisioning, and enforce the selected convention at Pod admission. Verify storage topology before migrating existing workloads, because persistent data alone does not guarantee fast recovery.

## Official Documentation

- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [ValidatingAdmissionPolicy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Karpenter NodePools](https://karpenter.sh/docs/concepts/nodepools/)

# Cloud Controller Manager vs CSI vs Load Balancer Controller

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, CSI, Load Balancer Controller, Ingress, Gateway API

Description: Map Kubernetes cloud, storage, and load-balancing resources to CCM, CSI, and specialized controllers without creating overlapping ownership.

---

A cloud-controller-manager (CCM), a Container Storage Interface (CSI) driver, and a load-balancer controller can all call the same provider API, but they do not have interchangeable jobs. The component that owns an incident is determined by the Kubernetes object or parent attachment being reconciled and the external state it must produce.

The safest design has one authoritative reconciler for each external capability or parent attachment. Installing every provider add-on without understanding selection rules can give two controllers the same `LoadBalancer` Service, while omitting a required CSI driver because “the cloud provider is installed” leaves provider-backed persistent-volume operations unimplemented.

## The Practical Ownership Table

| Kubernetes or infrastructure state | Typical owner |
| --- | --- |
| Node ProviderID, region/zone, instance type, and cloud-known addresses | CCM node controller |
| Confirming that an unresponsive Node's backing instance no longer exists | CCM cloud node lifecycle controller, when implemented |
| Cloud route-table entries for Pod CIDRs | CCM route controller, if supported and enabled |
| Default `type: LoadBalancer` Service | CCM service controller or another default Service LB implementation |
| `LoadBalancer` Service with `spec.loadBalancerClass` | A controller configured to watch that class; the default implementation ignores it |
| Ingress | The selected Ingress controller |
| Gateway and Route parent attachments | The Gateway API implementation selected through `GatewayClass`; each accepted Route parent is reconciled by its parent's implementation |
| Provider Application or Network Load Balancer created from Ingress/Gateway | The specialized LB controller selected by class |
| Dynamic provisioning for a CSI StorageClass | CSI external-provisioner plus provider CSI controller |
| Volume attachment, when required | Kubernetes attach/detach controller, CSI external-attacher, provider CSI controller, and `VolumeAttachment` objects |
| Stage and mount on a Node | CSI node plugin and kubelet |
| CSI volume snapshots | Kubernetes snapshot controller, CSI external-snapshotter sidecar, and provider CSI driver |
| Pod connectivity and NetworkPolicy enforcement | Cluster network implementation; NetworkPolicy requires an implementation with enforcement support |
| ClusterIP/NodePort forwarding | kube-proxy or its data-plane replacement |

Provider products can combine binaries or add extensions, so the provider's current documentation remains authoritative. The table describes interface boundaries, not a promise about Pod names.

## What the CCM Does

The CCM isolates infrastructure-specific logic from Kubernetes core. Its standard controllers are:

- **Node:** match Nodes to instances and add provider identity, topology, addresses, and other supported metadata.
- **Cloud node lifecycle:** check whether an unresponsive Node's backing server still exists, sometimes as a separate controller.
- **Route:** program provider routes so Pod CIDRs on different Nodes can communicate, where the network model uses cloud routes.
- **Service:** provision and update external provider infrastructure for `type: LoadBalancer` Services that the implementation owns.

The CCM does not reconcile Deployments, attach CSI volumes, implement Pod networking, or automatically own Ingress and Gateway resources.

For a Service, confirm the owner before reading logs:

```bash
kubectl get service -n app web -o jsonpath='{.spec.type}{"\t"}{.spec.loadBalancerClass}{"\n"}'
kubectl get service -n app web -o yaml
kubectl describe service -n app web
```

An unset `loadBalancerClass` usually leaves the Service available to the cluster's default implementation. When the field is set, the default implementation ignores the Service; a controller configured for the matching value must watch it. Kubernetes does not verify that such a controller exists. Some controllers predate this field and use annotations or admission webhooks, so also inspect annotations and the provider's selection rules.

## What CSI Does

CSI is the storage extension boundary. A full driver commonly has controller-side components for provisioning, deletion, attachment, expansion, and snapshots, plus a node plugin that stages and mounts storage through kubelet.

Trace storage from the claim outward:

```bash
kubectl describe pvc -n app data
kubectl get pv PV_NAME -o yaml
kubectl get storageclass STORAGE_CLASS -o yaml
kubectl get csidrivers
kubectl get volumeattachments
```

For native CSI volumes, the StorageClass `provisioner` and the PV's `spec.csi.driver` name identify the CSI owner. During CSI migration, legacy provisioner and volume fields can remain; check the `pv.kubernetes.io/migrated-to` annotation when present and the provider's migration mapping. An empty ProviderID on a Node can indirectly affect some CSI drivers' topology or instance matching, but the disk operation remains a CSI concern. Fix the CCM identity problem and inspect the CSI controller or node plugin for the storage reconciliation.

External CCM migration and CSI migration are separate. Kubernetes' completion of in-tree cloud-provider removal did not make CCM responsible for volumes. A cluster moving from a historical in-tree integration usually needs an external CCM, the provider CSI driver, and possibly a kubelet image credential-provider plugin as independent components.

## What a Specialized Load-Balancer Controller Does

“Load-balancer controller” is not one universal Kubernetes interface. A provider controller can reconcile:

- Ingress resources selected by `ingressClassName`;
- Gateway objects selected by `gatewayClassName`, with Route attachments selected through `parentRefs`;
- Services selected by `spec.loadBalancerClass`;
- Services selected through controller-specific annotations; or
- provider custom resources describing target groups, backend policies, or load-balancer parameters.

An Ingress controller may itself use one `LoadBalancer` Service to expose its data plane. In that case, the Ingress controller owns HTTP routing, while a Service LB controller owns the external address in front of it. Two controllers participate, but they reconcile different objects.

List the selectors before troubleshooting:

```bash
kubectl get ingressclass
kubectl get gatewayclass
kubectl get service -A -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.loadBalancerClass
```

Do not infer ownership from the provider resource's brand name. An AWS Network Load Balancer, for example, can be created through different integrations depending on cluster configuration and Service annotations. Events, class fields, installed admission webhooks, and controller logs reveal the actual path.

## Avoid Overlapping Reconcilers

Two controllers managing the same cloud load balancer can cause repeated updates, resource replacement, conflicting annotations, or deletion and recreation. Prevent it with explicit selection:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: LoadBalancer
  loadBalancerClass: example.com/provider-lb
  selector:
    app: web
  ports:
    - port: 443
      targetPort: 8443
```

The class is immutable once set. Use the exact value documented by the installed controller; the example value is intentionally fictitious.

For annotation-selected controllers, define an organizational policy for the annotation set and test how the default CCM responds. Do not assume an annotation meaningful to one provider stops another controller from acting.

The same single-owner principle applies to inter-node Pod CIDR routing. If the cluster network implementation is responsible for that routing through BGP or cloud routes, disable the CCM route controller unless the provider and network implementation explicitly document cooperation.

## A Symptom-to-Log Checklist

### Node lacks ProviderID or topology

Inspect the elected CCM or separate cloud-node component, Kubernetes RBAC, cloud IAM, and Node-to-instance identity. CSI and Ingress logs are secondary.

### PVC stays Pending

Inspect the StorageClass, CSI external provisioner, CSI controller, topology constraints, and cloud disk API. A CCM Service controller is unrelated.

### Service external address stays Pending

Inspect `loadBalancerClass`, annotations, Events, and the selected Service controller. If no implementation owns Services, install one suitable for the environment.

### External address exists but HTTP routing is wrong

Verify Service endpoints and the external data path, then inspect the Ingress or Gateway controller. The CCM may have completed its job by provisioning the L4 balancer.

### Volume attaches but will not mount

Inspect the CSI node plugin and kubelet on the target Node. Controller-side provisioning success does not prove node-side filesystem or credential operations work.

## Official Documentation

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Service and loadBalancerClass](https://kubernetes.io/docs/concepts/services-networking/service/#specifying-class-of-load-balancer-implementation)
- [Kubernetes: CSI volumes](https://kubernetes.io/docs/concepts/storage/volumes/#csi)
- [Kubernetes: CSI Volume Health Monitoring](https://kubernetes.io/docs/concepts/storage/volume-health-monitoring/)
- [Kubernetes: Ingress Classes](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class)
- [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/)
- [Kubernetes: Network Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)

## Conclusion

CCM owns cloud Node initialization, optional routes, lifecycle checks, and the default `LoadBalancer` Services assigned to it. A provider CSI driver owns the provider-backed storage operations exposed through that driver. Ingress controllers and Gateway API implementations own resources or parent attachments selected by classes, `parentRefs`, or annotations. Trace the Kubernetes object's class, driver, and parent-reference fields, then follow Events and status to the controller expected to create each external effect. Clear ownership prevents both silent gaps and destructive double reconciliation.

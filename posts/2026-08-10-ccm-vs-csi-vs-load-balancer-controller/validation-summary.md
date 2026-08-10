# Validation Summary: Cloud Controller Manager vs CSI Driver vs Load Balancer Controller: Which Component Owns What?

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Kubernetes cloud-controller-manager (CCM)
- Kubernetes Services and `loadBalancerClass`
- Container Storage Interface (CSI), StorageClasses, PersistentVolumes, and VolumeAttachments
- CSI volume snapshots and sidecar controllers
- Kubernetes Ingress and IngressClass
- Kubernetes Gateway API and GatewayClass
- Kubernetes cluster networking, CNI, NetworkPolicy, and kube-proxy
- AWS Load Balancer Controller
- kubectl, JSONPath, and custom-column output

## Sources Consulted
- Kubernetes Cloud Controller Manager: https://kubernetes.io/docs/concepts/architecture/cloud-controller/
- Kubernetes Service and `loadBalancerClass`: https://kubernetes.io/docs/concepts/services-networking/service/#specifying-class-of-load-balancer-implementation
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- Kubernetes Ingress and IngressClass: https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class
- Kubernetes Gateway API overview: https://gateway-api.sigs.k8s.io/docs/concepts/api-overview/
- Gateway API GatewayClass reference: https://gateway-api.sigs.k8s.io/reference/api-types/gatewayclass/
- Gateway API HTTPRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Gateway API implementer's guide: https://gateway-api.sigs.k8s.io/guides/implementers-guide/
- Kubernetes CSI volumes: https://kubernetes.io/docs/concepts/storage/volumes/#csi
- Kubernetes CSI migration: https://kubernetes.io/docs/concepts/storage/volumes/#migrating-to-csi-drivers-from-in-tree-plugins
- Kubernetes CSI driver deployment architecture: https://kubernetes-csi.github.io/docs/deploying.html
- Kubernetes CSI external-provisioner: https://kubernetes-csi.github.io/docs/external-provisioner.html
- Kubernetes CSI external-attacher: https://kubernetes-csi.github.io/docs/external-attacher.html
- Kubernetes PersistentVolume provisioning: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#provisioning
- Kubernetes dynamic volume provisioning: https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Kubernetes VolumeAttachment API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/volume-attachment-v1/
- Kubernetes volume snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes well-known storage annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/#pv-kubernetes-io-migrated-to
- Kubernetes Network Plugins: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes virtual IPs and Service proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes cloud-provider migration completion: https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/
- Kubernetes kubelet image credential providers: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-credential-provider/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- kubectl `get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described `loadBalancerClass` as registering and delegating to a controller. Kubernetes has no class-registration or dispatch mechanism for this field: the default implementation ignores a Service with the field set, and an independently configured matching controller must watch it. Updated the ownership table and explanation, including the fact that Kubernetes does not verify that a matching controller exists.
- The introduction, provisioning row, and conclusion described CSI as the owner of all persistent volumes and storage operations. PersistentVolumes can be statically provisioned and can use non-CSI storage types. Restricted these claims to required provider-backed CSI operations and dynamic provisioning for CSI StorageClasses.
- The CSI owner-identification guidance did not cover CSI-migrated in-tree objects, whose legacy provisioner and volume fields can remain. Added guidance to inspect `pv.kubernetes.io/migrated-to` when present and consult the provider's migration mapping.
- The attachment row omitted the Kubernetes attach/detach controller and implied every CSI driver uses attachment. Updated it to include the attach/detach controller, `VolumeAttachment`, the CSI external-attacher, and the provider controller, and noted that this path applies only when attachment is required.
- The snapshot row used incomplete, nonstandard ownership terminology. Updated it to name the Kubernetes snapshot controller, CSI external-snapshotter sidecar, and provider CSI driver.
- The networking row implied that every CNI plugin implements NetworkPolicy. Updated it to distinguish the cluster network implementation and state that NetworkPolicy enforcement requires implementation support.
- The route-controller advice said to disable CCM routing whenever a CNI uses BGP. BGP can be used for purposes other than inter-node Pod CIDR routing, so the advice was narrowed to cases where the cluster network implementation is authoritative for that routing.
- The single-owner wording treated every Kubernetes object as having one reconciler and listed one owner for a Gateway API Route. A Route can attach to multiple parents managed by different implementations, each of which reconciles its own attachment and status entry. Scoped the single-owner principle to each external capability or parent attachment and added `parentRefs` to the ownership guidance.
- The introduction said every owner must create an external resource, which did not cover lifecycle checks or node-side mount operations. Changed this to the external state the component must produce.
- The link labeled “Kubernetes: Network Plugins” targeted the parent extensions overview. Updated it to the dedicated Network Plugins page.

## Review Notes
All `kubectl` commands are current and syntactically valid. The Service manifest parsed successfully with kubectl v1.34.1 client-side dry-run; `example.com/provider-lb` is a valid label-style `loadBalancerClass` value. The field has been stable since Kubernetes v1.24, is valid only for `type: LoadBalancer`, and is immutable once set. All documentation links in the post resolve successfully after the Network Plugins target correction. Ingress remains GA but frozen; Kubernetes recommends Gateway API for new features.

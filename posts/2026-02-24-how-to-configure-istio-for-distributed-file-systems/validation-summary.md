# Validation Summary: How to Configure Istio for Distributed File Systems

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar traffic capture annotations
- Istio ServiceEntry, DestinationRule, and Sidecar resources
- Kubernetes Deployments, StatefulSets, Namespaces, and NFS volumes
- NFS
- CephFS, Ceph RADOS, and Ceph messenger ports
- GlusterFS
- kubectl exec and Envoy sidecar diagnostics

## Sources Consulted
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StorageClass NFS documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Ceph network configuration reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph messenger v2 documentation: https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- GlusterFS client setup documentation: https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Clients/
- Istio annotation validation source for numeric port-list parsing: https://github.com/istio/istio/blob/master/pkg/kube/inject/validate.go

## Issues Found
- The Kubernetes `Deployment` examples omitted required `apps/v1` selector and matching pod-template labels. Added `spec.selector.matchLabels` and `template.metadata.labels` to the NFS server, NFS client, and Ceph monitor snippets.
- The `StatefulSet` example omitted required StatefulSet structure, including `serviceName`, selector, matching pod-template labels, and a container spec. Added the missing fields.
- The Istio networking resources used older `networking.istio.io/v1beta1` examples. Updated ServiceEntry, DestinationRule, and Sidecar snippets to the current `networking.istio.io/v1` API version used in the official reference.
- The post implied pod sidecar annotations control Kubernetes-managed NFS volume traffic. Clarified that kubelet mounts Kubernetes NFS volumes on the node, and that pod sidecar annotations only apply when NFS client traffic originates inside the pod network namespace.
- The NFS section treated port 20048 as universal. Clarified that it is commonly used for mountd only when mountd has been configured with a fixed port, and that environments should exclude the actual fixed NFSv3 RPC ports they use.
- The Ceph port range was inaccurate and used Istio annotation syntax that would not validate. Corrected the default Ceph daemon range to 6800-7568 and replaced `6800-7300` annotation usage with guidance to list fixed ports individually, exclude Ceph IP ranges, or keep Ceph daemons out of the sidecar mesh.
- The Ceph security statement implied encryption is always present. Changed it to say Ceph uses cephx authentication and can be configured to encrypt messenger traffic.
- The ServiceEntry section implied external traffic is always blocked without a ServiceEntry. Clarified that this is true for `REGISTRY_ONLY`, while default `ALLOW_ANY` permits unknown outbound traffic with reduced service-registry functionality.
- The GlusterFS example used unsupported port-range syntax in Istio annotations. Replaced the range with individual example brick ports and clarified that brick ports start at 49152 but must be listed individually if port annotations are used.
- The Sidecar section configured an ingress listener for a port that earlier examples excluded. Added a caveat that ingress listeners should only be configured for storage ports that are not excluded from sidecar interception.
- The monitoring section suggested excluded traffic would produce Envoy stats. Clarified that excluded traffic does not produce Envoy protocol metrics and adjusted the example command accordingly.
- The testing section described `ls /data` as testing an NFS mount and assumed NFS sockets always appear in the pod namespace. Clarified that it tests the mounted path, and that kubelet-managed NFS sockets may not appear inside the pod network namespace.

## Review Notes
The article is now technically valid as a configuration guide, but several examples remain illustrative rather than production-ready complete deployments for NFS, Ceph, or GlusterFS. In a future revision, it would be useful to split node-mounted Kubernetes storage paths from in-pod client traffic because they interact with Istio sidecars differently.

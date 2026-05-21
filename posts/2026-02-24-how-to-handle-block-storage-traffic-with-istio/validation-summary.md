# Validation Summary: How to Handle Block Storage Traffic with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and traffic capture annotations
- Istio ServiceEntry, VirtualService, DestinationRule, and AuthorizationPolicy resources
- Kubernetes Deployments, DaemonSets, NetworkPolicies, and kubectl debug
- Kubernetes CSI storage drivers
- iSCSI, NVMe over Fabrics over TCP, and Ceph storage ports

## Sources Consulted
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DNS and ServiceEntry behavior: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes CSI driver deployment documentation: https://kubernetes-csi.github.io/docs/deploying.html
- RFC 7143 for iSCSI default port 3260: https://datatracker.ietf.org/doc/rfc7143/
- NVMe over Fabrics specification for TCP ports 4420 and 8009: https://nvmexpress.org/wp-content/uploads/NVMe-over-Fabrics-1.1-2019.10.22-Ratified.pdf
- Ceph common settings for monitor ports: https://docs.ceph.com/en/latest/rados/configuration/common/
- Ceph network configuration for daemon port ranges: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/

## Issues Found
- The Kubernetes `apps/v1` Deployment and DaemonSet examples omitted required `spec.selector` fields and matching pod template labels. Added selectors and labels so the manifests are valid for current Kubernetes APIs.
- The initiator-side Deployment example had no pod `spec` or container, so it would not be accepted as a usable Deployment manifest. Added a minimal container to keep the example valid.
- The Istio traffic-management and authorization examples used `v1beta1` API versions. Updated them to current `networking.istio.io/v1` and `security.istio.io/v1` API versions shown in Istio's current reference docs.
- The NVMe/TCP port description treated 4420 as the blanket default. Updated it to reflect that 4420 is assigned and commonly used for NVMe-oF/NVMe/TCP I/O controllers, discovery controllers default to 8009, and the actual I/O controller port should follow the advertised TRSVCID.
- The ServiceEntry guidance said hardcoded STATIC IPs are always better because DNS adds latency. Reworded it to recommend STATIC only when storage target IPs are stable, while preserving vendor-supported DNS discovery or failover when required.
- The NetworkPolicy section implied a policy can ensure block storage traffic can always flow. Reworded it to the narrower, accurate scope of avoiding accidental blocking for pod-level storage target traffic.
- The `kubectl debug` commands used `busybox` to run `iscsiadm` and `nvme`, but BusyBox does not normally include those tools and node debug mounts the host filesystem at `/host`. Updated the examples to use `ubuntu` and run the host tools through `chroot /host`.
- The Ceph RADOS port range used the older `6800-7300` range. Updated it to `6800-7568` to match current Ceph network configuration documentation.

## Review Notes
- The article correctly recommends keeping latency-sensitive storage data paths out of the Istio sidecar and using mesh features mainly for management APIs.
- `traffic.sidecar.istio.io/excludeInboundPorts` and `traffic.sidecar.istio.io/excludeOutboundPorts` are valid Istio pod annotations, but they are documented as alpha annotations, so future Istio release notes should be checked before relying on them long term.
- `kubectl debug node/...` commands depend on host-installed storage utilities and cluster permissions to create node debug pods.

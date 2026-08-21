# Validation Summary: How to Map a Host Service into a vCluster Without Duplicating Workloads

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- vCluster 0.36 service replication
- Kubernetes Services, Endpoints, and EndpointSlices
- Kubernetes DNS and service discovery
- Kubernetes NetworkPolicy and CNI enforcement
- `vcluster` and `kubectl` command-line tools
- BusyBox DNS and TCP diagnostics

## Sources Consulted
- [vCluster 0.36: Replicate networking services](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/networking/replicate-services)
- [vCluster 0.36: Networking configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/networking/)
- [vCluster 0.36: Network policy configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/network-policy)
- [vCluster 0.36: RBAC configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/rbac)
- [vCluster 0.36: `vcluster create` CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster 0.36 source: Service replication controller](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/servicesync/servicesync.go)
- [vCluster 0.36 source: replication registration and mapping](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/register.go)
- [vCluster 0.36 source: replicated-Service cleanup](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/setup/cleanup.go)
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: `kubectl run`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [BusyBox command reference](https://busybox.net/downloads/BusyBox.html)

## Issues Found
- The EndpointSlice commands used the default table output, which does not expose each endpoint's readiness condition. Added `-o yaml` so readers can verify `endpoints[].conditions.ready` as instructed.
- The TCP test had no explicit timeout, and the one-shot log command could return before `nc` finished. Added BusyBox `nc -w 5`, followed the Pod logs, and allowed up to two minutes for the Pod to start.
- The diagnostic Pod was created explicitly in `default`, but the log and delete commands relied on the current context's namespace. Added `--namespace default` to both commands so they address the Pod that the example creates.
- The fully qualified Service name assumed the default Kubernetes cluster domain without saying so. Clarified that the example uses the default `cluster.local` domain.
- The NetworkPolicy example permits TCP port 5432 to the selected host namespace rather than one unique Service. Corrected the surrounding wording to describe that actual scope and clarified that the example's backend Pods listen on TCP port 5432.

## Review Notes
- In vCluster 0.36, `fromHost` creates a headless tenant Service and a legacy `core/v1 Endpoints` object. The tenant control plane mirrors that object into EndpointSlices. For a normal host ClusterIP Service, the tenant endpoint represents the host Service ClusterIP rather than the host backend Pods, so host-side endpoint readiness must still be checked separately as the post instructs.
- vCluster's default generated RBAC grants cluster-wide read access to Services and Endpoints when `fromHost` replication is configured. The post's RBAC troubleshooting advice is especially relevant when generated ClusterRole permissions are disabled, restricted, or replaced.
- The namespace-only egress selector allows all matching destinations in `shared-services` on TCP port 5432. Operators can combine it with a Pod selector when the backend has stable labels and should test Service translation behavior with their CNI.
- Removing a `fromHost` mapping removes the replicated tenant Service, but a tenant namespace that vCluster created for the mapping is not automatically removed.

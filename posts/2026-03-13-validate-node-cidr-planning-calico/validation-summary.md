# Validation Summary: Validate Node CIDR Planning with Calico

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes networking
- Kubernetes ServiceCIDR and kube-proxy configuration

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes Extend Service IP Ranges documentation: https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/

## Issues Found
- The introduction described planning IP ranges for Kubernetes nodes. Calico IPAM allocates pod IPs from IP pools and does not normally use Kubernetes `Node.spec.podCIDR`, so the wording was corrected to pod IP ranges and Calico IP pool/block allocation.
- Step 2 described `calicoctl ipam show --show-blocks` as listing assigned nodes and suggested grepping it by node name. Current Calico documentation shows this command as a pool and block utilization view, so the wording was corrected and block affinity inspection was added for Kubernetes datastore clusters.
- Step 3 claimed the block count command showed allocated versus available blocks. The command only counts currently displayed allocated blocks, so the comment was corrected.
- Step 3 suggested inspecting node annotations for per-node IPAM data. This was replaced with a `Node.spec.podCIDR` check and a note that Calico IPAM normally does not use that field for pod IP allocation.
- Step 4 showed applying a new `blockSize` to an existing `default-ipv4-ippool`. Calico documents that `blockSize` can only be set when an IPPool is created, so the example was changed to create a new planned pool and added guidance to migrate existing pools instead of changing `blockSize` in place.
- Step 5 described kube-proxy `clusterCIDR` as the Service CIDR. Kubernetes documents kube-proxy `cluster-cidr` as the pod CIDR used for local traffic detection, so the comment was corrected and a `kubectl get servicecidr` check was added for clusters using ServiceCIDR resources.
- The best-practice guidance for `blockSize` incorrectly said to set it to at most half the node's `max-pods`. It was replaced with Calico-aligned guidance to keep enough blocks for nodes and enough addresses per block for expected pod density.

## Review Notes
The post remains generally accurate as a Calico IPAM planning checklist after the fixes. The `kubectl get servicecidr` command applies to Kubernetes clusters with the ServiceCIDR API enabled; older clusters may still require checking kube-apiserver `--service-cluster-ip-range` configuration through their installation method.

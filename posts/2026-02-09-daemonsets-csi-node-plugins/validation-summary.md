# Validation Summary: How to use DaemonSets for storage plugin drivers like CSI node plugins

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes DaemonSets
- Container Storage Interface (CSI)
- CSI node plugins
- CSI node-driver-registrar sidecar
- CSI livenessprobe sidecar
- AWS EBS CSI driver
- Kubernetes CSI NFS driver
- Kubernetes hostPath volumes and mount propagation
- Kubernetes securityContext and RBAC
- kubectl troubleshooting commands

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes CSI deployment documentation: https://kubernetes-csi.github.io/docs/deploying.html
- Kubernetes CSI node-driver-registrar documentation: https://github.com/kubernetes-csi/node-driver-registrar
- Kubernetes CSI livenessprobe documentation: https://github.com/kubernetes-csi/livenessprobe
- Kubernetes volume mount propagation documentation: https://kubernetes.io/docs/concepts/storage/volumes/#mount-propagation
- Amazon EKS documentation for the Amazon EBS CSI driver: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Upstream AWS EBS CSI driver node DaemonSet manifest: https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/deploy/kubernetes/base/node.yaml
- Upstream Kubernetes CSI NFS driver v4.6.0 node DaemonSet manifest: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/deploy/v4.6.0/csi-nfs-node.yaml

## Issues Found
- The AWS EBS CSI driver DaemonSet example was outdated compared with the upstream node manifest. Updated the example to use the current EBS CSI driver and sidecar images, current node affinity for unsupported EKS compute types, current `hostNetwork: false` setting, service account, pod security context, current logging and mount-point arguments, readiness probe, node-driver-registrar HTTP health endpoint, and probe volume.
- The AWS EBS explanation said tolerations allowed the DaemonSet to run on all nodes. Updated it to mention tolerations plus node affinity for supported EC2 nodes, matching current EBS CSI behavior.
- The NFS CSI livenessprobe sidecar used `--health-port=29653` with `livenessprobe:v2.12.0`. Updated it to `--http-endpoint=localhost:29653`, matching the upstream v4.6.0 manifest.
- The NFS CSI example included the livenessprobe sidecar but did not define the Kubernetes `livenessProbe` on the driver container. Added the HTTP liveness probe so Kubernetes can act on the sidecar's health endpoint.
- The security section said CSI node plugins should always run in `kube-system` with RBAC permissions. Reworded this to say they are commonly run in `kube-system` and should use the narrowest RBAC needed, because not every node sidecar needs Kubernetes API RBAC.

## Review Notes
All YAML snippets were parsed successfully after the edits. The examples are still illustrative and omit some production chart details such as resources and lifecycle hooks, but the remaining content is technically accurate for the scope of the post.

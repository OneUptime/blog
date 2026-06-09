# Validation Summary: How to Configure K3s Service Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- K3s ServiceLB (formerly Klipper LB)
- Kubernetes Services (type: LoadBalancer)
- DaemonSets and host port networking
- MetalLB (as ServiceLB alternative)
- HAProxy (as external load balancer)
- Helm (for MetalLB install)
- kubectl, netstat, ss, dig (CLI tools)

## Sources Consulted
- K3s Networking Services documentation: https://docs.k3s.io/networking/networking-services
- K3s source code (`pkg/cloudprovider/servicelb.go`): https://github.com/k3s-io/k3s/blob/master/pkg/cloudprovider/servicelb.go
- MetalLB documentation: https://metallb.universe.tf/
- MetalLB Helm chart: https://github.com/metallb/metallb/tree/main/charts/metallb
- Kubernetes Service documentation (for `loadBalancerIP` deprecation in v1.24+)

## Issues Found

1. **`lbpool` placement: annotation -> label.** The original post placed `svccontroller.k3s.cattle.io/lbpool: "frontend"` under `metadata.annotations` on the Service. Per the K3s source (`newDaemonSet` in `servicelb.go` reads `svc.Labels[daemonsetNodePoolLabel]`) and the official K3s networking docs, this key must be set as a **label** on both the Service and matching Nodes — annotations are not consulted. Changed `annotations:` to `labels:` in the YAML snippet and updated the surrounding prose to match.

2. **Misleading "controller pods" comment.** The original verification snippet said `# Check if ServiceLB controller pods exist` above `kubectl get pods -n kube-system | grep svclb`. The svclb-* pods are DaemonSet **data-plane** pods, not controller pods — the ServiceLB controller runs inside the k3s server process itself, not as a separate pod. Reworded the comments to clarify that the controller is in-process and that the svclb-* pods are the per-service DaemonSet pods.

3. **Incomplete `kubectl apply` for the example.** The YAML block defined both `deployment.yaml` and `service.yaml` as separate files (marked by `---` and filename comments), but the bash block only ran `kubectl apply -f deployment.yaml`, leaving the Service unapplied. Added `kubectl apply -f service.yaml` so the example actually creates the LoadBalancer service.

## Review Notes
- The post uses `loadBalancerIP` to request a static IP. This Service field is deprecated upstream as of Kubernetes 1.24 but is still honored by K3s ServiceLB. The post does not mention the deprecation. Not strictly incorrect for K3s today, but worth flagging in a future revision if/when K3s changes behavior.
- The post claims ServiceLB pods bind directly to node host ports via host networking. This is accurate — the svclb DaemonSet pods use `hostPort` mappings and rely on the node's network namespace to forward to the ClusterIP.
- `INSTALL_K3S_EXEC="--disable=servicelb"` for the K3s installer is correct.
- MetalLB CRDs (`IPAddressPool`, `L2Advertisement`, both `metallb.io/v1beta1`) and Helm chart commands are current as of MetalLB v0.13+.
- HAProxy config example is syntactically valid.
- Minor non-technical observation: the "Resource Limits for ServiceLB" heading on line 508 is missing the `###` markdown prefix. Left untouched since it does not affect technical accuracy.

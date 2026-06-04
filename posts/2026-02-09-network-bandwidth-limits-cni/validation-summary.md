# Validation Summary: How to configure network bandwidth limits with CNI plugins

## Status
validated

## Post Type
Tutorial / Kubernetes networking guide

## Technologies Covered
- Kubernetes Pod annotations and Deployments
- CNI bandwidth plugin
- Linux traffic control (`tc`)
- Calico QoS controls
- Flannel CNI chaining
- iperf3
- Prometheus node_exporter textfile collector
- Kubernetes Go client (`client-go`)

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Quantity API reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/quantity-resource/
- CNI bandwidth plugin documentation: https://www.cni.dev/plugins/current/meta/bandwidth/
- CNI plugins GitHub releases: https://github.com/containernetworking/plugins/releases/latest
- Calico QoS Controls documentation: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Flannel CNI plugin documentation: https://github.com/flannel-io/cni-plugin
- Prometheus node_exporter textfile collector documentation: https://github.com/prometheus/node_exporter

## Issues Found
- The CNI plugin install example used `v1.3.0` and extracted `bandwidth` directly from the archive. Updated the version to `v1.9.1` and changed extraction to `./bandwidth`, matching the current release tarball layout.
- The annotation unit list incorrectly described uppercase `K`, lowercase `m`, and lowercase `g` as valid kilo/mega/giga suffixes. Updated the list to match Kubernetes `Quantity` suffixes: `k`, `M`, `G`, and binary suffixes such as `Ki`, `Mi`, `Gi`.
- The traffic-control verification expected HTB qdisc/class output. The CNI bandwidth plugin uses TBF and IFB, so the examples now use `tc qdisc` output and show TBF.
- The Calico section used a non-existent/invalid `singleBandwidthPolicy` resource and `calicoctl get bandwidthpolicy`. Replaced it with documented Calico QoS annotations on a Deployment template.
- The monitoring examples parsed HTB class output. Updated them to inspect qdisc output and parse a TBF rate.
- The Go controller snippet imported `corev1` without using it, which would prevent compilation. Removed the unused import.

## Review Notes
The Kubernetes bandwidth annotations are still documented as experimental. Calico's native QoS annotations can take effect without pod recreation, while the Kubernetes bandwidth plugin path requires pods to be recreated for annotation changes to take effect.

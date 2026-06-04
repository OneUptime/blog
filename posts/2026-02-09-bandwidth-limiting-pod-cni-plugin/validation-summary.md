# Validation Summary: How to Implement Bandwidth Limiting per Pod Using CNI Bandwidth Plugin

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes CNI network plugins
- CNI bandwidth meta plugin
- Linux traffic control (`tc`)
- NetworkPolicy
- Mutating admission webhooks
- Prometheus and Grafana metrics
- Kubelet summary metrics

## Sources Consulted
- Kubernetes Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Network Plugins: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- CNI bandwidth plugin documentation: https://www.cni.dev/plugins/current/meta/bandwidth/
- CNI plugins releases: https://github.com/containernetworking/plugins/releases
- `iperf3` documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The post implied broad support across CNIs. Updated the wording to say the bandwidth plugin works with CNI configurations that support chained plugins and noted that Kubernetes treats the bandwidth annotations as experimental.
- The install command pinned CNI plugins `v1.3.0`. Updated it to resolve the latest CNI plugins release from the official GitHub API and fixed the download/extract commands to use a consistent architecture variable.
- The Calico and Flannel examples used `cniVersion: "0.3.1"`. Updated them to `0.4.0`, matching Kubernetes CNI configuration examples.
- The iperf test used `nginx:alpine` as the server and installed `iperf3` at runtime. Updated the server to use the same `nicolaka/netshoot` tools image and run `iperf3 -s -D`; removed package install commands from the test.
- The "Test Without Limits" step removed a pod annotation from an already-running pod. Updated the instructions to remove the annotation from the manifest and recreate the pod, because CNI bandwidth settings are applied when the pod network is created.
- The traffic-control inspection example selected the first host veth interface and showed HTB output. Updated it to inspect the pod network namespace with `crictl inspectp` and `nsenter`, and changed the example output to `tbf`, which is what the CNI bandwidth plugin configures.
- The monitoring example used the old standalone cAdvisor port-forward pattern. Updated it to query kubelet node stats through the Kubernetes API server.
- The NetworkPolicy example suggested selective bandwidth limiting and selected no pods because the pod lacked a matching label. Updated the section to clarify that NetworkPolicy controls allowed destinations while the bandwidth annotation still applies to all pod egress, and added the missing pod label.

## Review Notes
The examples remain provider-dependent because managed Kubernetes distributions and CNI installers may own or regenerate CNI configuration files. Future improvements could include provider-specific installation notes for Calico, Flannel, Cilium, and managed cloud clusters.

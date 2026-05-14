# Validation Summary: Adjusting Cilium CNI Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CNI
- Helm
- VXLAN MTU tuning
- CNI chaining and portmap
- kubectl debug

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration.html
- Cilium portmap chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-portmap/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI connectivity test reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium debug CLI monitor reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- CNI specification: https://www.cni.dev/docs/spec/

## Issues Found
- The post used `/etc/cni/net.d/05-cilium.conf`, but Cilium's default managed CNI file is `/etc/cni/net.d/05-cilium.conflist`. Updated file references and examples to use `.conflist`.
- Several examples accessed `/etc/cni/net.d` or `/opt/cni/bin` directly from commands that are meant to be run from an administrator workstation or a node debug pod. Kubernetes node debug pods mount the node root filesystem at `/host`, so these commands would inspect or modify the debug container instead of the node. Updated the examples to use `kubectl debug node/...` with `/host/...` paths.
- Commands executed `cilium config view` and `cilium monitor` inside the Cilium DaemonSet. The in-agent CLI documented for local agent inspection is `cilium-dbg`, so these were changed to `cilium-dbg config get mtu` and `cilium-dbg monitor`.
- Helm upgrade examples changed Cilium settings without ensuring Cilium agent pods roll out. Cilium documents `rollOutCiliumPods=true` for automatic agent rollout when ConfigMap-backed configuration changes, so the examples now include that value.
- The MTU validation loop checked the first host link, which does not validate Cilium's MTU and may just print the host NIC or loopback MTU. Updated it to inspect `cilium_vxlan` for VXLAN mode.
- The first netshoot test pod had no long-running command and could exit before the connectivity test. Updated it to run `sleep 3600`.
- The new-node troubleshooting note referred to a DaemonSet `install-cni` init container. Current Cilium documentation describes the agent writing the CNI configuration after initialization, while CNI binaries are handled separately. Updated the note and command to check Cilium pod logs for CNI messages.

## Review Notes
- The portmap chaining guidance is valid for clusters where Cilium is deployed with `kubeProxyReplacement=false`; Cilium's documentation notes that HostPort is supported natively through Cilium's eBPF kube-proxy replacement starting with Cilium 1.8, so portmap chaining is not always required.
- The VXLAN MTU values are reasonable examples for 1500 and 9000 byte underlays, but real environments should account for any additional encapsulation, cloud fabric, or encryption overhead.

# Validation Summary: Troubleshooting a New Cilium Installation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Container Network Interface (CNI)
- Helm

## Sources Consulted
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Kubernetes Configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes Requirements documentation: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium CLI `cilium status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `cilium connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI `cilium sysdump` reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post used `cilium` for commands executed inside the Cilium agent pod. Current Cilium troubleshooting documentation uses `cilium-dbg` inside Cilium pods, so I changed the in-pod status and IP inspection commands to `cilium-dbg`.
- The operator check used a label selector that is not the primary documented way to inspect the operator. I changed it to `kubectl get deployment -n kube-system cilium-operator`, matching Cilium operator documentation.
- The MTU check included a bare `ip link show`, which would inspect the user's local machine unless run on a node. I changed it to run inside the Cilium DaemonSet pod.
- The CNI checks used host paths directly. Because the guide otherwise runs commands through `kubectl`, I changed them to inspect `/host/etc/cni/net.d/` from the Cilium pod, which is where Cilium mounts the node CNI config directory.
- The CNI conflict note said alphabetical order decides the active CNI config. That can be true for runtimes reading a CNI config directory, but Cilium's default behavior is to take ownership of the CNI directory and remove or back up non-Cilium configs when `cni.exclusive=true`. I updated the note to reflect Cilium's documented behavior.
- The post used `kubectl version --short`, but current Kubernetes `kubectl version` documentation no longer lists `--short`. I changed it to `kubectl version`.

## Review Notes
The guide is version-neutral. Cilium kernel and Kubernetes compatibility requirements vary by Cilium release, so future revisions could mention checking the exact Cilium version's requirements page before upgrading kernels or Kubernetes.

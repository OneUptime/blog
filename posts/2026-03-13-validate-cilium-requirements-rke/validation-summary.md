# Validation Summary: Validate Cilium Requirements on RKE

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Rancher Kubernetes Engine 1 (RKE1)
- Rancher Kubernetes Engine 2 (RKE2)
- kubectl
- HelmChart and HelmChartConfig resources
- containerd
- eBPF

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Helm integration: https://docs.rke2.io/add-ons/helm
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Cilium installation using Rancher Kubernetes Engine: https://docs.cilium.io/en/stable/installation/k8s-install-rke/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- RKE1 network plug-ins documentation: https://rke.docs.rancher.com/config-options/add-ons/network-plugins

## Issues Found
- The introduction implied that RKE1 supports Cilium as a built-in CNI option. RKE1's built-in network plug-ins are Flannel, Calico, Canal, and Weave; the Cilium guide instructs RKE1 users to set `network.plugin: none` and install Cilium separately. Updated the wording and RKE1 configuration note.
- The `kubectl version --short` command is no longer listed in current Kubernetes generated reference documentation. Replaced it with `kubectl version`.
- The RKE2 example showed `disable: rke2-canal` alongside `cni: cilium`. Current RKE2 documentation says the `cni` key selects the bundled CNI, and the `disable` reference does not list `rke2-canal` as a standard packaged component to disable. Removed the explicit Canal disable example.
- The kernel guidance said all listed operating systems require kernel 5.4+ for full Cilium feature support. Current Cilium system requirements list kernel 5.10+ or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel. Updated the requirement statement.
- The RKE2-specific containerd check described `cgroup-root` as a containerd socket setting and attempted to inspect the RKE2 containerd socket from inside a Cilium pod. `cgroup-root` is unrelated to the containerd socket, and RKE2 documents the containerd socket at `/run/k3s/containerd/containerd.sock` for host-side tools. Reworded the section and replaced the pod exec check with a host-side `ctr` command.
- The best-practice note told readers to disable Canal/Flannel explicitly when using `cni: cilium`. Updated it to recommend either RKE2's bundled `cni: cilium` path or `cni: none` for an upstream Cilium install.

## Review Notes
The remaining commands are plausible validation and troubleshooting commands for clusters where Cilium is installed in `kube-system` with the usual `k8s-app=cilium` labels. RKE2 bundles a Rancher-maintained `rke2-cilium` chart, so exact Cilium values and supported Kubernetes versions should still be checked against the RKE2 release and bundled chart version in production.

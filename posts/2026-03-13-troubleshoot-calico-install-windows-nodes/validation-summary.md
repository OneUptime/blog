# Validation Summary: How to Troubleshoot Installation Issues with Calico on Windows Nodes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico for Windows
- Kubernetes Windows nodes
- Windows Host Network Service (HNS)
- Windows Firewall
- Windows Server Containers feature
- containerd CNI configuration
- PowerShell

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows operator installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico for Windows troubleshooting: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot
- Calico system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Installation API reference for Windows CNI directories: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes Windows networking overview: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Microsoft Windows container requirements: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/system-requirements
- containerd Windows installation and CNI directory configuration: https://containerd.io/docs/getting-started/

## Issues Found
- The post treated `CalicoNode` and `CalicoFelix` Windows services as universally present. Updated Step 1 to distinguish manual installations from operator-based HostProcess installations, where Calico runs in `calico-node-windows` pods and logs are checked with `kubectl logs`.
- The post referenced a likely incorrect `calico-node.log` path. Updated the log checks to list the default `C:\CalicoWindows\logs` directory and inspect known Calico Windows log files such as `tigera-node.err.log`, `felix.log`, and `confd.log` when present.
- The post described Hyper-V as a generally required Windows feature. Kubernetes Windows containers use process isolation and do not support Hyper-V isolation, so Step 3 now checks and installs the `Containers` feature only.
- The HNS section said Calico creates a VXLAN HNS network. Calico documentation states Calico IPAM blocks are represented as HNS `l2bridge` networks, so the explanation was corrected and the HNS module import plus endpoint inspection command were added.
- The firewall command only allowed inbound UDP 4789. Calico documentation requires VXLAN UDP 4789 bidirectionally between nodes, so an outbound rule was added and the wording now says the rule applies between nodes.
- The containerd CNI config example used `C:\ProgramData\containerd\cni\conf\calico.conf`, which is not the operator install default shown by Calico documentation. Updated the example to `C:\etc\cni\net.d\10-calico.conflist` and noted that the path must match containerd's configured CNI `conf_dir`.
- Corrected the `Window` tag to `Windows`.

## Review Notes
The guide is now technically valid as a general troubleshooting guide, but Calico for Windows behavior still depends on installation mode and Calico/Kubernetes versions. Future improvements could split manual and operator-based HostProcess troubleshooting into separate sections for clarity.

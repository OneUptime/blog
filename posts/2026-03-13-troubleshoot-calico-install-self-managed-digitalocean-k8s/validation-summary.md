# Validation Summary: How to Troubleshoot Calico on DO Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kubernetes CNI
- calicoctl
- DigitalOcean Droplets and VPC networking

## Sources Consulted
- Calico Open Source documentation: Configure IP autodetection: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico Open Source documentation: Troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Open Source documentation: Install Calico for self-managed deployments: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Open Source documentation: Customize Calico configuration: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico Open Source documentation: calicoctl ipam commands: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: calicoctl ipam show command reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- DigitalOcean documentation: Private Droplets networking differences: https://docs.digitalocean.com/products/droplets/details/private-droplets/
- DigitalOcean Metadata API documentation: Network interfaces: https://docs.digitalocean.com/reference/api/metadata/network-interfaces/
- Kubernetes documentation: Taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The post used `kube-system` for Calico pod checks and logs while also referencing the Tigera operator. Current operator-based Calico installs use `calico-system`; manifest-based installs use `kube-system`. Updated the commands to use `calico-system` and added notes for manifest-based installs.
- The IP autodetection fix patched the `calico-node` DaemonSet directly, which is correct for manifest-based installs but not for operator-managed installs. Added the operator-supported `Installation` resource patch and kept the DaemonSet command for manifest-based installs.
- The DigitalOcean interface guidance implied `eth1` was the private interface in all cases. Updated the text to note that traditional Droplets usually use `eth1` for private IPv4, while Private Droplets use `eth0`.
- The re-apply step said to re-apply the operator or manifest but only showed the raw manifest command. Added the operator and custom resource re-apply commands, and kept the raw manifest command for manifest-based installs.
- The Calico manifest URL used `v3.27.0`, which is outdated for a 2026 post. Updated it to the current Calico Open Source `v3.32.0` manifest URL and used the same version for the operator resources.

## Review Notes
The `kubectl` binary was not available in the local workspace, so Kubernetes command syntax was checked against official Kubernetes and Calico documentation rather than local `kubectl --help` output. The post now remains concise but distinguishes the two major Calico installation modes, which is important because the namespaces and supported configuration methods differ.

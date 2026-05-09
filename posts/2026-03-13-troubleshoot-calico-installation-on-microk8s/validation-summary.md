# Validation Summary: How to Troubleshoot Installation Issues with Calico on MicroK8s

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MicroK8s
- Kubernetes
- Calico CNI
- CoreDNS
- snap
- systemd journal

## Sources Consulted
- MicroK8s CNI Configuration: https://microk8s.io/docs/change-cidr
- Canonical MicroK8s CNI Configuration: https://canonical.com/microk8s/docs/configure-cni
- MicroK8s Troubleshooting: https://microk8s.io/docs/troubleshooting
- MicroK8s Command Reference: https://microk8s.io/docs/command-reference
- MicroK8s Snap Store install page: https://snapcraft.io/microk8s
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool

## Issues Found
- The post described `microk8s enable calico` and `microk8s disable calico` as add-on operations. Current MicroK8s documentation describes Calico as the default CNI, not a separately enabled `calico` add-on. I changed the symptom description and remediation steps to re-apply `/var/snap/microk8s/current/args/cni-network/cni.yaml` and restart the `calico-node` DaemonSet.
- The IP pool conflict fix used standalone `calicoctl` commands and created an IPIP pool. MicroK8s documentation recommends changing `CALICO_IPV4POOL_CIDR` in the MicroK8s CNI manifest, aligning `--cluster-cidr` in `kube-proxy`, applying the manifest, restarting MicroK8s, and deleting the existing default IPPool if needed. I replaced the commands with that documented MicroK8s workflow.
- The last-resort reinstall pinned MicroK8s to `1.28/stable` and then ran `microk8s enable calico`. The pinned channel is outdated for a general guide, and the Calico enable command is not valid for current MicroK8s. I changed it to install the default stable MicroK8s snap and wait for readiness.

## Review Notes
- The post remains a high-level troubleshooting guide. For future improvement, it could mention firewall-specific MicroK8s troubleshooting from the official docs, such as allowing traffic on `vxlan.calico` and `cali+` when UFW is enabled.

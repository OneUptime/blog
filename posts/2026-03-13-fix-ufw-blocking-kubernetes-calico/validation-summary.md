# Validation Summary: How to Fix UFW Blocking Kubernetes When Using Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- UFW
- iptables
- Linux networking

## Sources Consulted
- Calico system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Ubuntu UFW manpage: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu Server firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Canonical Kubernetes UFW configuration guide: https://documentation.ubuntu.com/canonical-kubernetes/main/snap/howto/networking/ufw/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The introduction said Calico NetworkPolicy provides equivalent node security to UFW. Calico policy is workload-focused by default, and host protection requires host endpoint/global policy configuration, so the wording was changed to avoid implying a direct replacement for host firewalling.
- The UFW command `sudo ufw default allow FORWARD` used an invalid direction name. UFW documents `incoming`, `outgoing`, and `routed`, so it was changed to `sudo ufw default allow routed`.
- The UFW CLI examples attempted to allow IPIP with `proto 4`. Current Ubuntu UFW accepts named protocols such as `tcp`, `udp`, `gre`, `esp`, and `ah`, but not raw protocol number `4`, so the IPIP command was replaced with guidance to use `/etc/ufw/before.rules`.
- The VXLAN and BGP UFW examples mixed simple port syntax with `from`/`to` filters in a way that UFW rejects. They were changed to documented full syntax using `proto udp/tcp`, `from`, `to`, and `port`.
- The `/etc/ufw/before.rules` example appended incomplete iptables-restore content and said to place rules before the `*filter` section. It was corrected to place rules inside the existing `*filter` section before `COMMIT`, using `ufw-before-input` and `ufw-before-output` for host-to-host encapsulation packets.
- The Kubernetes API comment implied both 6443 and 443 should always be opened. Calico documents that the API server secure port is often 443 or 6443 depending on configuration, so the comment now tells readers to use the secure port configured for the cluster.

## Review Notes
The Calico protocol and port claims are correct for the configurations discussed: BGP uses TCP 179, IP-in-IP uses IP protocol 4, VXLAN uses UDP 4789, and kube-apiserver commonly uses TCP 443 or 6443 depending on its configured secure port. The `kubectl run`, `kubectl wait`, `kubectl get -o jsonpath`, `kubectl exec`, and `kubectl delete` examples match current Kubernetes CLI syntax, although the local environment did not have `kubectl` installed for direct command execution.

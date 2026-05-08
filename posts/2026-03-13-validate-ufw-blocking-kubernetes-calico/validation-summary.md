# Validation Summary: How to Validate Resolution of UFW Blocking Kubernetes with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- UFW
- iptables/netfilter
- systemd
- Linux networking

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Canonical Kubernetes UFW networking guidance: https://documentation.ubuntu.com/canonical-kubernetes/main/snap/howto/networking/ufw/
- UFW manual page: https://man.he.net/man8/ufw
- iptables/netfilter project documentation: https://www.netfilter.org/projects/iptables/index.html
- systemctl manual page: https://www.freedesktop.org/software/systemd/man/systemctl.html

## Issues Found
- The post stated that validation requires the iptables FORWARD policy to no longer be DROP. This is too narrow because UFW can also permit routed traffic with explicit route rules while keeping a restrictive default routed policy. Updated the wording to require that iptables no longer drops required forwarded pod traffic.
- The post suggested `ufw status` could show `DEFAULT_FORWARD_POLICY: ACCEPT`. UFW status output does not expose that config key directly. Updated the validation to use `ufw status verbose` for runtime status/routed rules and `grep '^DEFAULT_FORWARD_POLICY=' /etc/default/ufw` for persisted config.
- The post implied disabling the systemd UFW service is the required persistence check. UFW's own `disable` command unloads the firewall and disables it on boot, so checking the service enablement state alone is not the right validation. Updated the check to verify `/etc/ufw/ufw.conf` contains `ENABLED=no` when UFW is intentionally disabled.
- The reboot validation used `kubectl wait node $AFFECTED_NODE`. Updated it to the documented resource/name form: `kubectl wait --for=condition=Ready node/$AFFECTED_NODE --timeout=300s`.
- The flowchart conclusion said to permanently disable the UFW service. Updated it to match the technically valid options: run `ufw disable` or persist an allowed routed policy.

## Review Notes
The Kubernetes pod creation, pod readiness wait, pod IP lookup, pod exec ping, and Calico tunnel interface checks are consistent with the referenced documentation. In future, the guide could be improved by adding Calico-specific port/protocol checks for IPIP protocol 4 or VXLAN UDP 4789/8472 depending on the deployed Calico mode, but the current validation workflow is technically correct after the edits.

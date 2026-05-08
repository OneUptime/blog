# Validation Summary: How to Use the Calico FelixConfiguration Resource in Real Clusters

## Status
validated

## Post Type
Tutorial / Production configuration guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise and Calico Cloud
- FelixConfiguration
- Kubernetes
- calicoctl
- kubectl
- Linux iptables
- Calico flow logs, Goldmane, and Whisker

## Sources Consulted
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Cloud FelixConfiguration resource reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Open Source flow log viewing documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source flow log enablement documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Project Calico v3.30, v3.31, v3.32 CRD manifests: https://github.com/projectcalico/calico

## Issues Found
- Removed `iptablesLockTimeout: 10s` from the performance tuning snippet. The option is deprecated in Calico Cloud documentation because newer `iptables-restore` versions always take the lock, and it is absent from the Calico Open Source v3.32 CRD manifest.
- Removed `ipipEnabled: true` from the security hardening example. `ipipEnabled` controls whether Felix configures the IP-in-IP tunnel interface and is not a security hardening setting.
- Clarified the flow logs section and removed unsupported `flowLogsFileMaxFiles` and `flowLogsFileMaxFileSizeMB` keys. File-based flow log options are documented for Calico Enterprise and Calico Cloud, while Calico Open Source v3.30+ uses Goldmane and Whisker rather than the file-based fields.
- Changed the verification wording from confirming the active configuration on each node to listing global and node-specific FelixConfiguration resources, which is what `calicoctl get felixconfiguration -o wide` actually does.
- Replaced the test command that used HTTP to `kubernetes.default.svc` with a TCP connectivity check to port 443. The Kubernetes service normally exposes HTTPS on 443, so an HTTP `wget` to the service is not a reliable validation command.

## Review Notes
- The post remains version-sensitive. The flow log examples are accurate only for Calico Enterprise and Calico Cloud file logging, while Calico Open Source v3.30+ flow logs should be managed through Goldmane and Whisker.
- The failsafe host port lists are syntactically valid, but production clusters should tailor them carefully because reducing failsafe defaults can lock administrators or control plane components out of nodes.

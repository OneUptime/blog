# Validation Summary: How to Use CoreDNS Loop Detection Plugin to Prevent DNS Resolution Cycles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS loop plugin
- CoreDNS forward plugin
- Kubernetes RBAC and service accounts
- Istio sidecar traffic annotations
- DNS troubleshooting tools

## Sources Consulted
- CoreDNS loop plugin documentation: https://coredns.io/plugins/loop/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes service accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Local inspection of the `nicolaka/netshoot:latest` image for available tools (`bash`, `curl`, `jq`, `dig`, `nslookup`, `awk`; no `kubectl`).

## Issues Found
- The post said the CoreDNS `loop` plugin tests upstream DNS servers during startup and periodically afterward. The official CoreDNS documentation says the plugin sends a startup probe, tries for up to 30 seconds, and disables itself after successfully sending the probe. Updated the explanation to describe startup-only detection.
- The post described the probe as a random name such as `test-1234.loop.local`. CoreDNS documents the probe as an HINFO query for `<random number>.<random number>.zone`. Updated the detection steps and added the startup/HINFO limitation.
- The introduction implied broad loop detection. CoreDNS documents the plugin as detecting simple static forwarding loops. Narrowed the wording to avoid overstating runtime or dynamic loop coverage.
- The Istio example placed `traffic.sidecar.istio.io/excludeInboundPorts` and `traffic.sidecar.istio.io/excludeOutboundPorts` on a Service. Istio documents these annotations as Pod annotations. Replaced the Service manifest with a `kubectl patch deployment coredns` command that updates the CoreDNS pod template annotations.
- The Kubernetes Job and Deployment examples ran `kubectl` inside `nicolaka/netshoot`, but the inspected image does not include `kubectl`. Reworked those scripts to query the Kubernetes API with the mounted service account token using `curl` and `jq`, which are present in the image.
- The in-cluster scripts needed API permissions to read services, pods, and pod logs. Added scoped ServiceAccount, Role, and RoleBinding resources to the debug, monitor, and verification examples.
- The debug script used an unquoted regex grep for the CoreDNS service IP. Changed it to `grep -Fq "$COREDNS_IP"` so dots in the IP are treated literally.

## Review Notes
The guide is now technically accurate for the documented CoreDNS `loop` plugin behavior. The monitoring examples are functional examples, but production monitoring would usually be implemented with CoreDNS metrics and centralized logs rather than long-running shell loops.

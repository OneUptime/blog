# Validation Summary: How to Prevent ClusterIP Reachability Issues with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- Kubernetes EndpointSlices and readiness probes
- kube-proxy IPVS and nftables modes
- Linux conntrack sysctls
- Calico GlobalNetworkPolicy and NetworkPolicy
- kubectl and calicoctl

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes virtual IPs and Service proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes kube-proxy CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes EndpointSlices documentation and Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Calico NetworkPolicy documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels

## Issues Found
- The service selector validation command used `kubectl get svc ... -o jsonpath='{.spec.selector}'` and piped the Go-style map output to `jq`, which would not parse correctly. Changed it to request JSON from kubectl and build the label selector with `jq`.
- The service selector validation comment said it matched deployments, but the command checks Pods. Updated the comment and error text to describe running Pods accurately.
- The DNS baseline policy comment claimed it allowed DNS and essential cluster services, but the policy only allowed TCP/UDP port 53. Changed the comment to cluster DNS lookups.
- The kube-proxy section recommended IPVS generally for `v1.24+`, but current Kubernetes documentation marks IPVS proxy mode deprecated from v1.35 and recommends nftables where supported. Added a version caveat and changed the IPVS example to an older-cluster example.
- The IPVS scheduler example used `lc` while the troubleshooting module list only covered the common Kubernetes IPVS modules for round-robin, weighted round-robin, and source hashing. Changed the example scheduler to `rr`.
- The IPVS example set `minSyncPeriod` to `0s`, which forces immediate sync on every Service or EndpointSlice change. Changed it to the documented default `1s`.
- The readiness probe Deployment manifest omitted required Deployment selector/template labels and did not include a container image. Added `spec.selector`, matching template labels, and an example image field.
- The verification command used the deprecated Endpoints API. Replaced it with an EndpointSlice-based audit that checks ready endpoint conditions.
- The node debug command read `/proc` directly from the debug container. Updated it to use `--profile=sysadmin` and `chroot /host` so the command reads the node filesystem mounted by `kubectl debug node`.

## Review Notes
- `kubectl` and `calicoctl` were not installed in the local environment, so CLI behavior was verified against the official generated Kubernetes references and Calico documentation rather than local `--help` output.
- The `calicoctl get networkpolicy ... | grep -c "action: Deny"` command is syntactically plausible but only a coarse audit; it does not prove that policies conflict.

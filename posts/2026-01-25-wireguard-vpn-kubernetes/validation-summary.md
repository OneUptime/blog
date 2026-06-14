# Validation Summary: How to Configure WireGuard VPN for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- WireGuard and wireguard-tools
- Linux networking
- Helm
- wg-access-server
- Kubernetes Secrets, ConfigMaps, DaemonSets, and NetworkPolicies
- Prometheus text-format metrics

## Sources Consulted
- WireGuard official quick start: https://www.wireguard.com/quickstart/
- WireGuard `wg(8)` manual page: https://man7.org/linux/man-pages/man8/wg.8.html
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/tasks/manage-daemon/create-daemon-set/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- wg-access-server documentation: https://www.freie-netze.org/wg-access-server/
- freifunkMUC wg-access-server Helm chart documentation: https://github.com/freifunkMUC/wg-access-server-chart

## Issues Found
- The key generation script did not quote the namespace argument and used `echo` to pipe the private key into `wg pubkey`. I quoted the namespace variable and changed key piping to `printf` to avoid shell word-splitting and newline interpretation problems.
- The generated Secret name did not match the DaemonSet's `secretKeyRef.name`. I changed the example to use the static Secret name consumed by the rendered manifest and added a caveat that a mesh needs node-specific rendered Secrets and addresses because Kubernetes does not expand `NODE_NAME` inside `secretKeyRef.name`.
- The DaemonSet init container created `wg0`, but `wg-quick up wg0` also creates the interface and would fail if it already existed. I limited the init container to loading the kernel module and made the runtime script clean up an existing `wg0` before bringing it up.
- The DaemonSet did not run the provided `configure.sh` script. I added the container command to execute `/config/configure.sh`.
- The ConfigMap provided `wg0.conf`, while the script read `wg0.conf.template`. I renamed the ConfigMap key to match the script.
- The ConfigMap used `envsubst`, which may not be present in the image. I replaced it with a shell `sed` substitution for the WireGuard private key placeholder.
- The WireGuard address example implied automatic uniqueness across all DaemonSet pods. I clarified that the manifest must be rendered with node-specific keys, addresses, and peer definitions before use.
- The "WireGuard Operator" section used wg-access-server but described it as an operator and referenced stale chart details. I updated the section to describe wg-access-server accurately and switched the Helm repo, chart name, and values to the current community chart documented by freifunkMUC.
- The NetworkPolicy section applied to the same host-networked DaemonSet. Kubernetes NetworkPolicies are pod-centric and have host-network caveats, so I clarified that the example applies to deployments that do not use `hostNetwork: true`.
- The monitoring script parsed the first `wg show wg0 dump` interface line as if it were a peer line. I added `tail -n +2` and used `read -r` so only peer rows are parsed.

## Review Notes
The local environment did not have `kubectl` or `helm` installed, so CLI behavior was checked against official documentation and static review rather than live command execution. The DaemonSet remains a template-level example; production mesh deployments should render unique per-node configuration with Helm, Kustomize, or an operator/controller.

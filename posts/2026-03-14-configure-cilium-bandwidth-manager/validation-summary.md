# Validation Summary: Configuring Cilium Bandwidth Manager

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium Bandwidth Manager
- Kubernetes
- Helm
- Cilium CLI and cilium-dbg
- eBPF bandwidth management

## Sources Consulted
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium CLI `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium `cilium-dbg bpf config list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_config_list.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html

## Issues Found
- The introduction said Cilium Bandwidth Manager works without traditional Linux traffic control rules. Cilium's documentation is more specific: it does not rely on the bandwidth CNI plugin's TBF-based shaping, and it uses EDT/eBPF for egress bandwidth enforcement. I changed the wording to avoid implying that Cilium does not configure any queueing discipline.
- The Helm command pinned Cilium `1.16.5`, while the current Cilium Bandwidth Manager documentation and the post's ingress-bandwidth examples align with the current stable `1.19.3` chart. I updated the Helm command to `--version 1.19.3`.
- The Helm command referenced `cilium-values.yaml`, but the snippet names the file `cilium-bandwidth-values.yaml`. I updated the command to use the same filename and added `--reuse-values`, matching Cilium's documented pattern for enabling the feature on an existing Helm installation.
- The Helm upgrade flow only waited for rollout status. Cilium documentation shows restarting the Cilium DaemonSet after enabling Bandwidth Manager on an existing installation, so I added `kubectl rollout restart daemonset/cilium -n kube-system`.
- The BBR comment only mentioned the Linux kernel requirement. Cilium also documents that BBR for pods needs eBPF host routing, so I added that caveat to the comment.
- The validation commands did not include the documented `BandwidthManager` status check. I added `kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep BandwidthManager`.
- The test Deployment did not include the bandwidth annotations, so it only tested generic service connectivity. I added `kubernetes.io/ingress-bandwidth` and `kubernetes.io/egress-bandwidth` annotations to the pod template.
- The BPF runtime inspection command used `cilium bpf config list`, but current Cilium command references expose this under the agent-local `cilium-dbg bpf config list`. I updated the command.
- The connectivity test used a comma-separated `--test pod-to-pod,pod-to-service` selector. The official command documents `--test` as repeatable regular expressions, with scenario selectors such as `/pod-to-pod`. I changed it to `--test /pod-to-pod --test /pod-to-service`.
- The endpoint health check used `cilium endpoint list`, which is not part of the current external Cilium CLI command reference. I changed it to run the documented `cilium-dbg endpoint list` inside the Cilium DaemonSet.

## Review Notes
The local environment did not have `helm` or `cilium` installed, so command validation was performed against official Cilium documentation rather than local `--help` output. The reviewed Bandwidth Manager settings and annotations are consistent with current Cilium documentation, but readers should verify version-specific Helm chart defaults before applying to older clusters.

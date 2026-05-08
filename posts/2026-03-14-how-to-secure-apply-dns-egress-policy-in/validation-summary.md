# Validation Summary: Securing DNS Egress Policies in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- DNS egress policy
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Kubernetes policy constructs documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Layer 7 visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium `cilium-dbg fqdn cache list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html

## Issues Found
- The kube-dns `toEndpoints` selectors used `io.kubernetes.pod.namespace` without the Cilium `k8s:` label source prefix. Updated the examples to use `"k8s:io.kubernetes.pod.namespace": kube-system`.
- The kube-dns pod label selector used an unprefixed `k8s-app` key in examples that otherwise follow Cilium DNS-policy documentation. Updated it to `"k8s:k8s-app": kube-dns` to match the official DNS policy examples.
- The post used `cilium fqdn cache list`, but FQDN cache inspection is a daemon-side `cilium-dbg fqdn cache list` operation. Updated the commands to execute `cilium-dbg` inside the Cilium DaemonSet with `kubectl`.
- The post used `cilium policy get -o json` with a `.spec.egress` jq path. Official troubleshooting documentation uses `cilium-dbg policy get`, whose JSON output has top-level `egress` rules and policy labels. Updated the command and jq filter accordingly.
- The troubleshooting command `cilium status --verbose | grep DNS` was not the correct daemon-side diagnostic context for DNS proxy troubleshooting. Updated it to use `kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose | grep DNS`.
- The prerequisites listed the `cilium` CLI even though the corrected examples rely on `kubectl`, Hubble CLI, and `cilium-dbg` inside Cilium agent pods. Updated the prerequisites.
- A comment said the first policy applied to "all pods", but the `endpointSelector` only selects pods labeled `app: api-service`. Changed the comment to "selected pods".
- The cross-namespace Hubble aggregation command piped pretty-printed JSON objects into `sort | uniq -c`, which would count individual lines instead of complete objects. Added `jq -c` so each selected flow summary is emitted on one line.

## Review Notes
- The CiliumNetworkPolicy structure, DNS `rules.dns` usage, `toFQDNs.matchName`, `toFQDNs.matchPattern`, Hubble `--protocol` and `--verdict` examples, and the general explanation of Cilium DNS-aware egress enforcement are consistent with official Cilium documentation.
- The post assumes the cluster DNS pods use the common `k8s-app=kube-dns` label. Some clusters use CoreDNS labels such as `k8s-app=kube-dns`, while others may differ; the troubleshooting note correctly tells readers to verify DNS pod labels.

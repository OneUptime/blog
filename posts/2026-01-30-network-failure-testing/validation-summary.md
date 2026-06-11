# Validation Summary: How to Build Network Failure Testing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm (`tc netem`)
- Token Bucket Filter (`tc tbf`)
- `iptables`
- Bash scripting
- Kubernetes
- Chaos Mesh `NetworkChaos` and `DNSChaos`
- LitmusChaos
- Prometheus / PromQL
- curl

## Sources Consulted
- Linux `tc-netem(8)` manual page, iproute2 6.1.0
- Linux `tc-tbf(8)` manual page, iproute2 6.1.0
- Linux `tc-u32(8)` manual page, iproute2 6.1.0
- Local `tc -h` and `tc -Version` output, iproute2 6.1.0
- Local `iptables -h` and `iptables --version` output, iptables 1.8.10
- Chaos Mesh documentation: Simulate Network Faults, https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate DNS Faults, https://chaos-mesh.org/docs/simulate-dns-chaos-on-kubernetes/
- LitmusChaos documentation: ChaosCenter installation, https://docs.litmuschaos.io/docs/getting-started/installation
- LitmusChaos experiment documentation: Pod Network Latency, https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-latency/
- LitmusChaos experiment documentation: Pod Network Loss, https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-loss/

## Issues Found
- The `network-fault-inject.sh` example declared `TARGET_IP` but never used it. Removed the unused parameter to avoid implying that the script supports targeted traffic.
- The DNS failure script described a `corrupt` mode in a comment, but the script only implemented `block` and `slow`. Updated the comment.
- The packet corruption section said applications handle corrupted data that passes lower-layer checksum validation. Updated the wording because `tc netem corrupt` corrupts packets in transit and often exercises network stack or transport-layer error handling rather than delivering corrupted payloads to the application.
- The partition script iterated through `PARTITION_A` without using the current `node_a` value, so it would add duplicate local rules instead of creating a partition between groups. Updated it to detect the local node's partition, block the opposite partition, and note that it must run on every node in both partitions.
- The Litmus installation example used a pinned `litmus-operator-v2.14.0.yaml` manifest. Current Litmus documentation recommends Helm installation for ChaosCenter, so the install commands were updated.
- The test suite's `run_health_check` could output duplicate `000` values on curl failures because `curl -w "%{http_code}"` already emits `000`. Changed it to suppress the non-zero exit without appending another status.
- The test suite used `((success++))` under `set -e`; when `success` was initially `0`, Bash returns a failing status for that arithmetic command. Changed it to `((success+=1))`.
- The test suite used `bc` for duration math without documenting the dependency. Replaced it with `awk`, which is already used elsewhere in the partition script.
- Quoted endpoint and timeout variables in curl calls and function invocations to prevent shell splitting when URLs contain query strings or special characters.

## Review Notes
- The core `tc netem`, `tc tbf`, `tc u32`, `iptables`, Chaos Mesh `NetworkChaos`, Chaos Mesh `DNSChaos`, and LitmusChaos experiment fields reviewed are technically valid.
- Chaos Mesh DNSChaos requires the Chaos DNS Server; Chaos Mesh documentation states it is deployed by default after v2.6, but older or customized installations may need to verify it explicitly.
- The OneUptime annotation curl command was treated as illustrative because no official annotation endpoint documentation was found during review.

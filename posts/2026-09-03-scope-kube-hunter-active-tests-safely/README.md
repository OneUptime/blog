# How to Scope kube-hunter Active Tests to Avoid Disrupting Production Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Security, DevSecOps

Description: Constrain kube-hunter active testing with reviewed hunter selection, isolated targets, external network guardrails, canary workloads, observability, and cleanup gates.

---

There is no command-line switch that can make every kube-hunter active test safe for production. The upstream documentation says active hunting may change cluster state and can be harmful. Scoping is therefore a layered control: select the exact tests, restrict the reachable targets, use representative canary workloads, monitor the run, and stop on predefined evidence.

## Inventory the Exact Build

Pin the image by digest or source by commit, then ask that build which hunters it contains:

~~~bash
kube-hunter --list --active
kube-hunter --list --active --raw-hunter-names \
  > active-hunters.txt
~~~

The first output is useful for human review. The second provides class names accepted by the parser's `--custom` option. Names and behaviors are implementation-dependent, so never copy a custom hunter name from another release without verifying it locally.

Review the source for every selected active hunter. Look for writes, exec or attach requests, filesystem operations, credential reads, mounts, and cleanup logic. Cleanup code reduces risk but cannot guarantee recovery after interruption, timeout, permission failure, or process crash.

## Prefer a Representative Lab

Clone relevant conditions into a disposable cluster:

- the same Kubernetes minor version and node image family;
- equivalent kubelet and API authentication/authorization settings;
- representative CNI and NetworkPolicies;
- synthetic Pods with no customer secrets;
- canary namespaces and nodes that can be destroyed;
- audit and network-flow logging enabled.

First run the passive command and confirm it reproduces the original finding. Then run only the approved active hunter and its reviewed prerequisite hunters. Current `--custom` registration keeps a small set of core discovery/report classes, but it does not automatically add every passive hunter that produces an event required by an active hunter. Obtain all class names from the pinned build and trace their subscriptions in source before constructing the list:

~~~bash
kube-hunter \
  --remote 192.0.2.40 \
  --active \
  --custom '<reviewed-passive-prerequisite>' '<reviewed-active-hunter>' \
  --report json \
  > active-proof.json
~~~

If the exact behavior cannot be reproduced in the lab, investigate environmental differences instead of broadening production scope.

## Restrict Targets Twice

Use explicit `--remote` hosts whenever possible. For a network range, current kube-hunter accepts `--cidr` values and `!`-prefixed exclusions, but a typo is still possible. Back the command with an egress firewall that allows only the approved lab or canary addresses. Deny routes to production control planes, shared services, metadata endpoints, and other tenant networks.

Do not run with host networking merely for convenience. When using an in-cluster Pod, place it in a dedicated namespace, avoid privileged mode and host mounts, and use an egress policy enforced by the installed CNI. Kubernetes makes clear that NetworkPolicy has no effect without a supporting implementation, so test the deny rule before launching kube-hunter.

## Isolate the Workload Surface

An approved production exception should target dedicated canary nodes and synthetic Pods, not arbitrary workloads selected by discovery. Taint and label canary nodes, schedule only disposable workloads there, and ensure their service accounts and environment contain no real credentials. However, node isolation alone is insufficient if the active test targets a shared API server or etcd; those components remain cluster-wide.

For that reason, do not approve an active etcd write against production. Current kube-hunter source includes an active etcd hunter that attempts to write a key through `/v2/keys/message`. Even if modern etcd deployments reject that request, an accepted write is a control-plane data mutation. Reproduce it in an isolated etcd or cluster instead.

## Establish Operational Gates

Document before launch:

- named operator, observer, and abort authority;
- UTC start/end and maximum runtime;
- exact targets, source identity, image digest, and hunter names;
- expected requests and expected artifacts;
- monitoring queries for API audit, kubelet, etcd, and workload events;
- abort thresholds for latency, error rate, restarts, unexpected writes, or new targets;
- cleanup commands and post-run integrity checks.

Use a hard job deadline at the orchestrator level rather than relying only on kube-hunter timeouts. The tool's `--network-timeout` bounds individual network operations; it is not a total execution deadline or side-effect rollback mechanism.

## Validate Cleanup Independently

Do not declare success because the scanner exits. Compare Kubernetes objects, etcd health, canary filesystem state, Pods, events, and audit records to the pre-run snapshot. Search for every marker the reviewed source may create. Rotate any canary credential that active logic could have read, even if logs do not show leakage.

Preserve the JSON report and scanner logs with restricted access. Record whether stop conditions fired, whether cleanup was complete, and any observed request not present in the reviewed plan. Destroy the lab or canary environment when the evidence is retained.

## When to Refuse Production Active Testing

Stay passive when the scanner can reach shared etcd, the behavior is not pinned to source, customer workloads contain real secrets, monitoring is incomplete, rollback has not been rehearsed, or the vulnerability can be confirmed through configuration and a lab proof. Active exploitation is a means of gathering evidence, not a required stage of every remediation.

## Conclusion

Scope active hunting by code path, dependency chain, target, network, workload, time, and evidence-not just by a CIDR flag. Pin and list the exact hunters, prefer a disposable replica, select only reviewed behavior and prerequisites with `--custom`, enforce an external egress allowlist, and verify cleanup independently. If those controls cannot be demonstrated, a passive production scan plus an active lab proof is the safer and stronger result.

## Official References

- [kube-hunter active hunting documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter parser: custom hunters, active mode, CIDR, timeout, and threads](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter active hunter base type](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/types/hunters.py)
- [kube-hunter custom registration and dependency handling](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/event_handler.py)
- [kube-hunter etcd hunter implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

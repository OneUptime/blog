# Validation Summary: How to Validate Resolution of Calico Pods That Cannot Reach External Services

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- Linux iptables NAT
- DNS, TCP, and HTTPS connectivity testing

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- `kubectl run` examples passed commands after `--` without `--command`, which makes kubectl treat them as container arguments instead of the container command. Added `--command` to the DNS, TCP, and HTTPS validation examples.
- The DNS cleanup and log collection used `run=dns-test`, but pods created as `dns-test-<node>` are not selected by that label. Added explicit `app=dns-test` labels and updated selectors.
- The TCP test only checked the first five nodes despite the surrounding text saying each node. Removed the `head -5` limit.
- The TCP test used a BusyBox `wget` invocation that did not reliably emit a clear success marker. Switched to `wget -q -T 10 -O- ... >/dev/null && echo TCP_OK`.
- The TCP cleanup used text parsing and `xargs`, which can fail on empty output. Replaced it with a label selector.
- `calicoctl get` does not support `jsonpath` output according to current Calico documentation. Replaced those commands with documented `go-template` output.
- The post implied every IPPool should have `natOutgoing: true`, but Calico supports disabled IPPools for no-NAT destination ranges. Updated the text and validation command to check enabled workload IP pools and skip disabled pools.
- The MASQUERADE check only searched the `POSTROUTING` chain, which can miss MASQUERADE rules in Calico-managed NAT chains. Updated it to inspect the whole nat table with `iptables-save -t nat`.
- The full validation command used `kubectl wait pod full-validate`; updated it to the documented resource/name form `pod/full-validate`.

## Review Notes
The commands were reviewed against current Kubernetes and Calico documentation. Local execution against a real cluster was not possible because `kubectl` and `calicoctl` are not installed in this workspace.

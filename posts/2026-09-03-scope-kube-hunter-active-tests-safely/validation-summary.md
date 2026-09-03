# Validation Summary: How to Scope kube-hunter Active Tests to Avoid Disrupting Production Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- kube-hunter
- Kubernetes
- Kubernetes NetworkPolicy
- Container Network Interface (CNI) plugins
- etcd
- DevSecOps and production security testing controls

## Sources Consulted
- [kube-hunter active hunting documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter command-line parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter configuration and core hunter list](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/__init__.py)
- [kube-hunter custom hunter registration and event dependency handling](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/event_handler.py)
- [kube-hunter host and CIDR discovery implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/hosts.py)
- [kube-hunter etcd hunter implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

## Issues Found
No technical issues found.

## Review Notes
- The kube-hunter commands and flags shown are valid for the upstream `main` source reviewed on 2026-09-03. Pinning a digest or commit, as the post recommends, remains important because hunter names and behavior are implementation-dependent.
- The example `192.0.2.40` address is from the documentation-only TEST-NET-1 range and must be replaced with an approved reachable lab target.
- The `--custom` placeholders must be replaced with class names emitted by the pinned build. The post correctly warns that custom registration retains only the configured core hunters automatically and does not infer the complete event-producing prerequisite chain.
- The active etcd hunter does attempt a POST to `/v2/keys/message`; this is a state-changing request if accepted. The reviewed implementation does not remove that key, reinforcing the post's advice to avoid production etcd writes and validate cleanup independently.
- Kubernetes NetworkPolicy enforcement depends on a supporting network plugin, and policy application is not instantaneous. Testing the effective deny behavior before starting the scanner is therefore appropriate.

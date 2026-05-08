# Validation Summary: How to Document Calico Felix Configuration for Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Felix
- FelixConfiguration resources
- Kubernetes
- calicoctl
- kubectl
- iptables, nftables, and eBPF dataplanes

## Sources Consulted
- Calico Felix configuration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Configuring Felix documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Project Calico Felix configuration package reference: https://pkg.go.dev/github.com/projectcalico/calico/felix/config

## Issues Found
- The introduction implied Felix reads configuration only from FelixConfiguration resources. Updated it to include the documented precedence sources: environment variables, Felix configuration file, and FelixConfiguration resources.
- The dataplane wording listed "BPF" and "eBPF" separately and omitted nftables. Updated the wording to "iptables, nftables, or eBPF."
- The sample and reference table used `iptablesRefreshInterval` default values of 90s. Current Calico documentation and Felix configuration defaults list `iptablesRefreshInterval` as `3m0s`, so the sample was changed to `3m` and the modified-parameter example now uses `5m` as a true deviation from the default.
- The post described `reportingInterval` as metrics reporting. Calico documents it as the interval at which Felix reports status into the datastore, so the description was corrected.
- The refresh interval explanation said the intervals control datastore resyncs. Calico documents these fields as dataplane refresh checks for routes, IP sets, and iptables state, so the explanation was corrected.

## Review Notes
The `calicoctl get` examples and output flags are valid according to the official `calicoctl get` reference. The node-specific FelixConfiguration naming pattern `node.<nodename>` is also documented by Calico. Some commands assume an operator-style installation that uses the `calico-system` namespace; manifest-based installations may use a different namespace.

# Validation Summary: Validating Cilium Masquerading

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Hubble
- Helm

## Sources Consulted
- Cilium masquerading documentation: https://docs.cilium.io/en/latest/network/concepts/masquerading.html
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium end-to-end connectivity testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e.html
- Cilium troubleshooting connectivity test documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/

## Issues Found
- The automated validation section used `dns-resolution`, which is not a documented Cilium connectivity test selector. Changed the targeted masquerading-related test to `pod-to-world`, which is documented as a connectivity test name and exercises pod egress to external destinations.
- The custom workload section claimed to test masquerading but only tested pod-to-service and pod-to-pod traffic inside the cluster. Added an external egress request from the test pod and a check that the externally observed source IP differs from the pod IP, which better validates that SNAT is occurring.
- The custom workload used BusyBox `wget --timeout`; support for that long option varies by BusyBox build. Changed the client image to `curlimages/curl:8.7.1` and used `curl --max-time` for predictable command behavior.
- The endpoint and metrics examples used `cilium endpoint list` and `cilium metrics list` as if they were top-level Cilium CLI commands. Current Cilium documentation exposes these as in-agent `cilium-dbg endpoint list` and `cilium-dbg metrics list` commands, so the examples now execute them inside a Cilium agent pod.
- The final verification step ran a pod-to-pod connectivity test even though the article is about masquerading. Changed it to `pod-to-world`.
- The troubleshooting note for drop metrics referenced `cilium metrics list`; updated it to the documented `cilium-dbg metrics list` command from a Cilium agent pod.

## Review Notes
The egress source IP observed by an external service may be a node public IP, a cloud NAT gateway IP, or another upstream egress address depending on the environment. The important validation signal is that the pod IP itself is not exposed outside the cluster.

# Validation Summary: How to Apply L3/L4 Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF-based network policy enforcement
- Cilium Star Wars demo
- kubectl
- curl

## Sources Consulted
- Cilium documentation: Getting Started with the Star Wars Demo - https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium command reference: cilium-dbg monitor - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium command reference: cilium-dbg endpoint list - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium Kubernetes Network Policy documentation - https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `cilium policy get` and `cilium monitor` inside the Cilium agent pod. Current Cilium documentation uses `cilium-dbg endpoint list` and `cilium-dbg monitor` inside the agent pod, so those commands were updated.
- The prerequisite said "Cilium CLI installed", but the walkthrough uses `kubectl` to exec into Cilium pods rather than the standalone Cilium CLI. Updated the prerequisite to require `kubectl` access and permission to exec into Cilium pods.
- The `cilium policy trace` examples were not supported by the current stable Cilium command reference. Replaced the section with documented `kubectl describe cnp rule1` and `cilium-dbg endpoint list` inspection commands from the official Star Wars demo flow.
- The monitor description said the drop output would include a "policy verdict". The `--type drop` event documents dropped packet notifications; policy verdict notifications are a separate monitor event type, so the wording was narrowed to the source and destination drop event.
- The current Cilium command reference marks `cilium-dbg policy get` as deprecated, so the post now uses `kubectl describe cnp rule1` for policy details instead.
- The introduction claimed a specific "milliseconds" enforcement timing that is not stated in the official demo documentation. Reworded it to describe Cilium applying policy through its eBPF datapath without making an unsupported latency claim.
- The L3/L4 limitation example expected a generic success response for `PUT /v1/exhaust-port`. Updated it to the official demo behavior, where the call triggers `Panic: deathstar exploded`.

## Review Notes
- The upstream Cilium Star Wars demo documentation pins example URLs to a stable release path such as `1.19.3`. The post uses the GitHub `HEAD` URL, which is plausible but less reproducible because it follows the default branch over time.

# Validation Summary: How to use CNI chaining for combining plugin capabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- CNI plugin chaining and `.conflist` configuration
- CNI bridge, bandwidth, portmap, firewall, tuning, host-local IPAM, and macvlan plugins
- Calico CNI
- Multus CNI and NetworkAttachmentDefinition
- Linux iptables and traffic control (`tc`)

## Sources Consulted
- CNI Specification: https://www.cni.dev/docs/spec/
- CNI conventions, including capabilities and bandwidth units: https://www.cni.dev/docs/conventions/
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI bandwidth plugin documentation: https://www.cni.dev/plugins/current/meta/bandwidth/
- CNI portmap plugin documentation: https://www.cni.dev/plugins/current/meta/portmap/
- CNI firewall plugin documentation: https://www.cni.dev/plugins/current/meta/firewall/
- CNI tuning plugin documentation: https://www.cni.dev/plugins/current/meta/tuning/
- CNI cnitool documentation: https://www.cni.dev/docs/cnitool/
- containernetworking/plugins GitHub releases: https://github.com/containernetworking/plugins/releases/latest

## Issues Found
- The CNI plugin download example used `v1.3.0`, which is old. Updated it to the current upstream release, `v1.9.1`.
- The chaining overview implied that plugins pass raw configuration directly to each other. Updated the wording to match the CNI execution model: runtimes invoke each plugin and pass the previous result as `prevResult` for chained plugins.
- Several JSON examples included `//` comments inside fenced `json` snippets. JSON does not allow comments, so the comments were removed and the bandwidth units were described in prose instead.
- The bandwidth examples described burst values as bytes and omitted burst values in some snippets. The CNI bandwidth plugin specifies rates and bursts in bits, and requires both rate and burst to limit a direction. Updated the examples to include matching `ingressBurst` and `egressBurst` values.
- The Kubernetes bandwidth annotation explanation implied that the bandwidth plugin directly reads Pod annotations. Adjusted the wording to clarify that Kubernetes passes annotation-derived limits to the plugin through CNI runtime configuration.
- The debugging section showed a `.conflist` being piped directly to the `bridge` binary, which would only invoke the bridge plugin and would not execute the chain. Replaced that with JSON validation and clarified the later manual example as an individual plugin test.
- Added a `DEL` example for the manual bridge plugin test so the allocated IPAM state and plugin resources are cleaned up before deleting the network namespace.
- Softened the performance-ordering advice to reflect that plugin order is constrained by correctness: interface-creating plugins must run before chained plugins that modify an existing interface.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are illustrative and assume the referenced CNI binaries, `jq`, `iptables`, `perf`, and Kubernetes/Multus components are installed and configured on the node.

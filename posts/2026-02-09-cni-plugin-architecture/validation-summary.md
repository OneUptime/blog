# Validation Summary: How to Understand CNI Plugin Architecture in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes pod networking
- Container Network Interface (CNI)
- CNI bridge, host-local, portmap, bandwidth, and tuning plugins
- Container runtimes such as containerd and CRI-O
- Linux network namespaces, veth pairs, bridges, routing, and IP masquerading
- Go CNI plugin development

## Sources Consulted
- CNI Specification: https://www.cni.dev/docs/spec/
- CNI bridge plugin documentation: https://www.cni.dev/plugins/current/main/bridge/
- CNI host-local IPAM plugin documentation: https://www.cni.dev/plugins/current/ipam/host-local/
- CNI portmap plugin documentation: https://www.cni.dev/plugins/current/meta/portmap/
- CNI bandwidth plugin documentation: https://www.cni.dev/plugins/current/meta/bandwidth/
- containernetworking/plugins README: https://github.com/containernetworking/plugins
- Go package documentation for github.com/containernetworking/cni/pkg/skel: https://pkg.go.dev/github.com/containernetworking/cni/pkg/skel
- Go package documentation for github.com/containernetworking/cni/pkg/types and pkg/types/100: https://pkg.go.dev/github.com/containernetworking/cni/pkg/types

## Issues Found
- The post said the CNI specification defines only ADD, DEL, and CHECK. Updated this to distinguish attachment operations from current spec operations such as VERSION, STATUS, and GC.
- The host-local examples used the deprecated top-level `subnet` form. Updated examples to use the current `ranges` form while preserving the same address range.
- The Go plugin skeleton imported `os` without using it and used `net` without importing it. Replaced the import list so the example is syntactically correct.
- The Go skeleton embedded `types.NetConf`, which is now a backwards-compatibility alias. Updated it to `types.PluginConf`.
- The Go skeleton used the deprecated `skel.PluginMain` helper. Updated it to `skel.PluginMainFuncs` with ADD, CHECK, DEL, GC, and STATUS callbacks.
- The capabilities section described runtime capability use as a query/feature-negotiation flow and showed unsupported capabilities on the bridge plugin. Rewrote it to show portmap's `portMappings` capability and explain that runtimes derive `runtimeConfig` from declared capabilities and runtime-requested capability arguments.

## Review Notes
The examples are still simplified and intended for explanation. The manual CNI invocation snippets require a real existing network namespace and root-level networking permissions to run successfully.

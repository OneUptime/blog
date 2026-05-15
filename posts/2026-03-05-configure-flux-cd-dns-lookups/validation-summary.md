# Validation Summary: How to Configure Flux CD DNS Lookups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kubernetes Pod DNS configuration
- CoreDNS
- Kustomize
- kubectl
- Go DNS resolver configuration

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes API Reference for PodSpec and HostAliases: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux `flux install` command reference: https://fluxcd.io/flux/cmd/flux_install/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Go `net` package name resolution documentation: https://go.dev/pkg/net/

## Issues Found
- The prerequisite listed "A Kubernetes cluster (v1.20+)", which is outdated for supported Flux 2 installations. Current Flux documentation lists supported Kubernetes versions by current upstream support window and required patch levels. Changed the prerequisite to require a Kubernetes version supported by the user's Flux release, noting that current Flux releases require Kubernetes v1.33+ with the required patch level.

## Review Notes
- The Kubernetes `dnsPolicy: "None"` and `dnsConfig` examples use valid PodSpec fields. Kubernetes documents Pod DNS config as stable and allows up to three nameservers.
- The CoreDNS `forward` examples use valid Corefile syntax. Because the default CoreDNS Corefile includes the `reload` plugin, a rollout restart is usually not strictly required, but it is a valid way to force the updated ConfigMap to be picked up.
- The `flux install --export` example and default controller names match the Flux command documentation.
- The Go `GODEBUG=netdns=go` example is technically valid for forcing the pure Go resolver when the binary includes resolver selection support.

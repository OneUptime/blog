# Validation Summary: How to Set Up mTLS Between VMs and Kubernetes in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio virtual machine workloads
- Mutual TLS (mTLS)
- PeerAuthentication
- DestinationRule
- WorkloadEntry and WorkloadGroup
- AuthorizationPolicy
- istioctl
- Kubernetes
- Envoy sidecar admin interface

## Sources Consulted
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio Debugging Virtual Machines: https://istio.io/latest/docs/ops/diagnostic-tools/virtual-machines/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Mutual TLS Migration: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- Replaced the invalid OpenSSL certificate inspection command against `localhost:15000`. Envoy's admin port is HTTP, so certificate inspection should use Envoy config dump data with `istioctl proxy-config secret --file -`.
- Corrected VM proxy inspection guidance. Current Istio documentation notes that `istioctl proxy-config` cannot directly connect to VM proxies through Kubernetes, so VM config should be passed from `localhost:15000/config_dump`.
- Updated Istio API examples from `v1beta1` to the current documented `v1` API versions for PeerAuthentication, DestinationRule, WorkloadEntry, and AuthorizationPolicy.
- Clarified port-level mTLS behavior. `PERMISSIVE` accepts both plaintext and mTLS; it does not disable mTLS. Also noted that `portLevelMtls` keys are workload ports, not Kubernetes Service ports.
- Replaced the obsolete `istioctl authn tls-check` verification command with current `istioctl proxy-config clusters` commands.
- Corrected the root CA comparison command to use the `istio-ca-root-cert` ConfigMap, which is the standard distributed root certificate source in Istio namespaces. The previous `cacerts` secret command only applies to plugged-in CA deployments and may not exist in default installations.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. The examples assume sidecar mode and a VM that has already been onboarded into the mesh; future revisions could explicitly show the required ServiceEntry or Kubernetes Service that exposes the VM workload name used in the traffic examples.

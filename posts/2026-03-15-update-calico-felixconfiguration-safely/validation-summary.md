# Validation Summary: How to Update the Calico FelixConfiguration Resource Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico FelixConfiguration
- calicoctl
- Kubernetes
- kubectl
- Kubernetes networking and host endpoint failsafe ports

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico failsafe rules reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes accessing the API from a Pod: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod

## Issues Found
- The failsafe port example removed several Calico default failsafe ports, including the Kubernetes API server and etcd-related ports. I updated the snippet to retain the documented default failsafe ports while still showing added custom ports.
- The pod connectivity checks used plain HTTP against `kubernetes.default.svc`. Kubernetes documents this service as the in-cluster API server endpoint, which is normally accessed over HTTPS. I changed the checks to use HTTPS and a curl image with TLS verification disabled for a simple connectivity probe.
- The rollback section said to restart calico-node pods if the API server could not be accessed, but that command itself requires API server access. I reworded it to apply after API server access has returned but Felix remains unhealthy.

## Review Notes
The remaining Calico field names, resource names, per-node `node.<nodename>` override pattern, and `calicoctl patch` examples match current Calico documentation. The `ipipEnabled` and `bpfEnabled` examples are high-impact settings and remain appropriately marked as requiring caution.

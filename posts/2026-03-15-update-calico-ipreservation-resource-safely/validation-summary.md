# Validation Summary: How to Update the Calico IPReservation Resource Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPReservation resources
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl
- YAML

## Sources Consulted
- Calico IPReservation resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico specific IP assignment and IPReservation behavior: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run

## Issues Found
- The guidance for an IP that is already allocated to a pod said to wait for the pod to terminate before adding the reservation. Because Calico checks IPReservation resources at automatic allocation time and does not release already-used IPs, the safer sequence is to add the reservation first and then wait for or restart the pod. Updated the wording accordingly.
- The cleanup command for test pods selected only pods in the `Succeeded` phase, but the example creates pods that sleep and may still be `Running` when cleanup is executed. Replaced it with a deterministic loop deleting the named test pods with `--ignore-not-found`.

## Review Notes
- The post's API version, kind, `spec.reservedCIDRs` field, `calicoctl apply`, `calicoctl get`, and `calicoctl ipam show --ip` usage match the official documentation.
- Calico documentation recommends keeping IPReservation resources to a small number of resources with multiple addresses rather than many one-address resources. The split example remains valid, but large environments should keep that performance guidance in mind.

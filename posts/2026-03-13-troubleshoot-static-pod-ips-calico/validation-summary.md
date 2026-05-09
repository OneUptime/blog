# Validation Summary: Troubleshoot Static Pod IPs in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes StatefulSets and Pods
- Calico Open Source IPAM
- Calico CNI pod IP annotations
- Calico IPReservation resources
- calicoctl IPAM commands
- kubectl operational commands

## Sources Consulted
- Calico Open Source documentation: Use a specific IP address with a pod, https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico Open Source documentation: Configure the Calico CNI plugins, https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico Open Source documentation: IP reservation resource, https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico Open Source documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam release, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source documentation: calicoctl user reference and resource aliases, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes documentation: StatefulSets, https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The StatefulSet manifest omitted the governing headless Service and the required `spec.serviceName` field. Added a headless `Service` named `database` and set `serviceName: database` on the StatefulSet so the example is valid for `apps/v1`.
- The Kubernetes commands operated on `database-0` without specifying the `production` namespace even though the manifest creates the workload in that namespace. Added `-n production` to the relevant `kubectl get`, `describe`, `delete`, `wait`, `run`, `exec`, and cleanup commands.
- The apply instructions assumed the `production` namespace already existed. Added a namespace creation command using `kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -` so the example can be applied as written.

## Review Notes
Calico's documented `cni.projectcalico.org/ipAddrs` annotation, `IPReservation` `reservedCIDRs` field, `calicoctl ipam show --ip=<IP>`, and `calicoctl ipam release --ip=<IP>` commands are current. Calico documentation notes that IP reservations prevent automatic allocation, while specific-IP annotations can still use reserved IPs; the post's static-IP reservation pattern is consistent with that behavior.

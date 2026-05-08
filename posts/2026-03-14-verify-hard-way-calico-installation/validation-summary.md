# Validation Summary: How to Verify a Hard Way Calico Installation Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- kubectl
- calicoctl
- Calico NetworkPolicy
- Calico IPPool
- BGP/BIRD
- BusyBox test pods
- iperf3

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico hard-way datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico calico/node readiness reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The datastore health check used `calicoctl node status`, which checks the local Calico node process and BGP peering state rather than serving as a datastore-readiness check. Changed the datastore check to `calicoctl get nodes`, which Calico documents as a simple way to verify calicoctl datastore configuration.
- The IPPool snippet was labeled as a pod verification manifest even though it defines an IPPool. Updated the snippet comments so it accurately describes IP pool verification.
- The BusyBox test pods were started without `--command`, so `sleep 3600` could be passed as arguments to the image default command rather than executed as the container command. Added `--command`.
- The network policy example selected `app == 'network-test'`, but the test pods had no matching labels. Added `--labels=app=network-test` to both test pod creation commands.
- The policy enforcement test attempted HTTP traffic to a BusyBox pod that was only sleeping, so the expected timeout could occur even when policy enforcement was broken. Changed the second pod to run BusyBox `httpd` on port 8080 and updated the connectivity and policy checks to use that endpoint.
- The BusyBox `wget` examples used the long `--timeout` option. Switched to `-T`, which is the BusyBox-compatible timeout option.
- The iperf3 client wait used `condition=Ready`, which is unreliable for a short-lived client pod. Changed it to wait for the pod phase to become `Succeeded` before reading logs.
- The BGP status check was presented unconditionally. Added a note that it applies when BGP is enabled, since some Calico deployments use overlay modes that do not rely on BGP peering.

## Review Notes
- The post remains a general hard-way verification guide rather than a version-pinned procedure. Calico installation details vary by datastore, encapsulation mode, and whether BGP is enabled, so future updates could make those assumptions explicit.

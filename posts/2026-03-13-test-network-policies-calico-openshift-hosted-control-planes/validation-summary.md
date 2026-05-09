# Validation Summary: How to Test Network Policies with Calico on OpenShift Hosted Control Planes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes NetworkPolicy
- OpenShift Hosted Control Planes
- kubectl
- calicoctl
- Kubernetes pod and service networking

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Red Hat OpenShift Hosted Control Planes documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/hosted_control_planes/

## Issues Found
- The BusyBox client pod commands passed `sleep 3600` as container arguments rather than as the container command. Updated both `kubectl run` commands to use `--command -- sleep 3600`, matching the kubectl run behavior documented by Kubernetes.
- The Calico egress policy allowed any destination on ports 443 and 6443 instead of explicitly allowing the API server IP range. Updated the rule to include `protocol: TCP`, an API server CIDR placeholder, and port 6443.
- The API reachability test used `kubernetes.default.svc.cluster.local`, which can fail after egress restriction if DNS or the Kubernetes service IP is not allowed. Updated the test to use the API server host or IP directly.
- The introduction overstated that pod egress policies can break all Kubernetes control plane operations. Reworded it to state that they can break selected workloads that need to call the Kubernetes API.
- The API endpoint discovery note said to use an IP or hostname directly in egress policies. Updated it to clarify that hostnames should be resolved to an IP/CIDR for the policy.

## Review Notes
The example uses placeholder CIDRs for the pod network and API server endpoint. Readers must replace these with the actual hosted cluster pod CIDR and API server or load balancer CIDR. `kubectl` and `calicoctl` were not installed in the review environment, so CLI syntax was verified against official generated references rather than local `--help` output.

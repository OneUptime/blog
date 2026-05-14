# Validation Summary: How to Choose Between VXLAN and IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IP-in-IP
- calicoctl
- kubectl
- iperf3

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The `calicoctl patch` examples used `--type merge`, but current Calico documentation lists JSON Merge Patch as not yet implemented for `calicoctl patch`. Removed `--type merge` and used the documented default patch form.
- The `kubectl run` benchmark client commands redirected the output of pod creation rather than the `iperf3` test output. Added `--restart=Never --attach --rm` so `kubectl` attaches to the benchmark pod and returns the container output.
- The `kubectl run` examples passed `iperf3` as container arguments by default. Added `--command` so the snippets explicitly run `iperf3 -s` and `iperf3 -c ...`.
- The benchmark read the server pod IP immediately after creating the pod. Added `kubectl wait --for=condition=Ready` before reading `.status.podIP`.
- The post implied direct IPPool patching works for all Calico installations. Added a prerequisite noting that operator-managed IPPools should be changed through the Calico `Installation` resource because direct IPPool edits can be reconciled back by the operator.
- The overhead wording described VXLAN's 50 bytes as only UDP and VXLAN headers. Updated it to specify IPv4 VXLAN and include the outer IP and Ethernet headers reflected in Calico's documented 50-byte MTU adjustment.

## Review Notes
The protocol and overhead claims are consistent with Calico and RFC documentation for IPv4: IP-in-IP uses a 20-byte outer IPv4 header, and IPv4 VXLAN uses 50 bytes of overlay overhead. Calico also documents IPv6 VXLAN as 70 bytes, but this post focuses on the IPv4 default IPPool examples.

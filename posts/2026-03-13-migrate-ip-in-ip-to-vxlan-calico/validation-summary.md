# Validation Summary: How to Migrate from IP-in-IP to VXLAN in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IP-in-IP
- iperf3
- calicoctl
- kubectl

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348

## Issues Found
- The post claimed both VXLAN and IP-in-IP work on any IP network. Calico documents that IP-in-IP supports only IPv4, and VXLAN over IPv6 depends on supported kernel versions. Updated the explanation and comparison table to include this limitation.
- The `kubectl run` examples passed `iperf3` as container arguments without `--command`, which depends on the image entrypoint and can fail or run the wrong command. Added `--command` so Kubernetes treats `iperf3` as the command.
- The benchmark sequence read the server pod IP immediately after creating the pod. Added `kubectl wait --for=condition=Ready` so the server is ready before the client benchmark runs.

## Review Notes
The Calico `ipipMode` and `vxlanMode` fields and values are current for IPPool resources. Calico documentation notes that switching encapsulation modes can disrupt in-progress connections, so production migrations should still be scheduled and tested carefully even though the commands are valid.

# Validation Summary: How to Migrate from VXLAN to IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IP-in-IP
- IPPool configuration
- kubectl
- iperf3

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 7348, Virtual eXtensible Local Area Network: https://www.rfc-editor.org/rfc/rfc7348

## Issues Found
- The IPPool patch examples used `calicoctl patch --type merge`. Current Calico documentation shows `calicoctl patch` default patch usage and documents JSON merge patch as not implemented for that command, while Kubernetes supports `kubectl patch --type=merge` for CRDs. Changed the examples to use `kubectl patch ippool default-ipv4-ippool --type=merge -p ...`.
- The `kubectl run` benchmark examples redirected the output of `kubectl run`, not the output of the `iperf3` process. Changed the client commands to use `--restart=Never --rm -i` so the command attaches to the temporary client pod and writes actual benchmark output to the result files.
- The `kubectl run --overrides` examples omitted `apiVersion`, even though the Kubernetes reference requires override JSON to supply a valid `apiVersion` field. Added `"apiVersion":"v1"` to the overrides.
- The `kubectl run` examples passed `iperf3 -s` and `iperf3 -c ...` as container arguments without `--command`, which can be incorrect depending on image entrypoint behavior. Added `--command -- iperf3 ...` to make the intended command explicit.
- The server pod IP was read immediately after pod creation. Added `kubectl wait --for=condition=Ready` before reading and using the pod IP.

## Review Notes
- The encapsulation mode fields, accepted values, protocol numbers, ports, Windows support claim, and overhead values align with Calico documentation. Calico documents IP-in-IP as protocol 4, VXLAN as UDP 4789, IP-in-IP IPv4 overhead as 20 bytes, and IPv4 VXLAN overhead as 50 bytes.
- In operator-managed Calico installations, direct edits to operator-managed IPPool resources may be reverted; those environments should patch the operator `Installation` resource instead.

# Validation Summary: How to Benchmark VXLAN vs IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico IPPool configuration
- Kubernetes
- kubectl
- VXLAN
- IP-in-IP
- iperf3

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- iperf3 official documentation: https://software.es.net/iperf/invoking.html
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348.html
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The VXLAN overhead explanation said the 50-byte overhead was from "UDP + VXLAN headers." Calico's IPv4 MTU guidance and RFC 7348 align with 50 bytes when including the outer IPv4 header, UDP header, VXLAN header, and inner Ethernet header, so the wording was corrected.
- The introduction said both encapsulation types work on any IP network. This was too broad because Calico requires the relevant traffic to be permitted: UDP 4789 for VXLAN and IP protocol 4 for IP-in-IP. The sentence was narrowed accordingly.
- The `calicoctl patch` examples used `--type merge`, but the current Calico `calicoctl patch` reference lists JSON Merge Patch as not implemented and shows IPPool examples using the default patch type with `-p`. The commands were changed to use `-p` without `--type merge`.
- The `kubectl run` benchmark examples redirected the output of pod creation rather than the iperf client output. The client commands now use `--restart=Never --attach --rm --command` so the iperf output is attached and captured with `tee`.
- The `kubectl run --overrides` snippets omitted `apiVersion`, which Kubernetes documents as required when using inline overrides. The override JSON now includes `"apiVersion":"v1"`.
- The iperf server command passed `iperf3 -s` as arguments rather than explicitly setting the container command. It now uses `--command -- iperf3 -s`, consistent with `kubectl run` behavior.

## Review Notes
- The benchmark still uses a placeholder node name, `different-node`; readers must replace it with a real node that is in the intended placement scenario.
- Switching Calico encapsulation modes can disrupt in-progress connections, as noted by Calico's overlay networking documentation.

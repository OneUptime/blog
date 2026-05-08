# Validation Summary: How to Validate IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- IP-in-IP encapsulation
- VXLAN encapsulation
- Linux networking tools (`ip`, `tcpdump`)
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The cross-subnet pod test commands defined `POD1_NODE` and `POD2_NODE` but did not use them. The commands set `nodeName` to an empty string, so they would not intentionally schedule pods on the target nodes. I changed the `--overrides` JSON to set `spec.nodeName` from the corresponding shell variables.
- The BusyBox test pods used `-- sleep 3600` without `--command`. Per the current `kubectl run` reference, trailing arguments are treated as arguments to the image's default command unless `--command` is specified. I added `--command -- sleep 3600` so `sleep` is used as the container command.

## Review Notes
- The Calico IPPool fields and `ipipMode` values are current in Calico 3.32 documentation.
- The post correctly states that IP-in-IP uses protocol 4 and has 20 bytes of IPv4 overhead, and that IPv4 VXLAN has 50 bytes of overhead.
- Calico documentation notes that IP-in-IP supports only IPv4 addresses; the post's IPv4 IPPool example is consistent with that limitation.

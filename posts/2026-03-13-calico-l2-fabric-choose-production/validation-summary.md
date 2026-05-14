# Validation Summary: How to Choose L2 Interconnect Fabric with Calico for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source networking
- Kubernetes pod networking
- Calico IPPool resources
- VXLAN encapsulation
- IP-in-IP encapsulation
- CrossSubnet encapsulation
- BGP/native routing
- Cloud networking on AWS, Azure, and GCE
- MTU planning

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico system requirements/network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico networking option guide: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Calico AWS public cloud documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico Azure public cloud documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico GCE public cloud documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico FAQ on AWS IP-in-IP security groups: https://docs.tigera.io/calico/latest/reference/faq
- RFC 7348 for VXLAN UDP port 4789: https://www.rfc-editor.org/rfc/rfc7348.html
- IANA protocol numbers registry for IP protocol 4: https://www.iana.org/assignments/protocol-numbers
- Google Cloud VPC MTU documentation: https://cloud.google.com/vpc/docs/mtu

## Issues Found
- The post treated CrossSubnet as a third encapsulation type alongside VXLAN and IP-in-IP. Updated the wording to clarify that CrossSubnet is a mode of VXLAN or IP-in-IP.
- The provider matrix described Azure IP-in-IP support as variable. Updated it to state that Azure blocks IPIP packets and supports Calico VXLAN mode.
- The AWS recommendation was too absolute. Updated it to explain that IP-in-IP is blocked by default by AWS security groups unless protocol 4 is explicitly allowed, and that VXLAN requires UDP 4789 to be permitted.
- The raw-socket Python example did not reliably validate IP-in-IP connectivity and sent an invalid inner IP packet payload. Replaced it with guidance to verify the required firewall/security-group protocols after confirming basic node connectivity.
- The MTU prerequisite implied 1500 is typical for all cloud VMs. Updated it to mention GCE default 1460 and AWS jumbo 9001 alongside common 1500 and 9000 MTU values.
- The performance table used precise latency numbers without authoritative support. Replaced those with workload- and platform-dependent language while preserving the documented 20-byte IP-in-IP and 50-byte IPv4 VXLAN overhead values.
- The performance table described reduced values as effective payload. Updated this to Calico MTU/path MTU wording, which matches Calico's MTU documentation.
- The on-premises recommendation said VXLAN was the most compatible when firewall rules were unknown. Updated it to recommend verification first while noting VXLAN is often easier to permit than IP protocol 4.
- The MTU best practice advised never relying on auto-detection. Updated it to set or verify MTU and override the Installation resource when auto-detection does not match the path MTU.
- The conclusion claimed universal UDP/4789 support. Updated it to a narrower statement that VXLAN is safer in many cloud environments because it uses UDP and is supported where IP-in-IP is not, such as Azure.

## Review Notes
The IPPool YAML snippet is valid for Calico's `projectcalico.org/v3` API: `cidr`, `vxlanMode: CrossSubnet`, and `natOutgoing` are supported fields. In real clusters, changing an existing pool from IP-in-IP to VXLAN still requires checking for any existing `ipipMode` setting because Calico does not allow `ipipMode` and `vxlanMode` to be enabled together.

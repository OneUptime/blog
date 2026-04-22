# Validation Summary: How to Configure sFlow on an HP/Aruba Switch

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- sFlow
- HPE ArubaOS-Switch / ProCurve switch CLI
- HPE ArubaOS-CX switch CLI
- sflowtool
- ntopng
- nProbe

## Sources Consulted
- RFC 3176, "InMon Corporation's sFlow: A Method for Monitoring Traffic in Switched and Routed Networks": https://www.rfc-editor.org/rfc/rfc3176
- HPE Aruba Networking ArubaOS-Switch 16.10 Management and Configuration Guide, "Configuring sFlow (CLI)": https://arubanetworking.hpe.com/techdocs/AOS-S/16.10/MCG/WB/content/common%20files/cnf-sfl-cli.htm
- HPE Aruba Networking ArubaOS-Switch 16.10, "Viewing sFlow Configuration and Status (CLI)": https://arubanetworking.hpe.com/techdocs/AOS-S/16.10/MCG/WB/content/common%20files/vie-sfl-cnf-sta-cli.htm
- HPE Aruba Networking AOS-CX 10.17 IP Services Guide, "sFlow agent": https://arubanetworking.hpe.com/techdocs/AOS-CX/10.17/HTML/ip_services_5420-6200/Content/Chp_sFlow/sfl-age-10.htm
- HPE Aruba Networking AOS-CX 10.15 IP Services Guide, sFlow command reference: https://www.arubanetworks.com/techdocs/AOS-CX/10.15/PDF/ip_services_5420-6200.pdf
- sflowtool upstream README: https://github.com/sflow/sflowtool
- ntopng 6.7 documentation, "Using ntopng with nProbe": https://www.ntop.org/guides/ntopng/using_with_other_tools/nprobe.html
- ntopng 6.7 documentation, "Netflow/sFlow Monitoring": https://www.ntop.org/guides/ntopng/use_cases/netflow_sflow_monitoring.html
- NVIDIA Cumulus Linux sFlow sampling-rate defaults: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-513/Monitoring-and-Troubleshooting/Network-Troubleshooting/Monitoring-System-Statistics-and-Network-Traffic-with-sFlow/

## Issues Found
- The ArubaOS-Switch/ProCurve commands used unsupported syntax such as `sflow enable`, `sflow receiver`, and interface-level `sflow sampling` / `sflow polling`. Replaced them with the documented `sflow <receiver-instance> destination`, `sflow <receiver-instance> sampling <port-list> <rate>`, and `sflow <receiver-instance> polling <port-list> <interval>` syntax.
- The ArubaOS-CX section used a non-existent `config-sflow` submode and incorrect commands such as `collector 1 ip`, `sflow enable`, `sflow sampling-rate`, and `sflow polling-interval`. Replaced them with documented AOS-CX commands: `sflow agent-ip`, `sflow collector`, global `sflow sampling`, global `sflow polling`, and interface-level `sflow`.
- The verification block used a generic `show sflow` output that did not match ArubaOS-Switch verification syntax or AOS-CX output. Updated it with valid ArubaOS-Switch verification commands and AOS-CX-style `show sflow` output.
- The collector section referenced `nfsen` but only configured `sflowtool`. Removed the `nfsen` reference from the heading.
- The log redirection command wrote to `/var/log/sflow/sflow.log` without creating the directory or handling root-owned log path permissions. Added `sudo mkdir -p /var/log/sflow` and a `sudo sh -c` redirection.
- The `sflowtool -l` parsing example treated CSV output as whitespace-delimited fields. Replaced it with `sflowtool -L localtime,srcIP,dstIP,sampledPacketSize` and comma-delimited shell parsing.
- The ntopng example used a direct `sflow:` interface. Current ntopng documentation directs NetFlow/sFlow collection through nProbe over ZMQ, so the example now starts nProbe on UDP 6343, points ntopng at the ZMQ endpoint, and updates the conclusion accordingly.
- The sampling-rate table recommended overly aggressive rates for 40 Gbps and 100 Gbps links. Updated the table to common speed-proportional starting points and changed the guidance to start with vendor defaults or the table.

## Review Notes
- ArubaOS-Switch port-list syntax and port names vary by model, so the sample `1/1`, `1/2`, and `Trk1` values should be adjusted to the target switch.
- AOS-CX sFlow capabilities vary by switch family and release. For example, some lower-end platforms have collector VRF or egress-sampling limitations.
- nProbe licensing and package repository availability should be checked for the target Linux distribution before using the ntopng workflow in production.

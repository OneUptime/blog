# Validation Summary: How to Configure sFlow on a Cumulus Linux Switch

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- sFlow
- NVIDIA Cumulus Linux
- Host sFlow / hsflowd
- Cumulus switchd configuration
- sflowtool
- nProbe
- ntopng
- Linux systemd, ss, and tcpdump

## Sources Consulted
- NVIDIA Cumulus Linux 5.16 sFlow documentation: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-516/Monitoring-and-Troubleshooting/Network-Troubleshooting/Monitoring-System-Statistics-and-Network-Traffic-with-sFlow/
- Host sFlow Linux configuration documentation: https://sflow.net/host-sflow-linux-config.php
- Host sFlow source repository configuration parser and tokens: https://github.com/sflow/host-sflow
- sflowtool official README: https://github.com/sflow/sflowtool
- nProbe command-line options documentation: https://www.ntop.org/guides/nprobe/cli_options.html
- ntopng with nProbe documentation: https://www.ntop.org/guides/ntopng/using_with_other_tools/nprobe.html
- ntopng user interface documentation: https://www.ntop.org/guides/ntopng/user_interface/index.html

## Issues Found
- The `hsflowd.conf` collector block used `port = 6343`; Host sFlow and Cumulus examples use `udpport = 6343`. Updated both collector examples.
- The `hsflowd.conf` collector block included `timeout = 60`, which is not a valid Host sFlow collector setting. Removed it.
- The agent comment described `agent = eth0` as an IPv4 address. Updated the comment to describe it as the agent interface.
- The per-interface sampling example used `pcap` blocks for Cumulus switch ports. Current Cumulus documentation uses speed-based `sampling.<speed>` settings in `/etc/hsflowd.conf` and per-port overrides through Cumulus interface configuration. Replaced the `pcap` example with speed-based sampling settings and a `/etc/cumulus/switchd.conf` port override example.
- Privileged switch and collector commands omitted `sudo`. Added `sudo` where the documented commands require elevated privileges.
- The `sflowtool -l` example output was space-delimited and included a nonstandard interface-name field. Updated it to match sflowtool's comma-separated `FLOW` line format.
- The nProbe/ntopng example used an invalid `sflow://...` interface form for collecting exported sFlow. Replaced it with the documented collector-mode command using `-i none`, `-n none`, `--collector-port 6343`, ZMQ export, and the `@NTOPNG@` template.
- The ntopng command used `zmq://` as the input URI. Updated it to the documented `tcp://127.0.0.1:5556` endpoint form.
- The final comparison with NetFlow claimed sFlow provides more accurate traffic characterization. Reworded it to the technically accurate distinction that sFlow samples packets and counters without maintaining per-flow state on the switch.

## Review Notes
Cumulus Linux 5.x also supports NVUE commands for sFlow configuration. The post remains focused on the Linux file-based workflow, with Cumulus switch-port settings corrected to match the documented Linux configuration path. Deployments using the management VRF might need additional service VRF configuration.

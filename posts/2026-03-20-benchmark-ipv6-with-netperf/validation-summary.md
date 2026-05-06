# Validation Summary: How to Benchmark IPv6 with netperf - With

## Status
validated

## Post Type
Guide

## Technologies Covered
- netperf
- netserver
- IPv6
- TCP benchmarking
- UDP benchmarking
- Bash

## Sources Consulted
- Hewlett Packard Enterprise netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html
- Hewlett Packard netperf training and installation guide: https://hewlettpackard.github.io/netperf/training/Netperf.html
- netserver man page: https://man.archlinux.org/man/extra/netperf/netserver.1.en
- Debian package metadata for netperf: https://packages.debian.org/netperf
- Fedora/EPEL package metadata for netperf: https://packages.fedoraproject.org/pkgs/netperf/netperf
- Ubuntu package search for netperf: https://packages.ubuntu.com/search?keywords=netperf

## Issues Found
- The multiline `TCP_STREAM` example used backslashes followed by inline comments, which breaks shell line continuation. I moved those comments to separate lines so the command is valid Bash.
- The post implied that `TCP_RR` prints latency directly. Upstream `netperf` reports transaction rate by default for `_RR` tests, so I corrected the sample output and showed latency as a derived approximation using `1000000 / Trans/sec`.
- The benchmark script parsed a second field from `TCP_RR` and `TCP_CRR` output as latency. That field is not latency in normal `netperf` output, so I changed the script to use `-v 0 -P 0` for the single figure of merit and compute approximate RTT from transactions per second.
- The UDP section described `UDP_STREAM` as a single throughput figure. Upstream docs show separate sender-side and receiver-side results, so I clarified the text and labeled the script’s UDP result as receiver-side throughput.
- The prerequisites implied `yum install netperf` generically. Upstream docs treat source as the primary distribution and package availability varies by platform, so I added a package-availability note and updated the RHEL/CentOS example to `dnf` with EPEL wording.
- The conclusion overstated that `TCP_RR` transaction rates directly correlate with microservice performance. I changed that wording to a proxy/approximation that matches what the tool actually measures.

## Review Notes
- `netperf` documentation notes that `TCP_RR` results can be influenced by Nagle/segment coalescing unless `-D` is used. The current post is technically correct without `-D`, but a future revision could mention that tradeoff.
- For `UDP_STREAM`, receiver-side throughput is the meaningful delivered-throughput number when packet loss is present.
- Distribution package availability for `netperf` still varies by release even where packages exist.

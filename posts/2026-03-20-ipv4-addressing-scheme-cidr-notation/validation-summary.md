# Validation Summary: How to Plan an IPv4 Addressing Scheme Using CIDR Notation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- CIDR notation
- Subnetting
- RFC 1918 private address space
- `ipcalc`
- APT package installation

## Sources Consulted
- RFC 1918, "Address Allocation for Private Internets": https://datatracker.ietf.org/doc/html/rfc1918
- RFC 4632, "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan": https://datatracker.ietf.org/doc/rfc4632/
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links": https://datatracker.ietf.org/doc/html/rfc3021
- Ubuntu Manpage, `ipcalc(1)`: https://manpages.ubuntu.com/manpages/jammy/man1/ipcalc.1.html
- IP Calculator / IP Subnetting (`ipcalc` project page): https://jodies.de/ipcalc
- Debian Manpages, `apt(8)`: https://manpages.debian.org/trixie/apt/apt.8.en.html
- Debian Manpages, `apt-get(8)`: https://manpages.debian.org/bookworm/apt/apt-get.8

## Issues Found
- The post used `ipcalc -n --hosts 30` to pick a subnet size. The Ubuntu/Debian `ipcalc` documented in the post does not support a `--hosts` option; `-n` means `--nocolor`. I replaced that example with a valid `ipcalc 10.100.1.0/27` check and kept the host-sizing explanation accurate.
- The reserved-range examples and the documentation sample used CIDR summaries that did not actually cover the ranges being described. I replaced them with contiguous summary blocks (`10.0.0.0/10` for office sites and `10.96.0.0/12` for data centers) so the examples match the post's guidance about route summarization.

## Review Notes
- No remaining technical issues found after correction.
- The `/30` point-to-point example is valid, though RFC 3021 also allows `/31` on point-to-point links; that omission is acceptable for an introductory planning guide.

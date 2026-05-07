# Validation Summary: How to Understand ARP Cache Timeout and Expiration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux ARP / neighbor cache
- IPv4
- Linux `sysctl`
- `iproute2` / `ip neigh`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `arp(7)` Linux man page: https://man7.org/linux/man-pages/man7/arp.7.html
- `ip-neighbour(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- Local verification on Linux 6.17.0-20-generic using `sysctl -a` and `ip neigh help`

## Issues Found
- The post described `gc_stale_time` as the time a `STALE` entry is kept before removal. I updated this to the documented meaning: it controls how often the kernel checks for stale neighbor entries, and stale entries are re-resolved before data is sent.
- The lifecycle table implied fixed timing for `STALE` and immediate removal at `FAILED`. I updated the table to reflect randomized `REACHABLE` timing, on-use revalidation for `STALE`, and `FAILED` as probe exhaustion rather than automatic cache removal.
- The `ucast_solicit` description was too narrow. I updated it to describe unicast probes in `PROBE` state while reconfirming a known neighbor.
- The garbage-collection threshold comments overstated them as simple minimum/soft/hard cache-size limits. I updated them to match kernel documentation, including `gc_thresh3` as the maximum number of non-permanent neighbor entries.
- The `/etc/sysctl.conf` persistence example used shell redirection without elevated privileges. I replaced `cat >> /etc/sysctl.conf` with `sudo tee -a /etc/sysctl.conf > /dev/null` so the command works as shown.
- The key takeaways said `REACHABLE` expires after about 30 seconds and `STALE` is kept for about 60 seconds. I updated them to match randomized reachability timing and on-use revalidation.

## Review Notes
- `net.ipv4.neigh.default.*` sets defaults for newly created interfaces; immediate changes on an existing interface may require the per-interface form shown later in the post.

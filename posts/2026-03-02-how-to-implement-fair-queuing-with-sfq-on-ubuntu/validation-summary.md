# Validation Summary: How to Implement Fair Queuing with SFQ on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux traffic control (`tc`)
- Stochastic Fairness Queueing (`sfq`)
- Hierarchy Token Bucket (`htb`)
- `fq_codel`
- `u32` traffic filters
- `systemd`
- `iperf3`

## Sources Consulted
- `tc-sfq(8)` manual page: https://man7.org/linux/man-pages/man8/tc-sfq.8.html
- Local `tc-sfq(8)` man page from iproute2
- `tc-fq_codel(8)` manual page: https://manpages.debian.org/bookworm-backports/iproute2/tc-fq_codel.8.en.html
- Local `tc-fq_codel(8)` man page from iproute2
- Local `tc-htb(8)` man page from iproute2
- Local `systemd.service(5)` manual page

## Issues Found
- The post stated that SFQ rehashes every 10 seconds by default. The `tc-sfq(8)` manual documents `perturb` default as 0, meaning no perturbation occurs unless configured. Updated the explanation and parameter list to say that `perturb 10` explicitly enables 10-second rehashing.
- The verification section claimed that without SFQ, the first flow would dominate. That is too absolute and depends on the actual bottleneck queue and default qdisc. Reworded it to say flows may get uneven shares without fair queuing at the bottleneck.
- The persistence snippet used shell redirection with `cat > /etc/systemd/system/...`, which fails from a normal shell even when later commands use `sudo`. Replaced it with `sudo tee`.
- The `ExecStop` command could make the oneshot service fail during cleanup if the qdisc was already absent. Added the systemd `-` prefix so that cleanup failure is ignored, as documented by `systemd.service(5)`.

## Review Notes
The main `tc` examples for SFQ, HTB, `u32` filters, and `fq_codel` use valid syntax. The examples assume egress shaping and that Linux owns the bottleneck queue; this is important for SFQ because it schedules packets but does not shape traffic by itself.

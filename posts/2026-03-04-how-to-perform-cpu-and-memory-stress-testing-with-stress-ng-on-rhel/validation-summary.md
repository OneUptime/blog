# Validation Summary: How to Perform CPU and Memory Stress Testing with stress-ng on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- EPEL repository
- stress-ng
- Linux CPU and virtual memory stress testing
- Linux resource monitoring commands

## Sources Consulted
- stress-ng upstream README: https://github.com/ColinIanKing/stress-ng
- stress-ng manual page: https://manpages.debian.org/testing/stress-ng/stress-ng.1.en.html
- Red Hat Customer Portal, "How to use Extra Packages for Enterprise Linux (EPEL)?": https://access.redhat.com/solutions/3358
- Fedora EPEL getting started documentation: https://docs.fedoraproject.org/en-US/epel/getting-started/

## Issues Found
- The EPEL installation command used `sudo dnf install -y epel-release`, which is not the official general RHEL enablement path and can fail when the package is not already available. Updated the example to use the RHEL 9 CodeReady Builder repository and the official EPEL release package URL.
- The memory test comment said each VM worker allocates 1GB. The stress-ng manual states `--vm-bytes` is the total amount shared by VM workers, so the comment was corrected to say 1GB allocated in total.
- The final description expanded "bogo-ops" as "bogus operations per second". stress-ng reports bogo operations and bogo ops per second as separate metrics, so the wording was corrected.

## Review Notes
- The CPU stressor options, `--cpu 0`, `--cpu-method matrixprod`, `--cpu-load`, `--timeout`, and `--metrics-brief` are consistent with the stress-ng manual.
- The VM stressor examples using `--vm`, `--vm-bytes`, and `--vm-method walk` are consistent with the stress-ng manual.
- stress-ng metrics are useful for relative comparisons, but the upstream project notes that stress-ng is not intended to be a precise benchmark suite.

# Validation Summary: How to Apply Kernel Live Patches on Ubuntu with Livepatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu LTS
- Ubuntu Pro
- Canonical Livepatch
- Linux kernel live patching
- Snap services
- Ansible
- Bash

## Sources Consulted
- Ubuntu Pro Client documentation: https://documentation.ubuntu.com/pro-client/
- Ubuntu Pro Livepatch management guide: https://documentation.ubuntu.com/pro-client/en/docs/howtoguides/enable_livepatch/
- Ubuntu Pro services overview: https://documentation.ubuntu.com/pro/services-overview/
- Ubuntu Livepatch documentation: https://ubuntu.com/security/livepatch/docs
- Ubuntu Livepatch status documentation: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/status
- Ubuntu Livepatch supported kernels matrix: https://ubuntu.com/security/livepatch/docs/livepatch/reference/kernels
- Ubuntu Livepatch technical explanation: https://ubuntu.com/security/livepatch/docs/livepatch/explanation/howitworks
- Ubuntu Livepatch Security Notices documentation: https://ubuntu.com/security/livepatch/docs/livepatch/explanation/notices
- Ubuntu Pro pricing page: https://ubuntu.com/pricing/pro

## Issues Found
- The post stated that Canonical Livepatch is free for personal use on up to 3 machines. This is outdated for the Ubuntu Pro path described in the article; current Ubuntu Pro personal subscriptions cover up to 5 physical machines, or 50 for official Ubuntu Community members. Updated the requirements section.
- The post said Ubuntu Pro is free for personal and small commercial use. Current primary Ubuntu Pro pages describe the free tier as personal use, so the small commercial claim was removed.
- The setup examples installed `ubuntu-advantage-tools`. Current Ubuntu Pro Client documentation identifies `ubuntu-pro-client` as the Pro client package on supported current releases. Updated the command, Ansible task, and shell script.
- The example `canonical-livepatch status` output used older/non-current `patch state` wording. Updated the examples to match current documented fields such as `kernel state`, `patch state`, and `patch version`.
- The technical explanation mentioned `ftrace` hooks as the mechanism. Canonical's current Livepatch explanation describes replacing vulnerable kernel code through the livepatching mechanism without documenting `ftrace` as the user-facing implementation detail, so the wording was generalized.
- The supported-kernel wording was too narrow and incomplete. Updated it to refer to Canonical's supported kernel matrix and supported Canonical kernel variants.
- The reboot guidance suggested quarterly or semi-annual reboots. Canonical documents a 9-13 month livepatch coverage window for kernel versions, so the recommendation was changed to installing kernel updates and rebooting within that window.
- The coverage wording said "high-priority" and "critical CVEs" in places. Updated it to Canonical's current "high and critical" vulnerability terminology.

## Review Notes
The article remains technically relevant and useful. Future improvements could include adding a `pro status --format json` example for fleet automation, but that was not necessary for correctness.

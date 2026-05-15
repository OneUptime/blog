# Validation Summary: How to Use restorecon to Fix SELinux File Labels on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux file contexts and labels
- `restorecon`
- `semanage fcontext`
- `matchpathcon`
- Linux shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- `restorecon(8)` manual page from the SELinux userspace tools project: https://man7.org/linux/man-pages/man8/restorecon.8.html

## Issues Found
- The full filesystem relabel example used `restorecon -Rp /`, which recursively relabels paths but does not force replacement of the full SELinux context. Changed it to `restorecon -RFp /` so it aligns with the post's full relabel intent and `restorecon`'s documented `-F` behavior.
- The post recommended `touch /.autorelabel` and claimed the on-boot relabel method is often faster. Red Hat's RHEL 9 documentation recommends `fixfiles -F onboot` to create `/.autorelabel` with the `-F` option, and does not support the speed claim. Replaced the command with `sudo fixfiles -F onboot` and changed the explanation to say that on-boot relabeling happens before normal services start.

## Review Notes
The remaining command examples and explanations were consistent with Red Hat's RHEL 9 SELinux guidance and the documented `restorecon` options. The post intentionally uses Apache/httpd SELinux file types for nginx-served static content, which can be valid on RHEL because nginx commonly uses the same SELinux policy types as httpd for web content.

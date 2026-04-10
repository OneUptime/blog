# Validation Summary: How to Use ceph-post-file for Bug Report Submission

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Ceph (storage cluster)
- ceph-post-file (diagnostic upload utility)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Bash scripting (tar, cat, heredocs)

## Sources Consulted
- Ceph source code for ceph-post-file: https://github.com/ceph/ceph/blob/main/src/ceph-post-file.in
- ceph-post-file man page: https://docs.ceph.com/en/latest/man/8/ceph-post-file/
- Ceph crash module documentation: https://docs.ceph.com/en/quincy/mgr/crash/
- Ceph monitoring documentation (ceph log last): https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Debian packaging for ceph-common: https://github.com/ceph/ceph/blob/main/debian/ceph-common.install
- Kubernetes changelog for kubectl version --short deprecation (removed in v1.28)

## Issues Found

1. **Incorrect upload endpoint and protocol**: The post stated ceph-post-file uploads to `ceph.com/upload` via HTTP. In reality, it uses SFTP to upload to `drop.ceph.com`. Fixed the description to reference `drop.ceph.com` and SFTP.

2. **Incorrect output format**: The post claimed the tool outputs a URL like `https://ceph.com/upload/xxxxxxxx-...`. In reality, it outputs a UUID identifier in the format `ceph-post-file: <uuid>`. Fixed the example output and changed references from "URL" to "unique identifier".

3. **Deprecated `kubectl version --short` flag**: The `--short` flag was deprecated in Kubernetes v1.27 and removed in v1.28. Since the short format is now the default output, the flag is unnecessary. Changed `kubectl version --short` to `kubectl version`.

4. **Heredoc quoting prevents command substitution**: The post used `<< 'EOF'` (single-quoted delimiter) for the minimal reproduction bundle heredoc, which prevents shell variable and command substitution. The `$(kubectl ...)` and `$(ceph version)` commands inside would be written as literal strings instead of being executed. Changed to unquoted `<< EOF` to enable command substitution.

## Review Notes
- The `ceph-post-file` tool requires SSH key access to `drop.ceph.com`. The post does not mention this prerequisite, which could cause confusion for first-time users. A note about SSH authentication may be helpful in a future update.
- The `-d` (description) flag for `ceph-post-file` is a useful option for associating uploads with specific bug tracker IDs, but the post doesn't mention it. This could be a valuable addition.
- The `ceph log last 1000`, `ceph crash ls`, and `ceph crash info` commands were all verified as correct.
- Installation via `ceph-common` package on both Debian/Ubuntu and RHEL/CentOS is correct.

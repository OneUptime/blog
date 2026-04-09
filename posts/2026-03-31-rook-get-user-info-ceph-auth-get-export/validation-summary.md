# Validation Summary: How to Get User Info with ceph auth get and ceph auth export

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (authentication subsystem: `ceph auth` commands)
- Rook (Rook toolbox for accessing Ceph CLI)
- Kubernetes (`kubectl` for toolbox access and Secret creation)

## Sources Consulted
- Ceph official documentation on user management and authentication: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph CLI reference for `ceph auth` subcommands: https://docs.ceph.com/en/latest/man/8/ceph/
- Rook documentation on the toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes documentation on Secrets: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
No technical issues found.

## Review Notes
- All `ceph auth` commands (`get`, `export`, `print-key`) are correct and use current syntax.
- The `-o` flag for file output and `--format json` for JSON output are correctly documented.
- The keyring output format and JSON output structure shown are accurate.
- The difference table between `auth get` and `auth export` is correct: `auth get` requires an entity name, while `auth export` with no arguments dumps all entities.
- The Kubernetes Secret creation examples are syntactically correct. Readers should note that the `ceph` commands need to run where the Ceph CLI is available (e.g., inside the Rook toolbox), while the `kubectl create secret` commands need `kubectl` cluster access. In practice, this may require running `ceph` commands via `kubectl exec` to capture output on the host before creating the Secret.
- `ceph auth print-key` is the current preferred command for extracting just the key value.

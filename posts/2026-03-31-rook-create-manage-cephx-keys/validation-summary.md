# Validation Summary: How to Create and Manage CephX Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CephX authentication subsystem)
- Kubernetes (kubectl, Secrets)
- Ceph CLI (`ceph auth` commands)

## Sources Consulted
- Ceph official documentation: User Management — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph man page: ceph(8) — https://docs.ceph.com/en/latest/man/8/ceph/
- Rook Ceph Toolbox documentation — https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Red Hat Ceph Storage Administration Guide — https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/ceph-user-management

## Issues Found

### Issue 1: Keyring file written inside pod but referenced locally
**What was wrong:** The "Export a Key to a Keyring File" section used `ceph auth get client.myapp -o /tmp/myapp.keyring` which writes the file inside the tools pod, but the subsequent `cat /tmp/myapp.keyring` and `kubectl create secret --from-file=keyring=/tmp/myapp.keyring` commands reference the path on the local machine where the file does not exist.

**What was changed:** Replaced `-o /tmp/myapp.keyring` (writes inside pod) with shell stdout redirection `> /tmp/myapp.keyring` (writes to local filesystem). Also removed `-it` flags from this command since stdout is being redirected and the TTY allocation is unnecessary.

**Why:** Shell redirection captures the kubectl exec output on the local machine, making the file available for the subsequent `cat` and `kubectl create secret` commands.

### Issue 2: TTY allocation inside command substitution
**What was wrong:** In the "Store Keys in Kubernetes Secrets" section, `kubectl exec -it` was used inside a `$()` command substitution. The `-t` flag allocates a pseudo-TTY which injects carriage return (`\r`) characters into the captured output, potentially corrupting the key value stored in the `$KEY` variable.

**What was changed:** Removed `-it` flags from the `kubectl exec` command inside the `$()` substitution.

**Why:** When capturing command output in a variable, TTY allocation should be avoided to prevent invisible control characters from corrupting the value.

## Review Notes
- All core `ceph auth` commands (`get-or-create`, `get-or-create-key`, `caps`, `get`, `ls`, `del`) are syntactically correct and use current Ceph API.
- The distinction between `get-or-create` (returns full keyring) and `get-or-create-key` (returns only the key) is used correctly in the appropriate contexts.
- The comma-separated syntax for multiple OSD capabilities is correct.
- The remaining interactive commands (not inside redirects or command substitutions) retain `-it` flags, which is appropriate for manual terminal use.

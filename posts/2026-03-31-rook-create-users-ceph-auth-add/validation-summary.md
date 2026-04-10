# Validation Summary: How to Create Users with ceph auth add in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (authentication subsystem, `ceph auth` commands)
- Rook (Ceph operator for Kubernetes, toolbox access)
- Kubernetes (kubectl, Secrets)
- Bash scripting

## Sources Consulted
- Ceph official documentation: User Management — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph source code: `src/mon/AuthMonitor.cc` (behavior of `auth add` vs `auth get-or-create` when entity already exists)

## Issues Found

1. **Incorrect description of `ceph auth add` behavior when entity exists (Overview section)**: The post stated "If the entity already exists, the command returns the existing entry without modifying it. This makes it safe to run repeatedly in automation scripts." This is incorrect. `ceph auth add` succeeds silently only if the entity exists with the same key and capabilities. If the capabilities or key differ, it returns an error (`-EEXIST` or `-EINVAL`). It also never outputs the key/keyring — that behavior belongs to `ceph auth get-or-create`. Fixed to accurately describe the conditional behavior and note that it does not output the key.

2. **Incorrect comparison table (Difference Between auth add and auth get-or-create)**: The table stated that both `auth add` and `auth get-or-create` "Return existing entry, no modification." This is wrong in two ways: (a) `auth add` does not return/output the entry — it silently succeeds or errors; (b) both commands error if caps don't match, not just silently return. Fixed the table to accurately describe each command's behavior, including error conditions and output differences.

3. **Misleading description of `auth add` vs `auth get-or-create`**: The post stated they "behave similarly" and the only difference is intent communication. The actual key difference is that `auth get-or-create` outputs the keyring on success (both for new and existing entities), while `auth add` does not output anything. Fixed to explain the practical difference.

4. **Incorrect summary claim of idempotency**: The summary stated "It is idempotent - if the entity already exists, it returns the existing entry." This is doubly wrong: it is only conditionally idempotent (matching caps/key required), and it never returns the entry. Fixed to accurately describe the behavior and recommend `ceph auth get-or-create` for automation.

5. **Automation script using `ceph auth add` in a loop**: The script used `ceph auth add` in a loop, but this will fail on re-runs if entities already exist with different capabilities. Changed to `ceph auth get-or-create` which is the correct choice for idempotent automation, and added a note explaining why.

## Review Notes
- The basic syntax, capability format (`mon 'allow r'`, `osd 'allow rw pool=mypool'`), multiple pool syntax with comma-separated caps, keyring export with `-o`, and `ceph auth print-key` are all correct per official documentation.
- The Rook toolbox access command and Kubernetes Secret creation commands are correct.
- The bash automation script is syntactically correct and uses proper array indexing.

# Validation Summary: How to Rotate CephX Keys Without Downtime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CephX authentication
- ceph auth CLI commands
- ceph-authtool
- kubectl
- Kubernetes Secrets

## Sources Consulted
- Ceph official documentation: CephX authentication and key management (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph CLI reference: `ceph auth` subcommands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook documentation: Ceph toolbox and OSD management (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- ceph-authtool man page (https://docs.ceph.com/en/latest/man/8/ceph-authtool/)

## Issues Found

1. **Heredoc with single quotes prevents command substitution (Step 1, first code block):** The original used `<< 'EOF'` which suppresses shell expansion, meaning `$(ceph-authtool --gen-print-key)` would be passed as a literal string, not executed. Replaced the entire block with the simpler `ceph auth get-or-create` approach which avoids the heredoc issue entirely.

2. **`ceph auth rename` does not exist (Step 3):** Ceph has no `auth rename` subcommand. The valid `ceph auth` subcommands are: add, caps, del, export, get, get-key, get-or-create, get-or-create-key, import, ls, print-key, rm. Replaced with a sequence that deletes the old entity, recreates it with `get-or-create` under the original name, then deletes the temporary entity.

3. **`ceph-authtool --gen-print-key` run on local machine (In-Place Rotation):** The command `NEW_KEY=$(ceph-authtool --gen-print-key)` would run on the operator's local machine, which likely doesn't have ceph-authtool installed. Fixed to run inside the tools pod via `kubectl exec`. Also fixed the heredoc-based `ceph auth import` to use a proper `bash -c` invocation with echo piped to stdin.

4. **Daemon key rotation would cause OSD authentication failure (Rotating Daemon Keys):** The original simply deleted the OSD auth key and restarted the deployment. This would cause the OSD to fail to start because it could no longer authenticate with the monitors. Fixed to show the correct procedure: generate a new key, update the auth entry via `ceph auth import`, update the Kubernetes Secret containing the keyring, then restart the OSD.

## Review Notes
- The keyring secret name format (`rook-ceph-osd-5-keyring`) and structure may vary depending on the Rook version. Users should verify the exact secret name in their cluster with `kubectl -n rook-ceph get secrets | grep osd`.
- The `jq` command for updating the keyring secret assumes the secret data key is `keyring`; in some Rook versions the key may be named differently (e.g., `osd-keyring`).
- The blue-green approach for client keys is sound advice. The post correctly notes that simultaneous rotation of multiple keys should be avoided.

# Validation Summary: How to Configure User Management in the Ceph Dashboard

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook
- Ceph Dashboard
- Ceph CLI
- Kubernetes (`kubectl`)
- Role-based access control (RBAC)

## Sources Consulted
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph monitor command API for dashboard RBAC commands: https://docs.ceph.com/en/latest/api/mon_command_api/
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/

## Issues Found
- The "Get admin username" command actually retrieved the dashboard password from the `rook-ceph-dashboard-password` secret. I corrected the comment to reflect what the command does.
- The built-in role descriptions for `read-only`, `block-manager`, `cluster-manager`, and `pool-manager` did not match Ceph's documented RBAC scope mappings. I updated the table to match the official role definitions.
- The `ac-user-create` example was missing the required `-i <file-containing-password>` input and implied that the password is set in a separate step. I corrected the example to create a temporary password file in the toolbox pod and pass it to `ac-user-create`.
- The `ac-user-set-password` example passed the new password as a positional argument, but the command reads the password from `-i <file-containing-password>`. I updated the example accordingly.
- The post used `ceph dashboard ac-scope-list`, which is not a documented dashboard command. I replaced it with the documented list of available security scopes.
- The "Force Password Change on Next Login" section used `ac-user-set-info --pwd-update-required true`, but `ac-user-set-info` only updates name and email. I replaced it with the documented `--pwd_update_required` flag on `ac-user-create`.
- The section heading referred to "Lock" even though the commands shown disable, re-enable, and delete users. I updated the heading to match the documented command behavior.

## Review Notes
The CLI examples assume the `rook-ceph-tools` toolbox deployment is available in the `rook-ceph` namespace. If a cluster is managed with the `kubectl rook-ceph` plugin or another Ceph access method, the outer command wrapper will differ even though the underlying `ceph dashboard` commands remain the same.

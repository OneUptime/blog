# Validation Summary: How to Retrieve Ceph Dashboard Login Credentials in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard
- Ceph CLI (user and role management, SSO)
- Kubernetes (Secrets, kubectl)
- SAML2 Single Sign-On

## Sources Consulted
- Ceph Dashboard official documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Red Hat Ceph Storage Dashboard Guide (user management): https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/dashboard_guide/management-of-users-on-the-ceph-dashboard
- Ceph Mon Command API documentation: https://docs.ceph.com/en/latest/api/mon_command_api/

## Issues Found

### 1. Incorrect flag for bypassing password policy (`ac-user-set-password`)
- **What was wrong:** The command used `--password-policy-enabled=false`, which is not a valid flag for `ceph dashboard ac-user-set-password`.
- **What was changed:** Replaced with `--force-password`, which is the correct flag to bypass password policy checks.
- **Why:** The `--force-password` flag is the documented way to skip password policy validation when setting a dashboard user's password.

### 2. Incorrect syntax for `ac-user-create` with roles
- **What was wrong:** The command used `--roles=read-only` as a flag and `--enabled` without providing a password. In the Ceph CLI, the role is a positional argument (not a `--roles=` flag), and a password should be provided at creation time.
- **What was changed:** Combined the user creation and password setting into a single correct command: `ceph dashboard ac-user-create readonly-user -i - read-only --force-password`, with the password piped via stdin. Removed the now-redundant separate password-setting step.
- **Why:** The `ac-user-create` command signature is `ac-user-create <username> [-i <password-file>] [<rolename>] [--force-password]`. The role must be a positional argument, not a `--roles=` flag.

### 3. Fabricated `disable-login` / `enable-login` commands
- **What was wrong:** `ceph dashboard disable-login` and `ceph dashboard enable-login` do not exist as Ceph CLI commands.
- **What was changed:** Replaced with the correct commands to disable/enable the entire dashboard module: `ceph mgr module disable dashboard` and `ceph mgr module enable dashboard`. Updated the section title and description to reflect that this disables the dashboard module, not just login.
- **Why:** There is no granular "disable login" command in Ceph. The standard approach for maintenance is to disable the dashboard manager module entirely.

## Review Notes
- The `kubectl` jsonpath syntax `{['data']['password']}` used to retrieve the secret is valid but unconventional. The more common form is `{.data.password}`. Both work correctly.
- The Kubernetes secret name `rook-ceph-dashboard-password` and default username `admin` are confirmed correct per Rook documentation.
- The SSO SAML2 setup command and `sso status` command are correct per Ceph documentation.
- The toolbox deployment name `rook-ceph-tools` is correct for the standard Rook toolbox.

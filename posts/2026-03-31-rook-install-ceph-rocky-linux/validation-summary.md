# Validation Summary: How to Install Ceph on Rocky Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Squid release, 19.x)
- Rocky Linux 9
- cephadm (Ceph deployment tool)
- Podman (container runtime)
- SELinux
- firewalld
- Ceph Dashboard

## Sources Consulted
- Ceph official documentation for cephadm installation: https://docs.ceph.com/en/latest/cephadm/install/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Rocky Linux 9 package availability (policycoreutils-python-utils provides semanage)
- Red Hat documentation on SELinux contexts for containerized Ceph deployments
- Ceph network configuration documentation (port requirements): https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/

## Issues Found

### Issue 1: Missing `policycoreutils-python-utils` package (Step 1 / Step 3)
- **What was wrong:** Step 3 uses the `semanage` command to set SELinux file contexts, but `semanage` is not installed by default on Rocky Linux 9. It is provided by the `policycoreutils-python-utils` package, which was not listed in the Step 1 package installation.
- **What was changed:** Added `policycoreutils-python-utils` to the `dnf install` command in Step 1.
- **Why:** Without this package, readers following the guide on a minimal Rocky Linux 9 install would encounter a "command not found" error at Step 3.

### Issue 2: Incorrect dashboard password command syntax (Step 8)
- **What was wrong:** The command `ceph dashboard ac-user-set-password admin --force-password Secure123!` uses an outdated inline password syntax. In Ceph Reef (18.x) and Squid (19.x), the `ac-user-set-password` command requires the password to be supplied via a file using the `-i` flag.
- **What was changed:** Replaced the inline password command with the correct file-based approach: write password to a temp file, pass it with `-i`, then remove the temp file.
- **Why:** The old syntax would fail with a usage error in Ceph Squid, preventing readers from resetting the dashboard password.

## Review Notes
- The cephadm download URL (`https://download.ceph.com/rpm-squid/el9/noarch/cephadm`) uses the direct curl method. While functional, the official Ceph documentation now recommends installing cephadm via RPM packages (`dnf install cephadm`) after adding the Ceph repository. The curl method is still valid but may deliver an older point release.
- The firewall port list is correct for a basic MON/OSD/MGR cluster. If the reader deploys an RGW (Object Gateway), they may also need to open port 7480/tcp (the default RGW port), which is not mentioned. However, 7480 falls outside the 6800-7300 range. Since the post focuses on base cluster setup and not RGW specifically, this is acceptable.
- The `ssh-copy-id` command omits the `-f` flag, which is optional but can be useful to force key installation even if it already exists. This is a minor style preference, not an error.
- Disabling swap is described as "recommended for Ceph." While common practice, newer Ceph releases handle memory management better with OSD memory targets. The recommendation is still reasonable for production clusters.

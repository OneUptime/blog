# Validation Summary: How to Fix AUTH_BAD_CAPS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster health checks, authentication system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox access)
- Ceph Auth subsystem (capabilities, keyrings, entity management)

## Sources Consulted
- Ceph Health Checks documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph source code — `src/mon/AuthMonitor.cc` on GitHub (confirms AUTH_BAD_CAPS uses HEALTH_ERR severity)
- Ceph source code — `doc/rados/operations/health-checks.rst` on GitHub
- Ceph User Management documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Red Hat solution article on AUTH_BAD_CAPS post-upgrade: https://access.redhat.com/solutions/5868541

## Issues Found
1. **Incorrect health check severity**: The sample `ceph health detail` output showed `HEALTH_WARN` and `[WRN]`, but AUTH_BAD_CAPS is actually a `HEALTH_ERR` level check. The Ceph source code in `AuthMonitor.cc` explicitly registers it with `HEALTH_ERR`. Changed `HEALTH_WARN` to `HEALTH_ERR` and `[WRN]` to `[ERR]` in the sample output.
2. **Incorrect health message text**: The sample output showed "auth entities have bad caps" but the actual Ceph message is "auth entities have invalid capabilities". Updated the message text to match the real Ceph output.

## Review Notes
- All `ceph auth` commands (`ls`, `get`, `caps`, `get-or-create`) use correct syntax and match official documentation.
- The `allow profile osd` monitor capability for OSD daemons is correct and well-documented.
- The capability examples (`allow r`, `allow rw pool=mypool`, `allow *`) are all valid Ceph capability syntax.
- The kubectl command for accessing the Rook toolbox is correct.
- The claim that "Ceph validates capabilities at startup and during health checks" is a slight simplification — validation actually occurs during auth state encoding in the Paxos consensus process — but this is acceptable for a practitioner-focused blog post.

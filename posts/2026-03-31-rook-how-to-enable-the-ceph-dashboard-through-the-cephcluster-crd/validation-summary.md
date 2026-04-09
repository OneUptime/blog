# Validation Summary: How to Enable the Ceph Dashboard Through the CephCluster CRD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph Dashboard (MGR module)
- CephCluster CRD (ceph.rook.io/v1)
- Kubernetes Services (ClusterIP, NodePort)
- Kubernetes Ingress (nginx)
- Ceph CLI (dashboard management commands)

## Sources Consulted
- Rook official dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph MGR dashboard documentation (upstream): https://docs.ceph.com/en/latest/mgr/dashboard/

## Issues Found

### 1. Ingress: Conflicting SSL annotations
- **What was wrong:** The Ingress manifest used both `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` and `nginx.ingress.kubernetes.io/ssl-passthrough: "true"`. These are contradictory — `ssl-passthrough` forwards raw TLS to the backend (no termination at ingress), while `backend-protocol: HTTPS` implies the ingress terminates TLS and re-encrypts. The official Rook docs do not use `ssl-passthrough`. Additionally, the required `proxy_ssl_verify off` server-snippet was missing.
- **What was changed:** Removed the `ssl-passthrough` annotation and added the `nginx.ingress.kubernetes.io/server-snippet` annotation with `proxy_ssl_verify off`, matching the official Rook documentation.

### 2. Custom SSL Certificate: Invalid CRD field and wrong mechanism
- **What was wrong:** The section suggested creating a TLS secret named `rook-ceph-dashboard-tls` and then adding `securePort: 8443` to the CephCluster CRD. The `securePort` field does not exist in `spec.dashboard` (it belongs to `CephObjectStore.spec.gateway`). The valid dashboard fields are `enabled`, `ssl`, `port`, and `urlPrefix`. There is no automatic linkage between a TLS secret and the dashboard CRD.
- **What was changed:** Replaced the approach with the correct Ceph CLI commands: `ceph dashboard set-ssl-certificate -i` and `ceph dashboard set-ssl-certificate-key -i`, which are the official way to configure custom dashboard certificates. Removed the invalid `securePort` field from the CRD snippet.

### 3. Dashboard Credentials: Non-existent `--password-hashed` flag
- **What was wrong:** The admin password change command used `--password-hashed` with an inline bcrypt hash via Python. The `--password-hashed` flag does not exist for `ceph dashboard ac-user-set-password`. The correct command for hashed passwords is a separate `ac-user-set-password-hash` command, and the standard `ac-user-set-password` reads the password from a file via `-i`.
- **What was changed:** Replaced with the correct syntax: `echo 'newpassword' | ceph dashboard ac-user-set-password admin -i -`, which pipes the password through stdin.

### 4. Read-only user creation: Wrong syntax and role name
- **What was wrong:** The commands `ceph dashboard ac-user-create monitoring viewer` and `ceph dashboard ac-user-set-password monitoring viewer` were incorrect in multiple ways: (a) `viewer` is not a valid built-in role (the correct name is `read-only`), (b) the password was not provided via `-i <file>`, and (c) `viewer` in the set-password command would be misinterpreted as a positional argument.
- **What was changed:** Replaced with a single correct command: `echo 'monitoringpassword' | ceph dashboard ac-user-create monitoring -i - read-only`, which creates the user with a password piped via stdin and assigns the `read-only` role. Also changed `exec -it` to `exec -i` since stdin is piped (no TTY needed).

## Review Notes
- The NodePort service selector `app: rook-ceph-mgr` will match all MGR pods including standby instances. The Rook-created dashboard service uses additional selectors like `mgr_role: active` to target only the active MGR. This is a minor consideration but works in practice since Kubernetes will route to healthy endpoints.
- The default non-SSL port is stated as 7000, which aligns with Rook's default behavior (Ceph itself defaults to 8080, but Rook overrides to 7000).
- The `ceph mgr module enable prometheus` and `ceph dashboard set-*-api-host` commands in the "Enabling Dashboard Modules" section are correct.

# Validation Summary: How to Enable and Configure the Ceph Dashboard Module

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph Manager (MGR) Dashboard Module
- Kubernetes (kubectl)
- CephCluster CRD (ceph.rook.io/v1)

## Sources Consulted
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Rook Ceph Quickstart documentation: https://rook.io/docs/rook/latest/Getting-Started/quickstart/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Red Hat Ceph Storage 5 Dashboard Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/dashboard_guide/

## Issues Found

### 1. Incorrect MGR deployment name in rollout status command
- **What was wrong:** `kubectl -n rook-ceph rollout status deployment rook-ceph-mgr` used a deployment name without the daemon ID suffix.
- **What was changed:** Corrected to `deployment rook-ceph-mgr-a`. Rook names MGR deployments with a daemon ID suffix (e.g., `-a`).
- **Why:** The deployment `rook-ceph-mgr` does not exist; the actual deployment is `rook-ceph-mgr-a`.

### 2. Incorrect flag for bypassing password policy in `ac-user-set-password`
- **What was wrong:** Used `--password-policy-check=false`, which is not a valid Ceph CLI flag.
- **What was changed:** Replaced with `--force-password`, which is the correct flag to bypass password policy checks.
- **Why:** The `--force-password` flag is the documented way to skip password policy enforcement in the Ceph dashboard CLI.

### 3. Missing `-i -` flag for password input via stdin
- **What was wrong:** The `ac-user-set-password` command did not include `-i -` to read the password from stdin.
- **What was changed:** Added `-i -` to the command so the password provided via `<<<` is correctly read from stdin.
- **Why:** Since Nautilus 14.2.17+, `ac-user-set-password` requires `-i <file>` (or `-i -` for stdin) to receive the password.

### 4. Incorrect `kubectl exec` flags when using stdin redirection
- **What was wrong:** Commands using `<<<` (password) and `<` (SSL certificates) used `kubectl exec -it`, which allocates a TTY that can interfere with stdin piping.
- **What was changed:** Changed `-it` to `-i` for the password command and both SSL certificate commands.
- **Why:** The `-t` flag allocates a pseudo-TTY which can corrupt piped data or cause unexpected behavior with shell redirection operators.

### 5. Missing `-i` flag in SSL certificate commands
- **What was wrong:** Used `ceph dashboard set-ssl-certificate -` and `set-ssl-certificate-key -` (bare `-` as argument).
- **What was changed:** Corrected to `ceph dashboard set-ssl-certificate -i -` and `set-ssl-certificate-key -i -`.
- **Why:** The Ceph CLI uses `-i <filename>` to specify input files; `-i -` is the convention for reading from stdin.

### 6. Reordered SSL certificate commands
- **What was wrong:** The key was set before the certificate (key first, then cert).
- **What was changed:** Reordered to set the certificate first, then the key, which is the conventional order.
- **Why:** Setting the certificate before the key follows the standard convention and matches official documentation examples.

## Review Notes
- The CephCluster CRD spec, service names (`rook-ceph-mgr-dashboard`), secret name (`rook-ceph-dashboard-password`), and jsonpath for retrieving the password are all correct.
- The `ceph config set mgr mgr/dashboard/ssl false` command for disabling SSL is correct.
- The post assumes the default MGR daemon ID is `a` (`rook-ceph-mgr-a`). In multi-MGR setups, the active MGR could be `b` or another ID. A note about checking the active MGR could be helpful in a future revision.
- The default dashboard port 8443 for HTTPS is correct per both Ceph and Rook documentation.

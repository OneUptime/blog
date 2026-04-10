# Validation Summary: How to Automate Ceph Pool Creation with Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (pool management, erasure coding, quotas, compression)
- Rook (Ceph operator for Kubernetes)
- Bash scripting
- Python 3 (subprocess, PyYAML)
- kubectl (Kubernetes CLI)
- YAML configuration

## Sources Consulted
- Ceph official documentation — Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation — Erasure Code Profiles: https://docs.ceph.com/en/reef/rados/operations/erasure-code-profile/
- Ceph official documentation — Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation — Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/reef/rados/configuration/pool-pg-config-ref/
- Ceph official documentation — Compression: https://docs.ceph.com/en/latest/radosgw/compression/
- Kubernetes documentation — kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Python documentation — subprocess.run: https://docs.python.org/3/library/subprocess.html

## Issues Found

1. **`-it` flag in `ceph_cmd()` function (line 33)**: The function used `kubectl exec -it` which allocates a pseudo-TTY. In a non-interactive script, the `-t` flag adds carriage return characters to output, which corrupts piped commands (e.g., `ceph_cmd ... | grep`). Changed to `kubectl exec` (no `-it` flags) since the script doesn't need interactive input or a TTY.

2. **Hardcoded `rgw` app tag in `create_erasure_pool()` (line 84)**: The erasure pool function hardcoded `rgw` as the application tag (`ceph osd pool application enable "$POOL_NAME" rgw`) instead of using the `$APP_TAG` variable. This was inconsistent with `create_replicated_pool()` which correctly used `$APP_TAG`. Changed to use `$APP_TAG` for consistency.

3. **Python `env` parameter replaces entire environment (line 154)**: `subprocess.run(..., env={...})` completely replaces the subprocess environment, removing essential variables like `PATH`, `HOME`, and `KUBECONFIG`. This would cause the shell script to fail because `kubectl` would not be found. Fixed by using `os.environ.copy()` and updating it with the pool-specific variables. Added missing `import os`.

4. **Python script missing `EC_K`/`EC_M` environment variables**: The YAML config defined `ec_k` and `ec_m` fields for erasure-coded pools, but the Python script never passed them as `EC_K` and `EC_M` environment variables to the shell script. Erasure pools created via the Python script would always use hardcoded defaults. Added `EC_K` and `EC_M` to the environment dictionary.

## Review Notes
- All Ceph CLI commands (`osd pool create`, `osd pool set`, `osd pool set-quota`, `osd erasure-code-profile set`, `osd pool application enable`, `osd pool ls detail`) are syntactically correct and use current syntax.
- The `deploy/rook-ceph-tools` resource reference for `kubectl exec` is valid Kubernetes syntax for targeting a Deployment.
- The pg_autoscale_mode, compression settings, and quota commands all use correct parameter names and values.
- The YAML pool definitions use sensible defaults (PG counts are powers of 2, replica size of 3, etc.).

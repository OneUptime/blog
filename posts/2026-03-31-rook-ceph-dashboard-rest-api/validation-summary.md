# Validation Summary: How to Use the Ceph Dashboard REST API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph Dashboard REST API
- JWT authentication
- Swagger / OpenAPI
- cURL
- Python (requests library)
- RBD (RADOS Block Device) image management
- Ceph pool management

## Sources Consulted
- Ceph RESTful API documentation: https://docs.ceph.com/en/reef/mgr/ceph_api/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph Dashboard auth controller source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/controllers/auth.py
- Ceph Dashboard pool controller source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/controllers/pool.py
- Ceph Dashboard RBD controller source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/controllers/rbd.py
- Ceph Dashboard docs controller source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/controllers/docs.py
- Ceph Dashboard health controller source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/controllers/health.py

## Issues Found
1. **Swagger UI URL was incorrect**: Changed `/api/swagger-ui` to `/docs`. The Ceph Dashboard serves its Swagger UI at the `/docs` path, not `/api/swagger-ui`.

2. **OpenAPI spec URL was incorrect**: Changed `/api/swagger.json` to `/docs/api.json`. The OpenAPI specification JSON is served at `/docs/api.json` per the Docs controller in the Ceph Dashboard source code.

3. **Cluster capacity endpoint was wrong**: Changed `/api/cluster_conf` to `/api/health/get_cluster_capacity`. The `/api/cluster_conf` endpoint returns cluster configuration settings (e.g., `mon_allow_pool_delete`, `osd_pool_default_size`), not cluster capacity. The correct endpoint for capacity information is `/api/health/get_cluster_capacity`.

4. **Python client health status access path was incorrect**: Changed `health['status']` to `health['health']['status']`. The `/api/health/minimal` endpoint returns a response where the health status is nested under a `health` key (e.g., `{"health": {"status": "HEALTH_OK", ...}, ...}`), so the correct access path is `health['health']['status']`.

5. **Summary section referenced wrong Swagger UI path**: Updated the `/api/swagger-ui` reference in the Summary section to `/docs` for consistency with the fix above.

## Review Notes
- The authentication endpoint (`POST /api/auth`) returns additional fields beyond `token` (including `username`, `permissions`, `pwdExpirationDate`, `sso`, `pwdUpdateRequired`), but the blog only extracts the `token` field which is correct for its purpose.
- The pool creation example omits `pg_num`, which is listed as a parameter in the API spec. However, with `pg_autoscale_mode` set to `"on"` (as shown in the example), the PG autoscaler handles placement group allocation, so this omission is acceptable for the use case shown.
- The Python client disables SSL verification (`verify = False`) and suppresses urllib3 warnings. This is appropriate for development/testing with self-signed certificates but should not be used in production. The blog could benefit from a note about this, but it is not a technical error.

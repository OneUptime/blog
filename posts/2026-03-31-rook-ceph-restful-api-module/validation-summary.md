# Validation Summary: How to Set Up the Ceph RESTful API Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph Manager (MGR) RESTful module
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, Services, port-forwarding)
- Python (requests library)
- curl

## Sources Consulted
- Ceph RESTful Module Documentation (Reef): https://docs.ceph.com/en/reef/mgr/restful/
- Ceph RESTful Module Documentation (Quincy): https://docs.ceph.com/en/quincy/mgr/restful/
- Ceph source code - restful module: https://github.com/ceph/ceph/blob/reef/src/pybind/mgr/restful/module.py
- Ceph source code - restful API endpoints: https://github.com/ceph/ceph/blob/reef/src/pybind/mgr/restful/api/__init__.py
- Ceph source code - OSD API: https://github.com/ceph/ceph/blob/reef/src/pybind/mgr/restful/api/osd.py
- Ceph source code - config API: https://github.com/ceph/ceph/blob/reef/src/pybind/mgr/restful/api/config.py
- Rook Ceph Dashboard documentation: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Monitoring/ceph-dashboard.md

## Issues Found

1. **Incorrect `/api/` prefix on all endpoints**: All curl examples and the endpoint reference used paths like `/api/osd`, `/api/pool`, etc. The Ceph RESTful module serves endpoints at the root (e.g., `/osd`, `/pool`, `/mon`), not under an `/api/` prefix. Fixed by removing the `/api` prefix from all endpoint paths.

2. **Non-existent `/health/full` endpoint**: The post referenced `GET /api/health/full` as a primary endpoint for checking cluster health. This endpoint does not exist in the RESTful module — there is no health endpoint at all (no `health.py` exists in the API source). Replaced health-related examples with `/server` which is a valid endpoint.

3. **Non-existent `POST /osd/{id}/down` endpoint**: The post listed `POST /api/osd/{id}/down` for marking an OSD down. This endpoint does not exist. The correct approach is `PATCH /osd/{id}` with a JSON body like `{"up": false}`. Fixed the endpoint reference.

4. **Incorrect `/config/global` endpoint**: The post listed `GET /api/config/global`. The correct endpoint is `GET /config/cluster`. Fixed in the endpoint reference.

5. **Port-forward targeting wrong resource**: The post used `kubectl port-forward svc/rook-ceph-mgr 8003:8003`. The `rook-ceph-mgr` service exposes port 9283 (Prometheus metrics), not port 8003 (restful API). Changed to forward from `deploy/rook-ceph-mgr-a` directly, which exposes all ports on the MGR pod including 8003.

6. **Python example using non-existent endpoint and deprecated field**: The Python example called `/health/full` (which doesn't exist) and accessed `health['overall_status']` (a field deprecated since Ceph Luminous, replaced by `status`). Rewrote the example to use the valid `/osd` endpoint instead.

## Review Notes
- The `app: rook-ceph-mgr` selector in the custom Kubernetes Service definition is correct for Rook deployments. Rook automatically updates services with this label to point to the active MGR.
- The configuration options `mgr/restful/server_port` and `mgr/restful/server_addr` are correct for cluster-wide configuration. Instance-specific configuration uses `mgr/restful/$name/server_port` where `$name` is the MGR daemon ID — this variant is not mentioned but the cluster-wide form is valid.
- The `ceph restful delete-key` command also exists but is not mentioned in the post. This is a minor omission, not an error.
- The Ceph RESTful module is distinct from the Ceph Dashboard (which also has a REST API). The post correctly focuses on the standalone RESTful module.

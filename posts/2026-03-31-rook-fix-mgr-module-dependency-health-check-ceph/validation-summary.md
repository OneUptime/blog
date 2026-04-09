# Validation Summary: How to Fix MGR_MODULE_DEPENDENCY Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Ceph Manager (ceph-mgr) modules
- Rook (Kubernetes Ceph operator)
- kubectl

## Sources Consulted
- [Ceph Health Checks Documentation (Reef)](https://docs.ceph.com/en/reef/rados/operations/health-checks/) — confirmed MGR_MODULE_DEPENDENCY is a real health check code
- [ceph-mgr module developer's guide (Quincy)](https://docs.ceph.com/en/quincy/mgr/modules/) — verified `can_run()` mechanism for dependency reporting
- [ceph-mgr administrator's guide](https://docs.ceph.com/en/latest/mgr/administrator/) — verified `ceph mgr module ls` output format and command syntax
- [Ceph Dashboard Documentation](https://docs.ceph.com/en/latest/mgr/dashboard/) — confirmed dashboard is self-contained, not dependent on `restful` or `telemetry`
- [Ceph iostat module documentation](https://docs.ceph.com/en/quincy/mgr/iostat/) — confirmed `iostat` is a valid MGR module
- [Ceph pg_autoscaler documentation](https://docs.ceph.com/en/latest/rados/operations/placement-groups/) — confirmed pg_autoscaler has no dependency on prometheus
- [Ceph Balancer Module Documentation (Reef)](https://docs.ceph.com/en/reef/rados/operations/balancer/) — confirmed no dependency on a `stats` module
- [Feature #21502: Enable mgr modules to report their "runnability"](https://tracker.ceph.com/issues/21502) — background on `can_run` implementation

## Issues Found

1. **Incorrect command for checking module dependencies**: The post used `ceph mgr metadata | python3 -m json.tool` to "check the module's requirements." `ceph mgr metadata` shows MGR daemon metadata (hostname, Ceph version, memory usage), not module dependency information. **Fixed**: Replaced with `ceph mgr module ls --format=json-pretty`, which includes `can_run` and `error_string` fields for each module.

2. **Fabricated inter-module dependency relationships**: The post listed three dependency relationships that are incorrect:
   - "`balancer` depends on `stats` being enabled" — There is no standard `stats` MGR module in Ceph. The balancer module has no such inter-module dependency.
   - "`pg_autoscaler` may depend on `prometheus` for feedback" — pg_autoscaler uses internal pool statistics and has no dependency on the prometheus module.
   - "`dashboard` depends on `restful` and `telemetry`" — The dashboard has its own REST API (built on CherryPy) and does not depend on the `restful` module. The `telemetry` module is entirely separate.
   **Fixed**: Replaced with accurate Python package dependencies that commonly cause MGR_MODULE_DEPENDENCY warnings (e.g., `dashboard` needs `cherrypy`/`routes`/`PyOpenSSL`, `diskprediction_local` needs `numpy`/`scipy`/`scikit-learn`, `restful` needs `pecan`/`PyOpenSSL`).

3. **Incorrect example health output**: The example output referenced the fabricated `balancer`/`stats` dependency. **Fixed**: Replaced with a realistic example showing a Python library dependency failure for the dashboard module.

4. **`ceph mgr module enable stats` commands**: The `stats` module does not exist as a standard Ceph MGR module. **Fixed**: Replaced all `stats` references with real modules like `restful` and `dashboard`.

5. **Invalid `ceph tell mgr* mgr_status` command**: Two issues — the wildcard syntax should be `mgr.*` (not `mgr*`), and `mgr_status` is not a recognized command. **Fixed**: Replaced with `ceph mgr module ls --format=json-pretty` and `ceph health detail`, which are the correct ways to check module status and remaining health warnings.

## Review Notes
- The Ceph container image tag `v18.2.0` (Reef) in the Rook patching example is valid but may not be the latest point release. Users should check for the latest v18.x tag.
- The `iostat` module reference in the re-enabling section is valid — it is a real Ceph MGR module.
- MGR_MODULE_DEPENDENCY is primarily triggered by Python package dependencies (via the `can_run()` mechanism) rather than inter-module dependencies. The post's emphasis on inter-module dependencies was misleading; the corrected version better reflects that Python library issues are the most common cause.

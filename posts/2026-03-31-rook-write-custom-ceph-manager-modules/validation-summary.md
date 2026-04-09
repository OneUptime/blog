# Validation Summary: How to Write Custom Ceph Manager Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph Manager (ceph-mgr) module framework
- Python (mgr_module API)
- Rook (mentioned in tags)
- Python unittest / unittest.mock

## Sources Consulted
- Ceph source code: `src/pybind/mgr/mgr_module.py` (main branch) — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/mgr_module.py
- Ceph `hello` example module: `src/pybind/mgr/hello/module.py` — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/hello/module.py
- Ceph Manager module documentation — https://docs.ceph.com/en/latest/mgr/modules/

## Issues Found

### 1. Cluster state methods did not exist (Critical)
**What was wrong:** The post listed five non-existent methods: `self.get_osd_map()`, `self.get_mon_map()`, `self.get_fs_map()`, `self.get_all_perf_counters()`, and `self.get_pool_stats()`. These would all raise `AttributeError` at runtime.
**What was changed:** Replaced with the correct `self.get("osd_map")`, `self.get("mon_map")`, `self.get("fs_map")`, `self.get_perf_counters()`, and `self.get("pool_stats")` calls. The `MgrModule.get(data_name)` method is the generic accessor for cluster-wide data objects.
**Why:** The MgrModule class does not define convenience methods with those names. Cluster maps and stats are accessed via the generic `self.get(data_name)` method, which accepts string keys like `"osd_map"`, `"mon_map"`, `"fs_map"`, `"pool_stats"`, etc.

### 2. `_collect_data()` used non-existent `get_osd_map()` (Critical)
**What was wrong:** The `_collect_data` method in the module skeleton called `self.get_osd_map()`.
**What was changed:** Replaced with `self.get("osd_map")`.
**Why:** Same root cause as issue #1 — this method does not exist on MgrModule.

### 3. MODULE_OPTIONS used plain dicts instead of Option() objects (Moderate)
**What was wrong:** `MODULE_OPTIONS` was defined as a list of plain Python dicts: `{"name": "poll_interval", "type": "int", ...}`.
**What was changed:** Replaced with `Option(name="poll_interval", type="int", default=60, desc="Seconds between polls", runtime=True)` and added `Option` to the import statement.
**Why:** While plain dicts may work at runtime (since `Option` inherits from `dict`), this is undocumented behavior. All official Ceph modules use `Option()` objects, which provide field validation and proper defaults for `level`, `runtime`, `long_desc`, `tags`, etc. Using plain dicts could break in future versions.

### 4. Test patcher never stopped (Bug)
**What was wrong:** In the test `setUp()`, a `patch()` patcher was started but never stopped — the `patcher` variable was local and lost when `setUp()` returned.
**What was changed:** Added `self.addCleanup(patcher.stop)` after `patcher.start()`.
**Why:** Without cleanup, the mock leaks across test cases, potentially causing interference between tests.

### 5. Test mocked non-existent method (Bug)
**What was wrong:** The test set `mod.get_osd_map = MagicMock(...)`, mocking a method that does not exist on MgrModule.
**What was changed:** Changed to `mod.get = MagicMock(...)` to match the corrected `_collect_data()` implementation.
**Why:** The mock must match the actual API being called.

## Review Notes
- The CLI command return type uses plain tuples `(0, "msg", "")` instead of `HandleCommandResult`. This is technically valid — the framework accepts `Union[HandleCommandResult, Tuple[int, str, str]]` — but `HandleCommandResult` is the preferred pattern in official modules as it provides named fields with sensible defaults.
- The `CLIReadCommand` and `CLIWriteCommand` imports are valid (they are aliases for `CLICommandBase.Read` and `CLICommandBase.Write`), though the official `hello` module defines a custom subclass of `CLICommand` instead.
- The module file path `/usr/share/ceph/mgr/` is correct for standard package installations.
- The `serve()` / `shutdown()` pattern, `mon_command()` usage, and deployment commands are all correct.
- Note that `self.get_osdmap()` (no underscore between "osd" and "map") does exist but returns a typed `OSDMap` object, not a plain dict. The post's use case (accessing `["osds"]` as a dict key) is better served by `self.get("osd_map")` which returns the map as a dict.

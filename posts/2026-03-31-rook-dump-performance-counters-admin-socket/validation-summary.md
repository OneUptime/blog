# Validation Summary: How to Dump Performance Counters via Admin Socket

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (admin socket interface)
- Rook (Ceph orchestrator for Kubernetes)
- Ceph OSD, MON, and RGW daemons
- Ceph perf counters (perf dump, perf schema, perf reset, perf histogram)
- Python 3 (for JSON parsing of perf dump output)
- Bash scripting (for throughput monitoring loop)

## Sources Consulted
- [Perf counters — Ceph Documentation (v9.0.0 mirror)](https://docs.huihoo.com/ceph/v9.0.0/dev/perf_counters/index.html) — confirms simple counters are plain integers, LONGRUNAVG counters are `{avgcount, sum}` objects
- [Ceph Users mailing list — Meaning of ceph perf dump](https://www.spinics.net/lists/ceph-users/msg19951.html) — confirms latency counters have `avgcount` and `sum` fields, simple counters are integers
- [Perf counters — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/dev/perf_counters/) — primary reference for counter types and bit fields
- [Red Hat Ceph Storage 7 Administration Guide — Performance Counters](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/administration_guide/ceph-performance-counters) — confirms command syntax and counter structure
- [Perf histograms — Ceph Documentation](https://docs.ceph.com/en/latest/dev/perf_histograms/) — confirms perf histogram schema/dump commands

## Issues Found

### Issue 1: OSD counter parsing script treated simple counters as objects (Critical)
- **What was wrong:** The Python script for parsing OSD performance counters used `.get('val', 'N/A')` on `op_r` and `op_w` counters, treating them as JSON objects with a `val` field. In reality, `perf dump` outputs simple U64 counters as plain integers (e.g., `"op_r": 12345`), not as objects. Calling `.get()` on an integer would raise `AttributeError: 'int' object has no attribute 'get'`.
- **What was changed:** Replaced `osd.get('op_r', {}).get('val', 'N/A')` with `osd.get('op_r', 'N/A')` and similarly for `op_w`. The latency counters (`op_r_latency`, `op_w_latency`) were correctly accessed as objects with `.avgcount` and were left unchanged.
- **Why:** Verified against official Ceph documentation that simple counters output plain integer values while only average/latency counters output `{avgcount, sum}` objects.

### Issue 2: Throughput monitoring script treated op_w as an object (Critical)
- **What was wrong:** The `get_ops()` function in the throughput monitoring script used `.get('op_w',{}).get('val',0)`, which would crash for the same reason as Issue 1.
- **What was changed:** Replaced with `.get('op_w',0)` to directly access the integer value.
- **Why:** Same as Issue 1 — `op_w` is a plain integer in `perf dump` output.

### Issue 3: RGW counter parsing script treated all counters as objects (Critical)
- **What was wrong:** The RGW parsing script used `v.get("val", v)` on each counter value, assuming they were JSON objects. The counters listed (`get`, `put`, `delete`, `get_b`, `put_b`, `qlen`, `qactive`) are all simple integer counters and would cause the same `AttributeError`.
- **What was changed:** Simplified to `v = rgw.get(k, 'N/A')` and `print(f'{k}: {v}')`, directly printing the integer values.
- **Why:** Same root cause — simple counters are plain integers in `perf dump` output.

## Review Notes
- The post states "Ceph perf counters have two types" (PERFCOUNTER_U64 and PERFCOUNTER_LONGRUNAVG). This is a simplification — counter types are actually defined by bit fields (bit 1: float, bit 2: u64, bit 4: average, bit 8: counter vs gauge), producing types like u64 gauge, u64 counter, float average, etc. However, for practical purposes, the two output formats (plain integer vs avgcount/sum pair) are the most important distinction, so the simplification is acceptable for a tutorial.
- The `perf reset all` command is commonly referenced but not extensively documented in official sources. It should work in practice but readers should be aware.
- RGW daemon identifiers (e.g., `rgw.myzone`) vary depending on deployment method and Ceph version. In Rook-managed clusters, the daemon name format may differ. The post uses a placeholder which is reasonable.
- The `perf histogram schema` and `perf histogram dump` commands are confirmed valid per the official Ceph perf histograms documentation.

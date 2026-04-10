# Validation Summary: How to Set CRUSH Tunable Profiles (Legacy, Argonaut, Bobtail, Firefly, Optimal)

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH algorithm (Controlled Replication Under Scalable Hashing)
- CRUSH tunable profiles (legacy, argonaut, bobtail, firefly, hammer, jewel, optimal)
- crushtool CLI utility
- Rook (Kubernetes storage orchestrator for Ceph)

## Sources Consulted
- Ceph official documentation on CRUSH map tunables (https://docs.ceph.com/en/latest/rados/operations/crush-map/#tunables)
- Ceph source code: `CrushWrapper.h` — `set_tunables_legacy()`, `set_tunables_argonaut()`, `set_tunables_bobtail()`, `set_tunables_firefly()`, `set_tunables_hammer()`, `set_tunables_jewel()`, `set_tunables_optimal()`
- `ceph(8)` man page for CLI command verification
- `crushtool(8)` man page for flag verification

## Issues Found

### 1. Incorrect `choose_local_tries` values in profile table
**What was wrong:** The table listed `choose_local_tries = 2` for bobtail, firefly, hammer, and jewel profiles.
**What was changed:** Corrected to `choose_local_tries = 0` for bobtail through optimal. Only legacy and argonaut use the value 2.
**Why:** The Ceph source code (`set_tunables_bobtail()` and later) explicitly sets `choose_local_tries = 0`.

### 2. Missing `choose_local_fallback_tries` column
**What was wrong:** The tunable comparison table omitted the `choose_local_fallback_tries` tunable entirely.
**What was changed:** Added the column with correct values: legacy/argonaut = 5, bobtail through optimal = 0.
**Why:** This is a real and documented CRUSH tunable that changes between legacy and modern profiles.

### 3. Incorrect `chooseleaf_descend_once` for bobtail
**What was wrong:** Listed as 0 for bobtail.
**What was changed:** Corrected to 1.
**Why:** The bobtail release introduced `chooseleaf_descend_once = 1` as confirmed in the Ceph source.

### 4. Incorrect `chooseleaf_vary_r` for firefly
**What was wrong:** Listed as 0 for firefly.
**What was changed:** Corrected to 1.
**Why:** The firefly release introduced `chooseleaf_vary_r = 1` as confirmed in the Ceph source.

### 5. Incorrect `straw_calc_version` values
**What was wrong:** The table showed `straw_calc_version = 1` for bobtail through jewel profiles.
**What was changed:** Corrected to 0 for all profiles except optimal (which is 1). Only `set_tunables_legacy()` (value 0) and `set_tunables_optimal()` (value 1) explicitly set this tunable.
**Why:** Intermediate profile functions in the source code do not set `straw_calc_version`, so it retains its previous value (0 if starting from legacy).

### 6. Incorrect client compatibility requirement for optimal profile
**What was wrong:** "The `optimal` profile requires clients from the Hammer release or later. If older clients connect, use the `jewel` profile instead."
**What was changed:** Corrected to "The `optimal` profile requires clients from the Jewel release or later (v10.0.2+ / kernel v4.5+). If older clients connect, use the `hammer` profile instead."
**Why:** The optimal profile calls `set_tunables_jewel()` internally and requires CRUSH_TUNABLES5 (chooseleaf_stable), which is a Jewel-era feature. Suggesting jewel as a fallback for optimal makes no sense since they are nearly identical — hammer is the correct fallback.

### 7. Invalid `ceph mon dump` command for client compatibility
**What was wrong:** `ceph mon dump | grep min_compat_client` — `min_compat_client` is not a field in the mon map.
**What was changed:** Replaced with `ceph osd dump | grep require_min_compat_client`, which is the correct location for this field (in the OSD map).
**Why:** The `require_min_compat_client` property is stored in the OSD map, not the monitor map.

## Review Notes
- The `ceph features` command is valid and correctly used.
- All `crushtool` flags (`-d`, `-c`, `-i`, `--test`, `--rule`, `--num-rep`, `--min-x`, `--max-x`, `--show-statistics`) are correct per the crushtool man page.
- The production upgrade procedure (setting norebalance/norecover flags) is sound operational advice.
- The `ceph osd crush tunables <profile>` command syntax is correct.
- The `ceph osd crush show-tunables` command is correct.
- The health warning example format is accurate.

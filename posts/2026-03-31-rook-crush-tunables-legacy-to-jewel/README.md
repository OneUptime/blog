# How to Understand CRUSH Tunables (Legacy Through Jewel)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Tunable, Storage

Description: Understand the evolution of Ceph CRUSH tunables from the legacy profile through the Jewel release and how each profile affects data placement behavior.

---

## What are CRUSH Tunables

CRUSH tunables are low-level configuration parameters that control the behavior of the CRUSH placement algorithm. Over Ceph's history, several bugs and suboptimal behaviors in the original CRUSH algorithm were identified and fixed - but the fixes could not be applied retroactively without triggering data movement. Tunables allow clusters to opt into improved behavior at a controlled time.

Each Ceph release introduced new tunables or changed their defaults, and named profiles (legacy, argonaut, bobtail, firefly, hammer, jewel, optimal) bundle these settings together.

## Viewing Current Tunables

```bash
# Show all current CRUSH tunable values
ceph osd crush show-tunables

# Or from the CRUSH map dump
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
grep "^tunable" crush.txt
```

Example output:

```text
tunable choose_local_tries 0
tunable choose_local_fallback_tries 0
tunable choose_total_tries 50
tunable chooseleaf_descend_once 1
tunable chooseleaf_vary_r 1
tunable chooseleaf_stable 1
tunable straw_calc_version 1
tunable allowed_bucket_algs 54
```

## Tunable Profiles Through History

| Profile | Key Changes |
|---|---|
| legacy | Original CRUSH with all bugs, choose_total_tries=19 |
| argonaut | Minor internal fixes, choose_local_tries=2 |
| bobtail | choose_local_tries=0, choose_total_tries=50, chooseleaf_descend_once=1 |
| firefly | chooseleaf_vary_r=1, straw_calc_version=1 |
| hammer | Added straw2 bucket type (expanded allowed_bucket_algs) |
| jewel | chooseleaf_stable=1 (prevents remapping on OSD failure) |
| optimal | All improvements enabled (current best practice) |

## What Each Key Tunable Does

```text
choose_local_tries:
  Number of local retries before re-descent
  Legacy=2, Modern=0

choose_total_tries:
  Maximum total attempts to find valid OSDs
  Higher = more thorough but slower for large clusters
  Default=50

chooseleaf_descend_once:
  Only descend into each subtree once during chooseleaf
  Bobtail+ sets to 1, reducing unnecessary retries

chooseleaf_vary_r:
  Vary the starting position in chooseleaf based on replica number
  Firefly+ sets to 1, improving distribution when OSDs fail

chooseleaf_stable:
  Avoid remapping chooseleaf results when parent bucket changes
  Jewel+ sets to 1, greatly reduces unnecessary data movement

straw_calc_version:
  Algorithm version for straw bucket weights
  Version 1 (Firefly+) fixes a distribution bug in version 0
```

## The chooseleaf_stable Improvement

`chooseleaf_stable=1` (introduced in Jewel) is particularly important. Without it, when any OSD in a bucket changes state, Ceph remaps all PGs using chooseleaf in that bucket even if the specific OSD is not involved. With it enabled, only affected PGs are remapped:

```bash
# Check if chooseleaf_stable is enabled
ceph osd crush show-tunables | grep chooseleaf_stable

# Enable if not set
ceph osd crush tunables optimal
```

## Checking Tunable Profile

```bash
# Show the named profile in use
ceph osd crush show-tunables | grep profile

# Check for health warnings about old tunables
ceph health detail | grep CRUSH
```

## Summary

CRUSH tunables control the CRUSH algorithm's behavior and have evolved through Ceph's history from the buggy `legacy` profile to the current `optimal` profile. The most important improvements are in `chooseleaf_stable` (Jewel) which reduces unnecessary data movement, and `chooseleaf_vary_r` (Firefly) which improves distribution under failure. Modern clusters should use the `optimal` profile, which enables all fixes introduced through the Jewel release and beyond.

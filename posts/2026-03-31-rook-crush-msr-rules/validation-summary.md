# Validation Summary: How to Use CRUSH MSR Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH algorithm (Controlled Replication Under Scalable Hashing)
- CRUSH rules with multiple take/emit sequences (multi-step rules)
- crushtool (CRUSH map compilation and testing utility)
- Device classes (SSD/HDD) in CRUSH maps
- Stretch cluster configurations

## Sources Consulted
- Ceph official documentation: CRUSH map editing (`crush-map-edits.rst`) — https://github.com/ceph/ceph/blob/main/doc/rados/operations/crush-map-edits.rst
- Ceph official documentation: CRUSH map reference (`crush-map.rst`) — https://github.com/ceph/ceph/blob/main/doc/rados/operations/crush-map.rst
- Ceph official documentation: Stretch mode (`stretch-mode.rst`) — https://github.com/ceph/ceph/blob/main/doc/rados/operations/stretch-mode.rst
- Ceph CRUSH MSR (Multi-Step Retry) documentation — https://docs.ceph.com/en/tentacle/dev/crush-msr/
- Ceph official documentation: Pools — https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found

### 1. Incorrect claim that multiple `emit` steps are "not standard"
**What was wrong:** The post stated "Wait - the above uses multiple `emit` steps which is not standard. Standard MSR uses a more sequential approach" and then presented a single-step `dc-spread-rule` as the correct alternative. This is factually incorrect. Multiple `emit` steps in a single CRUSH rule are standard, documented in the official Ceph docs, and used in official examples such as `mixed_replicated_rule` in `crush-map.rst` and the stretch cluster rule in `stretch-mode.rst`.

**What was changed:** Removed the incorrect "Wait" paragraph and the `dc-spread-rule` example. Replaced with a correct explanation of how the multi-step rule works: the first `take...emit` sequence produces 2 replicas (one per datacenter) and the second produces 1 replica, for 3 total.

### 2. MSR terminology confusion
**What was wrong:** The post defined MSR as "Multi-Step Replication" throughout. In official Ceph documentation, MSR stands for "Multi-Step Retry" — a different algorithm that uses `choosemsr` steps for retry logic when encountering failed/out OSDs. The concept described in the post (multiple `take...emit` sequences) is valid but is called "multi-step rules," not "MSR."

**What was changed:** Replaced "CRUSH Multi-Step Replication (MSR)" with "CRUSH multi-step rules" throughout the body text and section headers. Added a note clarifying that these multi-step rules should not be confused with the Ceph CRUSH MSR (Multi-Step Retry) algorithm. The title was left unchanged since it is a filename-derived heading.

### 3. Removed incorrect replacement rule (`dc-spread-rule`)
**What was wrong:** The `dc-spread-rule` was presented as the "standard" alternative to multi-step rules, but it is just a regular single-step CRUSH rule. With `choose firstn 2 type datacenter` followed by `chooseleaf firstn 2 type host`, it would attempt to place 2 replicas per datacenter (4 total), which does not achieve the described 2+1 placement pattern.

**What was changed:** Removed the `dc-spread-rule` example entirely as it was misleading.

## Review Notes
- The title still contains "MSR" since it matches the post's directory name (`2026-03-31-rook-crush-msr-rules`). A future rename of both the directory and title to "CRUSH Multi-Step Rules" would improve clarity.
- The `msr-two-plus-one` example rule uses `step take default` for both sequences, meaning the third replica's datacenter is not guaranteed to differ from the first two. The post now notes this and directs readers to the `stretched-2-1` example with named buckets for guaranteed separation.
- All CLI commands (`ceph osd getcrushmap`, `crushtool -d/-c`, `ceph osd setcrushmap`, `ceph osd pool set/get`, `ceph osd map`, `crushtool --test`) are correct and current.
- The `step take default class ssd` syntax is valid and documented since Ceph Luminous.
- The `primary-ssd-secondary-hdd` rule matches the official `mixed_replicated_rule` example from the Ceph documentation almost exactly.
- The `stretched-2-1` rule with named takes (`dc-primary`/`dc-secondary`) matches the official stretch cluster documentation pattern.

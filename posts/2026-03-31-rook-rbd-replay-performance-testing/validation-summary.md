# Validation Summary: How to Use RBD Replay for Performance Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RBD (RADOS Block Device)
- rbd-replay
- rbd-replay-prep
- LTTng (Linux Trace Toolkit: next generation)
- babeltrace

## Sources Consulted
- Ceph official documentation: RBD Replay - https://docs.ceph.com/en/latest/rbd/rbd-replay/
- Ceph man page: rbd-replay-prep - https://docs.ceph.com/en/reef/man/8/rbd-replay-prep/
- Ceph man page: rbd-replay - https://docs.ceph.com/en/quincy/man/8/rbd-replay/
- Ceph source code: rbd-replay.cc - https://github.com/ceph/ceph/blob/main/src/rbd_replay/rbd-replay.cc
- Ceph source code: rbd-replay-prep.cc - https://github.com/ceph/ceph/blob/main/src/rbd_replay/rbd-replay-prep.cc
- Ceph source code: rbd_replay CMakeLists.txt - https://github.com/ceph/ceph/blob/main/src/rbd_replay/CMakeLists.txt
- Ceph doc source: rbd-replay.rst - https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-replay.rst
- blkparse man page - https://man7.org/linux/man-pages/man1/blkparse.1.html
- rbd man page (Debian) - https://manpages.debian.org/experimental/ceph-common/rbd.8.en.html

## Issues Found

### 1. Wrong capture tool: blktrace replaced with LTTng
**What was wrong:** The post used `blktrace` and `blkparse` to capture block-level I/O, then fed the binary output to `rbd-replay-prep`. However, `rbd-replay-prep` uses the babeltrace library to read LTTng CTF (Common Trace Format) traces, not blktrace binary output. The entire capture workflow was fundamentally incorrect.
**What was changed:** Replaced the blktrace/blkparse capture workflow with the correct LTTng workflow (`lttng create`, `lttng enable-event -u 'librbd:*'`, `lttng add-context -u -t pthread_id`, `lttng start/stop`). Updated prerequisites to install LTTng and babeltrace instead of blktrace.
**Why:** rbd-replay-prep's source code (`rbd-replay-prep.cc`) includes `<babeltrace/babeltrace.h>` and reads CTF traces — it cannot parse blktrace binary format.

### 2. Fabricated `--map-whole-image` flag removed
**What was wrong:** The post referenced a `--map-whole-image` flag for rbd-replay described as "Map all I/O to the target image regardless of original offsets." This flag does not exist anywhere in the Ceph source code.
**What was changed:** Removed `--map-whole-image` and replaced with the actual flags: `--pool`, `--map-image`, and `--read-only`.
**Why:** The actual rbd-replay options (from source code) are: `--pool`, `--latency-multiplier`, `--read-only`, `--map-image`, `--dump-perf-counters`, and `-c/--conf`.

### 3. Wrong rbd-replay invocation syntax
**What was wrong:** The post invoked rbd-replay with a block device path as target: `rbd-replay ... /tmp/rbd-replay-workload /dev/rbd1`. rbd-replay takes only ONE positional argument (the replay file) and connects to Ceph directly via librados/librbd — it does not use kernel-mapped block devices.
**What was changed:** Corrected all rbd-replay invocations to use `--pool replicapool --map-image "myimage=replay-target" /tmp/rbd-replay-workload` syntax.
**Why:** rbd-replay's source code only reads `args[0]` as the replay file and uses librados for cluster access.

### 4. Incorrect intro description
**What was wrong:** The intro mentioned "`rbd-nbd` with `--capture`" as a capture method. This flag/feature does not exist.
**What was changed:** Replaced with accurate description of the LTTng + rbd-replay-prep + rbd-replay workflow.
**Why:** The actual capture mechanism is LTTng userspace tracing of librbd.

### 5. Removed unnecessary `rbd map` for replay target
**What was wrong:** Step 4 mapped the replay target image with `rbd map replicapool/replay-target`, but since rbd-replay connects via librados (not through a kernel block device), mapping is unnecessary.
**What was changed:** Removed the `rbd map` command from Step 4.
**Why:** rbd-replay does not use kernel-mapped block devices.

### 6. Updated monitoring approach in Step 6
**What was wrong:** Step 6 used `iostat -x /dev/rbd1 1` to monitor a kernel-mapped block device during replay. Since rbd-replay uses librados directly, there is no kernel block device to monitor.
**What was changed:** Replaced with `--dump-perf-counters` flag and `ceph osd perf` for monitoring.
**Why:** rbd-replay operates at the librados level, not through the kernel RBD driver.

## Review Notes
- The rbd-replay tools are still present in the Ceph source tree and have not been formally deprecated, but they are a niche feature that has received minimal development attention in recent years.
- `rbd-replay-prep` is conditionally built only when babeltrace is available (`HAVE_BABELTRACE`), so it may not be present in all Ceph installations.
- The `rbd map` and `rbd create --size 10G` commands in the post were correct and did not need changes.
- The `--latency-multiplier` flag description was accurate (1 = original speed, 0 = as fast as possible).

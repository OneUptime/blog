# Validation Summary: How to Contribute to Ceph Open Source Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Git / GitHub (version control and contribution workflow)
- CMake (build system)
- vstart.sh (Ceph development cluster tool)
- ctest (test runner)
- Rook (Kubernetes Ceph operator, mentioned for issue tracking)

## Sources Consulted
- Ceph official README and developer documentation (https://docs.ceph.com/en/reef/dev/developer_guide/basic-workflow/)
- Ceph quick development guide (doc/dev/quick_guide.rst in the Ceph repo)
- Ceph SubmittingPatches.rst (https://github.com/ceph/ceph/blob/main/SubmittingPatches.rst)
- Ceph .gitmodules file (confirms ~28 submodules requiring initialization)
- Ceph vstart.sh source code (flag verification)
- Ceph do_cmake.sh source code (build process verification)

## Issues Found
1. **Missing git submodule initialization step (High severity)**: The build instructions went directly from `cd ceph` to `./install-deps.sh`, skipping `git submodule update --init --recursive`. Ceph has approximately 28 git submodules (RocksDB, googletest, seastar, fmt, SPDK, zstd, Arrow, etc.) and the cmake configuration will fail without them. Added the submodule init command after `cd ceph`.

2. **Incorrect "+2 review system" terminology (Medium severity)**: The post stated "Ceph uses a +2 review system via GitHub. Your PR needs two approvals before merging." The "+2" scoring system is Gerrit-specific terminology (reviewers score -2 to +2). Ceph uses GitHub PRs, which have binary Approve/Request Changes states. The official Ceph docs state that a project lead merges your PR after review, without specifying a fixed approval count. Corrected to "Ceph uses GitHub pull requests for code review. After review and testing, a project lead merges your PR."

## Review Notes
- The post uses raw `cmake` commands instead of the project-recommended `do_cmake.sh` wrapper, which auto-configures Ninja, ccache, Python detection, and platform-specific flags. The raw cmake approach is technically valid but produces slower Make-based builds. Not changed since it still works correctly.
- The `-x` flag on `vstart.sh` enables CephX authentication, but this is already on by default — the flag is redundant (harmless). The official quick guide recommends `-d -n` (with `-d` for debug logging). Not changed since `-x` causes no harm.
- The Ceph Tracker URL (tracker.ceph.com) with query_id=28 references the Redmine-based tracker. Ceph has increasingly moved issue tracking to GitHub, so this URL may become less relevant over time.
- The `export CEPH_CONF=./ceph.conf` step is generally unnecessary since vstart.sh sets this up, but including it explicitly is not incorrect and can help in edge cases.

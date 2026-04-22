# How to Contribute to Ceph Open Source Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Open Source, Contribution, Development

Description: Start contributing to the Ceph open source project by setting up a dev environment, finding good first issues, running tests, and submitting patches via GitHub.

---

Contributing to Ceph benefits both the project and your own expertise. This guide covers the practical steps to make your first contribution, from environment setup to getting a pull request merged.

## Setting Up a Development Environment

Start by building Ceph from source:

```bash
# Clone the repository
git clone https://github.com/ceph/ceph.git
cd ceph

# Initialize submodules (required - Ceph has many vendored dependencies)
git submodule update --init --recursive

# Install build dependencies
./install-deps.sh

# Configure and build (debug build for development)
cmake -DCMAKE_BUILD_TYPE=Debug -B build
cmake --build build -j$(nproc)
```

For a faster iteration cycle, use `vstart.sh` to run a single-node cluster:

```bash
cd build
../src/vstart.sh -n -x
export CEPH_CONF=./ceph.conf
./bin/ceph status
```

## Finding Issues to Work On

Start with issues labeled "good first issue" or "low-hanging-fruit":

- https://tracker.ceph.com/issues?query_id=28 (Ceph Tracker)
- https://github.com/rook/rook/issues?q=is:open+label:%22good+first+issue%22 (Rook)

Pick something small: a documentation fix, a failing test, or a clear bug report with reproduction steps.

## Understanding the Code Structure

```bash
# Key directories
src/mon/       # Monitor code
src/osd/       # OSD code
src/rgw/       # Object Gateway (S3/Swift)
src/mds/       # Metadata Server (CephFS)
src/client/    # Client library
src/common/    # Shared utilities
```

## Running Tests

Before submitting a patch, run the relevant unit tests:

```bash
# Run a specific test
cd build
./unittest_osd_types

# Run the full test suite (slow)
ctest -j4 --output-on-failure
```

## Submitting a Patch

Ceph uses GitHub pull requests:

```bash
# Fork https://github.com/ceph/ceph on GitHub
git checkout -b fix/my-bug-description
# Make changes
git commit -s -m "osd: fix crash when BlueStore encounters corrupt WAL"
git push origin fix/my-bug-description
# Open PR at https://github.com/ceph/ceph/pulls
```

The `-s` flag adds a `Signed-off-by` line required by Ceph's developer certificate of origin.

## Code Review Process

Ceph uses GitHub pull requests for code review. After review and testing, a project lead merges your PR. The review process typically takes 1-2 weeks for small changes.

Respond to all review comments promptly and push fixup commits rather than amending the original commit during review.

## Summary

Contributing to Ceph starts with a dev environment using `vstart.sh`, finding a suitable first issue, and following the GitHub pull request workflow with a signed-off commit. The review process is thorough but the maintainers are generally helpful to new contributors who have done the groundwork of testing and providing good commit messages.

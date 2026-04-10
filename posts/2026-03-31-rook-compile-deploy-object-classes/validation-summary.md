# Validation Summary: How to Compile and Deploy Object Classes in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS object class plugins)
- C++ shared library compilation (g++, cmake, make)
- systemd service management (ceph-osd units)
- librados Python API
- Bash scripting (deployment automation)

## Sources Consulted
- Ceph RADOS Object Class SDK documentation: https://docs.ceph.com/en/latest/rados/api/objclass-sdk/
- Ceph `rados` CLI man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph source code (`src/tools/rados/rados.cc`) to verify available rados subcommands
- Ceph packaging information for Debian/Ubuntu and RHEL/CentOS

## Issues Found

### 1. Invalid `rados cls-call` subcommand (line 139)
**What was wrong:** The post used `rados -p mypool cls-call test-obj myclass count_words` to verify the object class deployment. The `cls-call` subcommand does not exist in the `rados` CLI tool. Neither does `call` or `exec`. The rados CLI has no subcommand for invoking object class methods.

**What was changed:** Replaced the `rados cls-call` command with a Python script using the librados Python API (`ioctx.execute()`), which is the correct way to invoke object class methods programmatically. Added a comment explaining that the rados CLI does not support direct class method invocation.

**Why:** Object class methods can only be invoked via the librados API (C: `rados_exec()`, C++: `IoCtx::exec()`, Python: `ioctx.execute()`). There is no CLI shortcut.

### 2. Incorrect Debian/Ubuntu package name `ceph-dev` (line 17)
**What was wrong:** The post listed `ceph-dev` as a Debian/Ubuntu package to install. This package does not exist in standard Ceph repositories.

**What was changed:** Changed `ceph-dev` to `rados-objclass-dev`, which is the package providing the object class development headers (`objclass/objclass.h`).

**Why:** The `ceph-dev` meta-package does not exist. The object class headers are provided by `rados-objclass-dev` on Debian/Ubuntu.

### 3. Incorrect RHEL/CentOS package name `ceph-devel` (line 18)
**What was wrong:** The post listed `ceph-devel` as a RHEL/CentOS package. This is not a standard package name.

**What was changed:** Changed `ceph-devel` to `rados-objclass-devel`.

**Why:** The RHEL/CentOS equivalent for object class development headers is `rados-objclass-devel`, not the non-existent `ceph-devel`.

## Review Notes
- The RADOS object class plugin path `/usr/lib/rados-classes/` is correct for Debian/Ubuntu but on RHEL/CentOS 64-bit systems the path is typically `/usr/lib64/rados-classes/`. The post could note this difference but it's not incorrect as written.
- The `ceph osd pool ls` command (line 127) is described as triggering OSD activity, but it actually queries the monitor daemon. It's not harmful but is misleading as a verification step. The subsequent `grep` on OSD logs is the actual verification.
- The `systemctl restart ceph-osd@\*` glob pattern works with systemd but `systemctl restart ceph-osd.target` would be the more idiomatic systemd approach.
- The object class development headers may not be available as prebuilt packages in all Ceph releases. For some versions, building against the Ceph source tree is required. The Ceph config option `osd_class_dir` can override the plugin search path.

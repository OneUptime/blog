# Validation Summary: How to Install Ceph on Oracle Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Ceph (Squid release / 19.x)
- Oracle Linux 9
- Unbreakable Enterprise Kernel (UEK R7 / R8)
- cephadm (Ceph deployment tool)
- RBD (RADOS Block Device)
- firewalld, SELinux
- chrony (NTP)
- fio (benchmark tool)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/install/
- Ceph RPM repository structure: https://download.ceph.com/
- Ceph RBD CLI man page (`rbd` subcommands: `info`, `feature enable`, `feature disable`)
- Oracle Linux UEK documentation (UEK R7 based on 5.15.x, UEK R8 based on 6.8.x)
- RHEL 9 / Oracle Linux 9 App Streams package availability
- CentOS SIG Storage repository packaging for EL9
- cephadm bootstrap documentation: https://docs.ceph.com/en/latest/cephadm/install/

## Issues Found

### 1. Oracle Linux App Streams do not provide Ceph packages (Step 1)
**What was wrong:** The post claimed Oracle Linux provides Ceph packages via App Streams and showed `dnf module enable ceph:reef -y`. Oracle Linux 9 (like RHEL 9) does not include Ceph module streams in its App Streams. This command would fail.
**What was changed:** Removed the non-functional App Streams approach and its commands. Replaced the introductory text with a note that Oracle Linux 9 does not ship Ceph in App Streams, directing users to the official Ceph repository (which was already shown as the "alternative").
**Why:** The `ceph:reef` module stream does not exist in Oracle Linux 9 or RHEL 9 repositories. Ceph module streams were available in CentOS Stream 8 but were dropped in the EL9 generation.

### 2. Version inconsistency between Reef and Squid (Step 1)
**What was wrong:** The first installation option used `ceph:reef` (Ceph 18.x) while the alternative used the `rpm-squid` repository (Ceph 19.x). These are different major Ceph releases.
**What was changed:** By removing the broken App Streams section, the inconsistency was resolved. The guide now consistently uses the Ceph Squid repository.
**Why:** Mixing package sources from different Ceph major releases would cause version conflicts and deployment failures.

### 3. `rbd feature list` is not a valid command (Step 6)
**What was wrong:** The command `rbd feature list` does not exist in the Ceph RBD CLI. The `rbd feature` subcommands are limited to `enable` and `disable`.
**What was changed:** Replaced `rbd feature list` with `modinfo rbd`, which displays kernel module information including version and parameters for the RBD module.
**Why:** Running `rbd feature list` would produce a "command not found" error. `modinfo rbd` is the correct way to inspect the kernel RBD module.

### 4. UEK kernel version comment was incomplete (Step 2)
**What was wrong:** The post stated the kernel version should show `5.15.x-xxx.x.x.el9uek.x86_64`, which is only correct for UEK R7. Oracle has since released UEK R8 for OL9, which is based on kernel 6.8.x.
**What was changed:** Updated the comment to show example versions for both UEK R7 (5.15.x) and UEK R8 (6.8.x).
**Why:** Users installing `kernel-uek` on a current OL9 system may receive UEK R8, and would be confused by a version check that doesn't match.

### 5. Summary referenced App Streams
**What was wrong:** The summary paragraph mentioned "Oracle Linux App Streams" as an installation method, which was removed from the guide.
**What was changed:** Removed the App Streams reference from the summary.
**Why:** Consistency with the corrected Step 1.

## Review Notes
- The claim that UEK provides "optimized RBD and CephFS kernel client implementations" is somewhat overstated. UEK includes the standard kernel RBD/CephFS modules and benefits from general storage subsystem tuning, but Oracle does not specifically market UEK as having custom-optimized Ceph clients. This is a soft marketing claim rather than a technical error.
- The benchmark section (Step 6) does not clean up after itself. Users should be advised to run `rbd unmap /dev/rbd/benchpool/bench`, `rbd rm benchpool/bench`, and `ceph osd pool delete benchpool` afterward. Not a correctness issue, but a usability note.
- The `ceph osd pool create benchpool 32` command hardcodes 32 PGs. For production, PG auto-scaling is preferred, but for a quick benchmark this is acceptable.
- All other commands (firewall-cmd, SELinux, cephadm bootstrap, ceph orch, ssh-copy-id, fio) are syntactically correct and use valid flags and options.

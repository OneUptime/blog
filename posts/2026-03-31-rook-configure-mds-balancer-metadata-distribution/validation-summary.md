# Validation Summary: How to Configure MDS Balancer for Even Metadata Distribution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (kubectl commands)
- MDS balancer and subtree partitioning

## Sources Consulted
- Ceph MDS Config Reference: https://docs.ceph.com/en/reef/cephfs/mds-config-ref/
- Ceph MDBalancer.cc source: https://github.com/ceph/ceph/blob/main/src/mds/MDBalancer.cc
- Ceph mds.yaml.in config definitions: https://github.com/ceph/ceph/blob/main/src/common/options/mds.yaml.in
- Ceph directory fragmentation docs: https://docs.ceph.com/en/quincy/cephfs/dirfrags/
- Ceph multiple active MDS docs: https://docs.ceph.com/en/latest/cephfs/multimds/
- Ceph MDSRank.cc perf counters: https://github.com/ceph/ceph/blob/main/src/mds/MDSRank.cc
- Ceph MDSDaemon.cc admin socket commands: https://github.com/ceph/ceph/blob/main/src/mds/MDSDaemon.cc

## Issues Found

1. **mds_bal_mode descriptions were completely wrong.** The post described mode 0 as "no balancing," mode 1 as "greedy," and mode 2 as "fast (default)." In reality, all three modes are different load calculation strategies: mode 0 (the actual default) is a hybrid combining auth metadata load, request rate, and queue length; mode 1 uses request rate and latency; mode 2 uses CPU load. Fixed the descriptions and changed the example command to set mode 0 instead of 2.

2. **mds_bal_fragment_interval was misrepresented.** The post described it as a "migration interval (how often to trigger migrations)." It is actually the delay in seconds before the MDS interrupts client I/O to perform directory fragment splits. Fixed the comment to accurately describe its purpose.

3. **mds_bal_min_rebalance default was wrong.** The post claimed the default is 0.5. The actual default is 0.1. Fixed the comment.

4. **mds_bal_max_until was completely misrepresented.** The post described it as "maximum load before urgent migration" with a suggested value of 5. It is actually a developer/testing-only option that limits how long (in uptime seconds) the balancer runs (default -1, meaning no limit). Setting it to 5 would stop all balancing after 5 seconds of MDS uptime. Removed this option and replaced with `mds_bal_need_min`, which is the actual minimum load threshold before balancing activates.

5. **mds_bal_target_decay was completely misrepresented.** The post described it as "target load balance tolerance (0 = perfect balance)" with a suggested value of 0.1. It is actually a decay rate for export target tracking (default 10.0), controlling how quickly export target scores decay over time. Removed this option from the post.

6. **Perf dump section name was wrong.** The post used `mds_balancer` as the perf counter section name, but no such section exists in Ceph. Balancer-related counters (subtrees, exported, imported) are registered under the `mds` section in MDSRank.cc. Fixed the perf dump command to filter the `mds` section for balancer-related keys.

## Review Notes
- The `ceph daemon mds.myfs.a get subtrees` command is valid but requires access to the MDS admin socket. In a Rook/Kubernetes environment, this command must be run from within the MDS pod, not the toolbox pod. The post doesn't note this distinction, but it's a minor usability concern rather than a technical error.
- The general concepts about MDS balancing (heat-based load, subtree migration, directory pinning) are accurate.
- The `ceph.dir.pin` extended attribute usage is correct.

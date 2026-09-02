# Validation Summary: How to Prevent Split-Brain and Stale Writes During Failover and Failback

## Status
validated

## Post Type
Technical guide / distributed-systems architecture and operations guide

## Technologies Covered
- Distributed consensus, quorum, leader election, and failure-domain placement
- Fencing tokens, monotonic writer epochs, idempotency, and stale-write rejection
- Disaster-recovery failover, failback, resynchronization, and reconciliation
- etcd v3.7 locks, leases, revisions, quorum, and disaster recovery
- Kubernetes Lease-based leader election
- Red Hat Enterprise Linux 8 High Availability Add-On, Pacemaker, fencing, and quorum
- AWS Application Recovery Controller routing-control safety rules

## Sources Consulted
- etcd v3.7, "Notes on the usage of lock and lease": https://etcd.io/docs/v3.7/learning/why/#notes-on-the-usage-of-lock-and-lease
- etcd v3.7 concurrency API, Lock service: https://etcd.io/docs/v3.7/dev-guide/api_concurrency_reference_v3/#service-lock
- etcd v3.7 disaster recovery and quorum loss: https://etcd.io/docs/v3.7/op-guide/recovery/
- etcd v3.7 FAQ, failure tolerance: https://etcd.io/docs/v3.7/faq/#what-is-failure-tolerance
- etcd v3.7 data model and monotonic revisions: https://etcd.io/docs/v3.7/learning/data_model/#logical-view
- etcd v3.7 API guarantees: https://etcd.io/docs/v3.7/learning/api_guarantees/
- Google Research, "The Chubby lock service for loosely-coupled distributed systems": https://research.google.com/archive/chubby-osdi06.pdf
- Kubernetes documentation, Leases: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes client-go v0.37.0 leader-election implementation: https://github.com/kubernetes/client-go/blob/v0.37.0/tools/leaderelection/leaderelection.go
- Red Hat Enterprise Linux 8, Pacemaker fencing and quorum: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_getting-started-with-pacemaker-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 8, quorum devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_configuring-quorum-devices-configuring-and-managing-high-availability-clusters
- AWS Application Recovery Controller, routing-control safety rules: https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.safety-rules.html
- AWS Application Recovery Controller, routing-control behavior: https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.about.html

## Issues Found
1. **The protected resource's active epoch could move backward.** The post required allocation from a monotonic authority and atomic mutation checks, but it did not require activation at storage itself to be monotonic. A delayed activation for epoch 42 could therefore overwrite an already active epoch 43 and reauthorize stale epoch-42 writes. The invariant, example, promotion workflow, partition tests, and acceptance criteria now require the durable active epoch to advance conditionally, never decrease, reject delayed or reordered activation requests, survive restore without regression, and permanently reject every superseded epoch.
2. **The promotion sequence left its pre-promotion fence ambiguous.** The workflow requires fencing and verification in steps 3 and 4, but it does not activate the recovery resource's new epoch until step 8. Treating that later epoch activation as the earlier fence would allow old writes while the recovery position is selected and the recovery service is promoted. The post now states that steps 3 and 4 must already fence every old durable commit path and that step 8 is an additional recovery-resource fence, not a substitute for the prerequisite.

## Review Notes
- The illustrative YAML is syntactically valid. The post contains no executable shell commands or language-specific API examples.
- etcd v3.7 is the current stable documentation line as of validation; v3.8 is still marked draft.
- etcd revisions increase over the lifetime of a logical cluster. Snapshot restore can expose a lower revision unless recovery uses an appropriate revision bump, so a design that derives writer epochs from revisions must explicitly preserve the no-reuse and no-regression invariant across recovery.
- Kubernetes Lease leader election is coordination, not fencing; the official client-go implementation explicitly documents that it cannot guarantee only one acting leader.
- Red Hat documents product-specific two-node and quorum-device behavior. The post appropriately tells readers to follow the selected product's documented topology and tie-breaker semantics rather than assuming a universal rule.
- AWS Application Recovery Controller safety rules guard routing-control state changes; they do not fence storage or terminate existing connections. This is consistent with the post's warning that DNS, health checks, and routing controls cannot enforce the writer invariant on their own.

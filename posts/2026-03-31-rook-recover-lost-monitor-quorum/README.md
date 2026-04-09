# How to Recover from Lost Monitor Quorum in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Recovery, Disaster Recovery

Description: Step-by-step guide to recovering a Ceph cluster from lost monitor quorum using Rook, including emergency single-monitor recovery procedures.

---

## What Is Monitor Quorum Loss?

Ceph monitors use the Paxos consensus algorithm. A cluster with 3 monitors needs 2 to form quorum. If more than half of monitors fail simultaneously (e.g., 2 of 3 fail), the cluster loses quorum. In this state, clients cannot read or write data, and the cluster is effectively frozen. Recovering quorum is a critical emergency procedure.

## Diagnosing Quorum Loss

MON pods will be in `CrashLoopBackOff` or failing. Check:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
kubectl -n rook-ceph logs rook-ceph-mon-a-<suffix> | tail -50
```

Attempt to connect to a surviving monitor:

```bash
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<suffix> -- \
  ceph -s --connect-timeout 10
```

If the command hangs or returns connection errors, quorum is lost.

## Recovery with Remaining Monitor

If one monitor is still running, you can rebuild quorum by injecting a new monmap that contains only the surviving monitor. First, scale down the Rook operator to prevent it from interfering with the recovery:

```bash
# Scale down the Rook operator
kubectl -n rook-ceph scale deploy rook-ceph-operator --replicas=0

# Scale down all MON deployments
kubectl -n rook-ceph scale deploy rook-ceph-mon-a --replicas=0
kubectl -n rook-ceph scale deploy rook-ceph-mon-b --replicas=0
kubectl -n rook-ceph scale deploy rook-ceph-mon-c --replicas=0
```

The `ceph-mon --extract-monmap` and `--inject-monmap` commands require exclusive access to the monitor store, so the ceph-mon daemon must not be running. Patch the surviving monitor's deployment to run a sleep command instead:

```bash
kubectl -n rook-ceph patch deploy rook-ceph-mon-a --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/command", "value": ["sleep", "infinity"]}]'
kubectl -n rook-ceph scale deploy rook-ceph-mon-a --replicas=1
```

Wait for the pod to be running, then extract and modify the monmap:

```bash
# Extract the current monmap from the surviving monitor's data directory
kubectl -n rook-ceph exec -it deploy/rook-ceph-mon-a -- \
  ceph-mon --extract-monmap /tmp/monmap --mon-data /var/lib/ceph/mon/ceph-a

# Print the monmap
kubectl -n rook-ceph exec -it deploy/rook-ceph-mon-a -- \
  monmaptool --print /tmp/monmap
```

Remove failed monitors from the monmap:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-mon-a -- \
  monmaptool /tmp/monmap --rm b

kubectl -n rook-ceph exec -it deploy/rook-ceph-mon-a -- \
  monmaptool /tmp/monmap --rm c
```

Inject the modified monmap:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-mon-a -- \
  ceph-mon --inject-monmap /tmp/monmap --mon-data /var/lib/ceph/mon/ceph-a
```

Remove the patch to restore the original monitor command, then restart:

```bash
kubectl -n rook-ceph scale deploy rook-ceph-mon-a --replicas=0
kubectl -n rook-ceph rollout undo deploy rook-ceph-mon-a
kubectl -n rook-ceph scale deploy rook-ceph-mon-a --replicas=1
```

## Letting Rook Rebuild Monitors

After establishing single-monitor quorum, scale the Rook operator back up so it can manage the cluster again:

```bash
kubectl -n rook-ceph scale deploy rook-ceph-operator --replicas=1
```

Confirm the `CephCluster` spec has `mon.count: 3`:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Ensure `mon.count: 3` is set. Rook will detect that only 1 monitor is running and create 2 more automatically.

## Verifying Recovery

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status
```

The `quorum` array should list all 3 monitors.

## Summary

Recovering from lost monitor quorum requires injecting a modified monmap that contains only surviving monitors, then restarting the cluster from a single-monitor state. Rook handles rebuilding the remaining monitors once quorum is re-established. This procedure should be tested in staging environments before a production emergency occurs.

# How to Recover a Failed Rook-Ceph Monitor (MON)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Monitor, MON, Recovery, Troubleshooting

Description: Recover a failed Ceph MON in Rook-Ceph by diagnosing quorum loss, replacing failed MON pods, and restoring cluster health step by step.

---

## How MON Failures Affect the Ceph Cluster

Ceph MONs (Monitors) maintain the cluster map and require a quorum (majority) to operate. With 3 MONs, the cluster tolerates 1 failure. With 5 MONs, it tolerates 2. If quorum is lost, all Ceph operations stop - no reads, writes, or new PVC provisioning until quorum is restored.

```mermaid
flowchart TD
    A["MON Pod Fails"] --> B{"Quorum maintained?"}
    B -->|"Yes - minority failure"| C["Cluster continues, Rook replaces MON"]
    B -->|"No - majority failure"| D["Cluster pauses all operations"]
    C --> E["New MON pod starts, syncs from peers"]
    D --> F["Manual recovery required"]
    F --> G["Restore MON from backup or inject monmap"]
    G --> H["Quorum restored"]
```

## Step 1 - Identify the Problem

Check the MON pod status:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

Describe a failing MON pod for events:

```bash
kubectl -n rook-ceph describe pod rook-ceph-mon-a-<hash>
```

Check MON pod logs:

```bash
kubectl -n rook-ceph logs rook-ceph-mon-a-<hash> --previous
```

Try to run a Ceph command. If MONs are in quorum, it will succeed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

If you see `connection refused` or the command hangs, quorum may be lost.

## Step 2 - Check Current Quorum Status

If at least one MON is reachable, check quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

View the current quorum members:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status | python3 -m json.tool
```

Identify which MON is missing from the quorum.

## Step 3 - Recover a Single Failed MON (Quorum Intact)

If quorum is still maintained (2 of 3 MONs up), Rook should automatically replace the failed MON. Check the operator logs:

```bash
kubectl -n rook-ceph logs deployment/rook-ceph-operator --tail=50 | grep -i mon
```

If Rook is not replacing the MON automatically, force it by deleting the failed MON pod:

```bash
kubectl -n rook-ceph delete pod rook-ceph-mon-a-<hash>
```

Rook will create a new MON pod. If the MON is stuck because its PVC is on an unavailable node, force-delete the pod:

```bash
kubectl -n rook-ceph delete pod rook-ceph-mon-a-<hash> --force --grace-period=0
```

Then delete the MON's PVC to force reprovisioning on another node:

```bash
kubectl -n rook-ceph delete pvc rook-ceph-mon-a
```

Rook will provision a new MON on an available node and sync it from the other MONs.

## Step 4 - Recover from Quorum Loss (Majority of MONs Unavailable)

If you have lost quorum, follow these steps carefully. This is a data-affecting procedure.

First, identify one healthy MON that has the most up-to-date data. If all MON pods are down, pick the MON whose data directory was most recently written to:

```bash
# On the node where MON data is stored
ls -la /var/lib/rook/mon-a/data/
```

Scale the Rook operator to 0 to prevent interference:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=0
```

Scale down the failed MON deployments to ensure they do not restart:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-mon-b --replicas=0
kubectl -n rook-ceph scale deployment rook-ceph-mon-c --replicas=0
```

The `ceph-mon --extract-monmap` and `--inject-monmap` commands require the MON daemon to not be running. Patch the MON-a deployment to prevent the daemon from starting so you can manipulate the monmap on disk:

```bash
kubectl -n rook-ceph patch deployment rook-ceph-mon-a --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/command", "value": ["sleep", "infinity"]}]'
```

Wait for the patched pod to start, then exec into it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-mon-a -- bash
```

Inside the MON container, extract and modify the monmap:

```bash
ceph-mon --extract-monmap /tmp/monmap --mon-data /var/lib/ceph/mon/ceph-a
monmaptool --print /tmp/monmap
monmaptool --rm b /tmp/monmap
monmaptool --rm c /tmp/monmap
monmaptool --print /tmp/monmap
ceph-mon --inject-monmap /tmp/monmap --mon-data /var/lib/ceph/mon/ceph-a
```

Exit the container. Before restarting MON-a, update the `rook-ceph-mon-endpoints` ConfigMap to only reference the surviving MON:

```bash
kubectl -n rook-ceph get configmap rook-ceph-mon-endpoints -o yaml
```

Edit it to keep only MON-a's entry in the `data` field, removing references to MON-b and MON-c:

```bash
kubectl -n rook-ceph edit configmap rook-ceph-mon-endpoints
```

Now remove the sleep override to let the MON daemon start with the modified monmap:

```bash
kubectl -n rook-ceph rollout undo deployment rook-ceph-mon-a
```

After MON-a starts and forms quorum with itself, verify:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Step 5 - Restore Full MON Count

After single-MON quorum is restored, scale the Rook operator back up:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=1
```

Rook will detect that only one MON is present and add new MONs to restore the configured count (usually 3).

Watch the MON recovery:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -w
```

## Step 6 - Verify Full Recovery

Confirm all MONs are in quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

Confirm cluster health is restored:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Check that the Rook operator reports the cluster as ready:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph
```

## Summary

Recovering a failed Rook-Ceph MON depends on whether quorum is intact. With quorum intact, simply delete the failed MON pod or its PVC and let Rook replace it. When quorum is lost, the recovery requires extracting the monmap from a surviving MON, removing the failed MON entries, injecting the modified monmap, and starting a single-MON quorum before restoring the full MON count. Always scale the Rook operator to 0 during manual recovery to prevent conflicting changes.

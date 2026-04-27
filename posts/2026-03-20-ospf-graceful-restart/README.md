# How to Configure OSPF Graceful Restart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Graceful Restart, Non-Stop Forwarding, Cisco IOS, High Availability

Description: Learn how to configure OSPF Graceful Restart to maintain packet forwarding during OSPF process restarts, reducing traffic disruption during software upgrades.

## What Is OSPF Graceful Restart?

OSPF Graceful Restart (RFC 3623) allows a router restarting its OSPF process to signal neighboring routers to continue forwarding traffic using the existing forwarding table while the OSPF process re-establishes adjacencies and rebuilds its routing information base. Without GR, an OSPF restart causes neighbors to immediately flush routes learned from the restarting router.

## Roles in Graceful Restart

- **Restarting Router:** The router whose OSPF process is restarting. It signals GR intent in its Grace LSA.
- **Helper Router:** A neighbor that maintains forwarding for the restarting router during the GR window.

## Step 1: Enable OSPF Graceful Restart

On Cisco IOS, configure graceful restart under the OSPF process:

```text
! Enable GR with default restart interval (120 seconds)
router ospf 1
 graceful-restart

! Set a custom restart interval (time the helper waits for the restarting router)
router ospf 1
 graceful-restart grace-period 60
```

The grace-period should be long enough for the OSPF process to restart and re-synchronize-typically 30–120 seconds depending on the platform.

## Step 2: Configure Graceful Restart on Helper Routers

Neighbors need to act as helpers. By default, Cisco IOS acts as a helper for neighbors that announce GR. You can disable helper mode if needed:

```text
! Disable helper mode (this router will NOT help neighbors restart gracefully)
router ospf 1
 no graceful-restart helper

! Or restrict helper mode - only help if the network hasn't changed during restart
router ospf 1
 graceful-restart helper strict-lsa-checking
```

`strict-lsa-checking` aborts the GR if any LSA change is received during the restart window-this is more conservative but prevents stale routing.

## Step 3: Configure GR on FRRouting

```bash
# In vtysh or frr.conf

router ospf
 graceful-restart grace-period 60
 graceful-restart helper enable
 ! For stricter helper behavior, opt in to strict LSA checking:
 ! graceful-restart helper strict-lsa-checking
```

## Step 4: Verify Graceful Restart Configuration

```text
Router# show ip ospf | include graceful

! Output:
! Graceful restart is enabled
! Graceful restart grace period is 120 seconds
! Restart in progress: NO
! Number of neighbors performing graceful restart: 0
```

## Step 5: Monitor During a Graceful Restart Event

When a GR event occurs, the restarting router floods a Grace LSA (Type-9 Opaque LSA) informing neighbors:

```text
! On a helper router - watch for GR notifications
Helper# show ip ospf neighbor detail

! During GR, the neighbor appears in a special state:
! Neighbor 1.1.1.1 is gracefully restarting
! Restart interval: 120 seconds
! Restart time remaining: 67 seconds
```

The helper continues forwarding traffic to the restarting router during this window.

## Step 6: Limitations and Caveats

- GR is only effective when the **data plane remains up** during the control plane restart
- If the router fully power-cycles, GR provides no benefit (both planes go down)
- The GR helper won't help if the OSPF topology changes during the restart window (with strict-lsa-checking)
- GR is most useful for planned upgrades on platforms with NSF (Non-Stop Forwarding) hardware
- The grace-period typically exceeds the Dead interval-that's the whole point of GR (helpers maintain the adjacency despite missed Hellos). Per RFC 3623, the grace-period should not exceed LSRefreshTime (1800 seconds) to avoid the restarting router's LSAs aging out

## Step 7: Test Graceful Restart (Lab Only)

```text
! Restart OSPF process (simulates an OSPF crash/restart)
! WARNING: This drops and re-establishes all OSPF adjacencies
Router# clear ip ospf process

! In a GR-enabled environment, observe helpers maintaining forwarding
! On the helper:
Helper# show ip ospf database | include Grace
```

## Conclusion

OSPF Graceful Restart enables maintenance activities like software upgrades without traffic disruption by letting neighbors continue forwarding during the restart window. Configure `graceful-restart` with an appropriate `grace-period`, ensure helper routers have GR enabled (the default), and use `strict-lsa-checking` in production to abort GR if the topology changes during restart.

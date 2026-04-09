# How to Create Post-Mortem Reports for Ceph Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Post-Mortem, Incident, Operation

Description: Write blameless Ceph incident post-mortems that document timeline, root cause, impact, and corrective actions to prevent recurrence and improve team knowledge.

---

Post-mortem reports are not about assigning blame - they are about learning. A well-written Ceph incident post-mortem improves cluster reliability and gives your team a shared understanding of what happened and how to prevent it.

## Post-Mortem Structure

A useful Ceph post-mortem has six sections:

1. Incident Summary
2. Timeline
3. Root Cause
4. Impact
5. Corrective Actions
6. Lessons Learned

## Incident Summary

Write a one-paragraph summary that anyone on the team can read in 30 seconds:

```text
On 2026-03-15 at 14:22 UTC, the Ceph cluster entered HEALTH_ERR state due to
OSD 4 crashing after a disk controller firmware update. The cluster was
degraded for 2 hours and 15 minutes. No data was lost. Read and write
throughput were reduced by approximately 40% during the incident.
```

## Timeline

Reconstruct the timeline from logs:

```bash
grep -E "2026-03-15 14:" /var/log/ceph/ceph.log | grep -E "osd|HEALTH|pg" > timeline.txt
journalctl -u "ceph-osd@*" --since "2026-03-15 14:00" --until "2026-03-15 16:30" >> timeline.txt
```

Format as a table:

```text
14:22 UTC - OSD 4 marked down
14:23 UTC - HEALTH_WARN: 1 OSD down
14:27 UTC - PGs begin recovering
14:45 UTC - HEALTH_ERR: recovery not completing
15:05 UTC - Root cause identified: firmware update
16:37 UTC - OSD 4 replaced, cluster returns to HEALTH_OK
```

## Root Cause Analysis

Use the "5 Whys" technique:

```text
Why did the cluster degrade?
  - OSD 4 crashed.
Why did OSD 4 crash?
  - Disk controller firmware 3.2.1 has a bug with BlueStore's write pattern.
Why was this firmware applied?
  - Uncoordinated firmware update without Ceph maintenance window.
Why was there no maintenance window?
  - No change management process for firmware updates.
Why is there no change management process?
  - Process gaps from rapid team growth.
```

## Corrective Actions

List specific, assigned, time-bounded actions:

```text
[DONE]   Rolled back disk controller firmware to 3.1.8 on all nodes.
[TODO]   Create firmware update SOP that requires Ceph maintenance window. (Owner: Alice, Due: 2026-04-15)
[TODO]   Add firmware version to Ceph pre-update checklist. (Owner: Bob, Due: 2026-04-01)
[TODO]   Set up alerting for OSD crash_replay events. (Owner: Alice, Due: 2026-04-08)
```

## Storing Post-Mortems

Keep post-mortems in a shared, searchable location - a wiki, Git repository, or Confluence page. Tag them by component (OSD, RGW, MON) and severity so they are discoverable.

## Summary

Blameless Ceph post-mortems document the full incident timeline, root cause identified through systematic analysis, and specific corrective actions with owners and due dates. Writing them consistently builds institutional knowledge that reduces both incident frequency and resolution time over time.

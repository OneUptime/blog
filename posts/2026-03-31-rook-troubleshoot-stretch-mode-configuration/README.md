# How to Troubleshoot Stretch Mode Configuration Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Mode, Troubleshooting, Debugging

Description: Troubleshoot common Ceph stretch mode configuration issues including quorum failures, CRUSH misconfigurations, and PG imbalance.

---

## Common Stretch Mode Problems

Stretch mode configuration issues typically fall into three categories: quorum failures, CRUSH rule problems, and pool misconfiguration. This guide covers diagnostics for each.

## Diagnosing Quorum Issues

If the cluster cannot form quorum after enabling stretch mode, check monitor locations:

```bash
ceph mon dump
```

Every monitor must have a `crush_location` set. If any are missing:

```bash
ceph mon set-location mon-dc1a datacenter=dc1
ceph mon set-location mon-dc1b datacenter=dc1
ceph mon set-location mon-dc2a datacenter=dc2
ceph mon set-location mon-dc2b datacenter=dc2
ceph mon set-location mon-arbiter datacenter=arbiter
```

Check the tiebreaker monitor is correctly designated:

```bash
ceph mon dump
```

The output will show the stretch mode tiebreaker monitor and its location. Verify the tiebreaker is assigned to a third site (e.g., `datacenter=arbiter`) separate from the two data sites. You can also check quorum membership:

```bash
ceph quorum_status --format json-pretty
```

## Diagnosing CRUSH Rule Problems

If PGs are stuck in `unknown` or `incomplete` state, the CRUSH rule may be misconfigured:

```bash
ceph osd crush rule dump stretch_rule
```

Verify the rule structure. A correct stretch mode rule uses `step chooseleaf` with `host` type (not `datacenter`), and separates placement across datacenters using either multiple `take` steps or a `step choose` with `datacenter` type:

```bash
ceph osd crush rule dump stretch_rule
```

Test the CRUSH rule mapping:

```bash
ceph osd map <pool> <object>
```

If the OSD set returned does not include OSDs from both sites, the rule is wrong. Re-create it by editing the CRUSH map directly, since stretch mode requires a multi-step rule that `create-replicated` cannot produce:

```bash
ceph osd getcrushmap > crush.map.bin
crushtool -d crush.map.bin -o crush.map.txt
```

Edit `crush.map.txt` to add or fix the stretch rule:

```text
rule stretch_rule {
    id 1
    type replicated
    step take site1
    step chooseleaf firstn 2 type host
    step emit
    step take site2
    step chooseleaf firstn 2 type host
    step emit
}
```

Then recompile and apply the CRUSH map:

```bash
crushtool -c crush.map.txt -o crush2.map.bin
ceph osd setcrushmap -i crush2.map.bin
```

## Diagnosing Pool Misconfiguration

Pools must have size=4 and min_size=2 for stretch mode:

```bash
ceph osd pool ls detail | grep -E "size|min_size|crush"
```

Fix any pools with wrong settings:

```bash
for pool in $(ceph osd pool ls); do
  ceph osd pool set $pool size 4
  ceph osd pool set $pool min_size 2
  ceph osd pool set $pool crush_rule stretch_rule
done
```

## PGs Stuck in Incomplete State

If PGs are stuck `incomplete`, the cluster may have lost too many OSDs:

```bash
ceph pg dump stuck inactive
ceph pg repair <pgid>
```

Check which OSDs an affected PG uses:

```bash
ceph pg <pgid> query
```

## Viewing Stretch Mode Flags

Check which stretch flags are set in the OSD map:

```bash
ceph osd dump | grep -E "stretch|flags"
```

Expected output when stretch mode is correctly enabled:

```text
flags stretch_mode_enabled
```

## Disabling Stretch Mode for Debugging

Disabling stretch mode is only available in Ceph Reef 18.2.8 or later, and only works when the cluster is in healthy or degraded stretch mode (not during recovery). This is not recommended in production:

```bash
ceph mon disable_stretch_mode --yes-i-really-mean-it
```

Re-enable with:

```bash
ceph mon enable_stretch_mode mon-arbiter stretch_rule datacenter
```

## Summary

Troubleshooting Ceph stretch mode starts with verifying monitor CRUSH locations and tiebreaker designation, then inspecting CRUSH rules and pool configuration. Most issues stem from missing location labels or pools that were not updated to use the stretch rule. Systematic checks of each layer resolve the majority of stretch mode configuration problems.

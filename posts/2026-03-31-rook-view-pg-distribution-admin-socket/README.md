# How to View PG Distribution via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, PG, Placement Group, Distribution

Description: View placement group (PG) distribution on a specific Ceph OSD via the admin socket to diagnose PG imbalances, verify primary/replica roles, and understand OSD load distribution.

---

## Overview

Placement groups (PGs) are the fundamental units of data distribution in Ceph. Each OSD hosts a subset of PGs, and uneven distribution leads to hotspots. The admin socket provides commands to inspect which PGs are on a specific OSD and their current state.

## Listing PGs on an OSD

```bash
# Show all PGs on OSD 0
ceph daemon osd.0 dump_pgs

# Count PGs on each OSD
for osd in $(ceph osd ls); do
    COUNT=$(ceph daemon osd.$osd dump_pgs 2>/dev/null | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(len(d.get('pg_stats',d if isinstance(d,list) else [])))" 2>/dev/null)
    echo "OSD $osd: $COUNT PGs"
done
```

## Getting PG States on an OSD

```bash
# Dump PGs with state information
ceph daemon osd.0 dump_pgs | python3 -c "
import sys, json
data = json.load(sys.stdin)
pgs = data if isinstance(data, list) else data.get('pg_stats', [])
states = {}
for pg in pgs:
    state = pg.get('state', 'unknown')
    states[state] = states.get(state, 0) + 1
for state, count in sorted(states.items()):
    print(f'{state}: {count}')
"
```

## Checking Primary vs Replica PGs

```bash
# Check how many PGs have OSD 0 as primary
ceph pg dump --format json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
pgs = data.get('pg_stats', [])
count = sum(1 for pg in pgs if pg.get('acting_primary') == 0)
print(f'PGs with OSD 0 as primary: {count}')
"

# More detailed breakdown: primary vs replica for OSD 0
ceph pg dump --format json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
pgs = data.get('pg_stats', [])
primary = 0
replica = 0
for pg in pgs:
    acting = pg.get('acting', [])
    if acting and acting[0] == 0:
        primary += 1
    elif 0 in acting:
        replica += 1
print(f'Primary: {primary}, Replica: {replica}')
"
```

## Identifying Uneven PG Distribution

```bash
# Get PG count per OSD (dynamically find the PGS column from the header)
ceph osd df | awk 'NR==1{for(i=1;i<=NF;i++) if($i=="PGS") c=i} NR>1 && $1~/^[0-9]/ && c{print "OSD "$1": "$c" PGs"}' | head -20

# Check the OSD with most and fewest PGs
ceph osd df | awk 'NR==1{for(i=1;i<=NF;i++) if($i=="PGS") c=i} NR>1 && $1~/^[0-9]/ && c{print $1, $c}' | sort -k2 -n | head -5   # least PGs
ceph osd df | awk 'NR==1{for(i=1;i<=NF;i++) if($i=="PGS") c=i} NR>1 && $1~/^[0-9]/ && c{print $1, $c}' | sort -k2 -rn | head -5  # most PGs
```

## Viewing PG Map Details for an OSD

```bash
# Request the latest OSD map from the monitor
ceph daemon osd.0 get_latest_osdmap

# Dump the current OSD map epoch
ceph daemon osd.0 osd_map_epoch
```

## Rebalancing PG Distribution

If PGs are unevenly distributed, check CRUSH weights:

```bash
# Show CRUSH weight for each OSD
ceph osd tree | grep osd

# Reweight if one OSD is significantly over-represented
ceph osd reweight osd.0 0.95

# Or use automatic reweighting
ceph osd reweight-by-utilization
```

## Monitoring PG State Changes

```bash
# Watch PG state changes on a specific OSD
watch -n 10 'ceph daemon osd.0 dump_pgs | python3 -c "
import sys, json
data = json.load(sys.stdin)
pgs = data if isinstance(data, list) else data.get(\"pg_stats\", [])
active = sum(1 for p in pgs if \"active\" in p.get(\"state\",\"\"))
print(f\"Active PGs: {active}/{len(pgs)}\")
"'
```

## Summary

The admin socket `dump_pgs` command reveals all placement groups hosted on a specific OSD along with their state. Use this to diagnose PG imbalances causing OSD hotspots, verify primary and replica distribution, and confirm PG health during cluster operations. Combine with `ceph osd df` and CRUSH reweighting to address uneven distributions.

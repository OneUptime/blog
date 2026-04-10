# How to Configure CRUSH Buckets for Stretch Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Stretch Mode, Storage

Description: Learn how to configure CRUSH buckets correctly for Ceph stretch mode to ensure proper data placement across two sites.

---

## Why CRUSH Buckets Matter in Stretch Mode

Ceph stretch mode depends on CRUSH (Controlled Replication Under Scalable Hashing) to enforce data placement across two physical sites. Without correct CRUSH bucket configuration, data may not be distributed evenly, defeating the purpose of stretch mode.

## CRUSH Hierarchy for Stretch Mode

The recommended CRUSH hierarchy for stretch mode looks like this:

```text
root default
  datacenter dc1
    host host-dc1a
      osd.0
      osd.1
    host host-dc1b
      osd.2
      osd.3
  datacenter dc2
    host host-dc2a
      osd.4
      osd.5
    host host-dc2b
      osd.6
      osd.7
```

## Creating Datacenter Buckets

Create the datacenter-level CRUSH buckets:

```bash
ceph osd crush add-bucket dc1 datacenter
ceph osd crush add-bucket dc2 datacenter
```

Move the new buckets under the default root:

```bash
ceph osd crush move dc1 root=default
ceph osd crush move dc2 root=default
```

## Moving Hosts into Datacenter Buckets

Assign each host to its datacenter:

```bash
ceph osd crush move host-dc1a datacenter=dc1
ceph osd crush move host-dc1b datacenter=dc1
ceph osd crush move host-dc2a datacenter=dc2
ceph osd crush move host-dc2b datacenter=dc2
```

Verify the placement:

```bash
ceph osd tree
```

Expected output:

```text
ID  CLASS  WEIGHT   TYPE NAME       STATUS
-1         16.00000 root default
-3          8.00000     datacenter dc1
-4          4.00000         host host-dc1a
 0   ssd    2.00000             osd.0   up
 1   ssd    2.00000             osd.1   up
-5          4.00000         host host-dc1b
 2   ssd    2.00000             osd.2   up
 3   ssd    2.00000             osd.3   up
```

## Creating a Stretch CRUSH Rule

The CRUSH rule for stretch mode must use `datacenter` as the failure domain:

```bash
ceph osd crush rule create-replicated stretch_rule default datacenter
```

Verify the rule was created:

```bash
ceph osd crush rule ls
ceph osd crush rule dump stretch_rule
```

## Compiling and Applying a Custom CRUSH Map

For advanced configurations, export, edit, and reimport the CRUSH map:

```bash
ceph osd getcrushmap -o crushmap.bin
crushtool -d crushmap.bin -o crushmap.txt
```

Edit `crushmap.txt` to add or adjust buckets, then recompile:

```bash
crushtool -c crushmap.txt -o crushmap-new.bin
ceph osd setcrushmap -i crushmap-new.bin
```

## Verifying CRUSH Rule Placement

Test that the CRUSH rule places PGs on both sites:

```bash
crushtool -i crushmap.bin --test --show-mappings \
  --rule 2 --num-rep 4 --min-x 0 --max-x 99
```

Check that OSD IDs from both sites appear in the mappings.

## Summary

Correct CRUSH bucket configuration is the foundation of Ceph stretch mode. Datacenter-level buckets must be created, hosts moved into them, and a CRUSH rule created with datacenter as the failure domain. Verifying the tree and testing CRUSH mappings before enabling stretch mode prevents data placement issues that are difficult to correct once the cluster is in production.

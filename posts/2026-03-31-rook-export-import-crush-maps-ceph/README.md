# How to Export and Import CRUSH Maps in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Kubernetes, Operation

Description: Learn how to export, edit, and import CRUSH maps in Ceph to customize data placement, add device classes, or fix topology misconfigurations.

---

## Why Export and Import CRUSH Maps

The CRUSH map defines how Ceph distributes data across OSDs, hosts, racks, and data centers. While many CRUSH operations can be done directly via CLI commands, some changes - like restructuring the bucket hierarchy, renaming existing buckets, or correcting deeply nested topology - require exporting the map, editing it as a text file, and importing it back.

This technique is also useful for auditing the full map, creating backups before major changes, or migrating a cluster layout to a new hardware architecture.

## Exporting the Binary CRUSH Map

Ceph stores the CRUSH map in a compiled binary format. Export it from the running cluster:

```bash
ceph osd getcrushmap -o /tmp/crushmap.bin
```

This writes the binary map to `/tmp/crushmap.bin`. Always take a backup before making any edits.

## Decompiling to Text Format

Convert the binary map to human-readable text using `crushtool`:

```bash
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
```

Open the text file with any editor. It contains four main sections:
- `# begin crush map` - tunables
- `# devices` - OSD list
- `# buckets` - bucket hierarchy
- `# rules` - placement rules

## Understanding the Text Format

A typical bucket definition looks like:

```text
host node1 {
        id -2
        id -3 class hdd
        alg straw2
        hash 0
        item osd.0 weight 1.000
        item osd.1 weight 1.000
}

root default {
        id -1
        alg straw2
        hash 0
        item node1 weight 2.000
}
```

Each bucket has a negative ID for internal reference, while OSDs have non-negative IDs. Weights represent relative capacity.

## Editing the CRUSH Map

Common edits include renaming a host bucket, adding a rack layer, or adjusting weights:

```text
rack rack1 {
        id -10
        alg straw2
        hash 0
        item node1 weight 2.000
        item node2 weight 2.000
}

root default {
        id -1
        alg straw2
        hash 0
        item rack1 weight 4.000
}
```

In this example a new `rack` bucket was inserted between hosts and the root, adding a rack failure domain.

## Recompiling and Importing

After editing, recompile the text map back to binary:

```bash
crushtool -c /tmp/crushmap.txt -o /tmp/crushmap-new.bin
```

Verify the compiled map before importing:

```bash
crushtool -i /tmp/crushmap-new.bin --test --show-statistics \
  --rule 0 --num-rep 3 --min-x 0 --max-x 100
```

This tests the placement rule with a simulation. If the output looks correct, import it:

```bash
ceph osd setcrushmap -i /tmp/crushmap-new.bin
```

## Verifying the Change

After import, verify the new map is active:

```bash
ceph osd crush tree
ceph osd crush dump
```

Monitor the cluster for any unexpected remapping:

```bash
ceph -s
watch ceph pg stat
```

## Rolling Back

If the import causes problems, you can restore from your backup:

```bash
ceph osd setcrushmap -i /tmp/crushmap.bin
```

Always keep the original binary map until you have confirmed the new map is working correctly in production.

## Summary

Exporting and importing CRUSH maps gives you full control over Ceph's data placement topology. Export the binary map with `ceph osd getcrushmap`, decompile it with `crushtool -d`, make your edits, recompile, test, and import with `ceph osd setcrushmap`. Always backup the original map and test with `crushtool --test` before applying changes to a production cluster.

# How to Modify the multipath.conf Configuration File on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, Configuration, Multipath.conf, Linux

Description: Understand and modify the multipath.conf configuration file on RHEL to customize path grouping, failover behavior, and device-specific settings.

---

The `/etc/multipath.conf` file controls how DM-Multipath handles storage paths. It has several sections, each controlling different aspects of multipath behavior. Understanding this file is key to tuning multipath for your specific storage environment.

## Configuration File Sections

The file has five main sections:

1. **defaults**: Global default settings
2. **blacklist**: Devices to exclude from multipath
3. **blacklist_exceptions**: Override blacklist for specific devices
4. **devices**: Per-vendor/product device settings
5. **multipaths**: Per-LUN settings

## The defaults Section

```bash
defaults {
    user_friendly_names yes
    find_multipaths yes
    path_grouping_policy failover
    path_selector "round-robin 0"
    failback immediate
    no_path_retry 5
    polling_interval 5
    path_checker tur
    rr_min_io_rq 1
}
```

### Key Default Parameters

| Parameter | Description | Common Values |
|---|---|---|
| `user_friendly_names` | Use mpathX names | yes, no |
| `find_multipaths` | Only multipath if multiple paths exist | yes, no, smart, greedy |
| `path_grouping_policy` | How to group paths | failover, multibus, group_by_prio, group_by_node_name |
| `path_selector` | Algorithm for choosing paths within a group | "round-robin 0", "queue-length 0", "service-time 0" |
| `failback` | When to return to preferred path | immediate, manual, N (seconds) |
| `no_path_retry` | Behavior when all paths fail | N (count), queue, fail |
| `polling_interval` | Seconds between path checks | 5 (default) |
| `path_checker` | Method to check path health | tur, readsector0, directio |

## The devices Section

Override defaults for specific storage vendors:

```bash
devices {
    device {
        vendor "NETAPP"
        product "LUN.*"
        path_grouping_policy group_by_prio
        prio alua
        path_selector "round-robin 0"
        failback immediate
        no_path_retry queue
        path_checker tur
        detect_prio yes
    }
    device {
        vendor "DGC"
        product ".*"
        path_grouping_policy group_by_prio
        prio alua
        path_checker emc_clariion
        failback immediate
    }
}
```

RHEL ships with built-in device configurations for most major vendors. Check the built-in database:

```bash
sudo multipathd show config
```

## The multipaths Section

Per-LUN overrides:

```bash
multipaths {
    multipath {
        wwid 3600508b4000c4a37
        alias db_data
        path_grouping_policy multibus
        no_path_retry 10
    }
    multipath {
        wwid 3600508b4000c4a38
        alias db_logs
        path_grouping_policy failover
        failback manual
    }
}
```

## Priority Order

Settings are applied with this priority (highest to lowest):

1. `multipaths` section (per-LUN)
2. `devices` section (per-vendor)
3. `defaults` section
4. Built-in defaults

## Applying Changes

After editing multipath.conf:

```bash
# Validate the configuration
sudo multipath -t

# Apply without restart
sudo multipathd reconfigure

# Or restart the service
sudo systemctl restart multipathd

# Verify
sudo multipath -ll
```

## Checking the Effective Configuration

See the merged configuration (including built-in defaults):

```bash
# Full effective config
sudo multipathd show config

# Config for a specific device
sudo multipathd show config local
```

## Common Modifications

### Change All Devices to Active/Active Load Balancing

```bash
defaults {
    path_grouping_policy multibus
    path_selector "service-time 0"
}
```

### Set Queue Behavior for Critical Storage

```bash
multipaths {
    multipath {
        wwid 3600508b4000c4a37
        no_path_retry queue
    }
}
```

### Increase Polling Frequency

```bash
defaults {
    polling_interval 2
}
```

### Use ALUA Path Priorities

```bash
defaults {
    prio alua
    path_grouping_policy group_by_prio
}
```

## Validating Before Applying

Always check for syntax errors:

```bash
# Dry run - shows what configuration would be used
sudo multipath -t

# Verbose output to see path resolution
sudo multipath -v3
```

## Backup Before Changes

```bash
sudo cp /etc/multipath.conf /etc/multipath.conf.bak.$(date +%Y%m%d)
```

## Conclusion

The multipath.conf file gives you fine-grained control over multipath behavior. Start with the defaults section for global settings, use the devices section for storage-vendor-specific tuning, and the multipaths section for per-LUN overrides. Always validate changes with `multipath -t` before applying them, and test failover behavior after any configuration change.

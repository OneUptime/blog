# How to Configure Friendly Multipath Device Names on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, Device Names, Storage, Linux

Description: Configure custom friendly names for multipath devices on RHEL to make storage management clearer with meaningful aliases.

---

By default, DM-Multipath uses names like `mpatha`, `mpathb`, or long WWID strings. For environments with many LUNs, custom aliases make it much easier to identify which multipath device maps to which storage function.

## Default Naming Behavior

With `user_friendly_names yes` in multipath.conf:

```
mpatha (3600508b4000c4a37) dm-0 ...
mpathb (3600508b4000c4a38) dm-1 ...
```

Without it, devices use the full WWID:

```
3600508b4000c4a37 dm-0 ...
```

Neither is particularly descriptive.

## Setting Custom Aliases

Edit `/etc/multipath.conf` and add a `multipaths` section:

```
multipaths {
    multipath {
        wwid 3600508b4000c4a37
        alias db_data
    }
    multipath {
        wwid 3600508b4000c4a38
        alias db_logs
    }
    multipath {
        wwid 3600508b4000c4a39
        alias web_content
    }
}
```

Apply:

```bash
sudo multipathd reconfigure
```

Now the devices appear as:

```bash
sudo multipath -ll
```

```
db_data (3600508b4000c4a37) dm-0 ...
db_logs (3600508b4000c4a38) dm-1 ...
web_content (3600508b4000c4a39) dm-2 ...
```

And you use them as `/dev/mapper/db_data`, `/dev/mapper/db_logs`, etc.

## Finding the WWID

To set aliases, you need the WWID of each device:

```bash
# From multipath
sudo multipath -ll

# From the device
sudo /lib/udev/scsi_id -g -u /dev/sdb

# From multipathd
sudo multipathd show maps format "%w %n %d"
```

## Naming Conventions

Good practices for aliases:

- Use the function: `db_data`, `web_content`, `backup_vol`
- Use the array and LUN: `vnx_lun42`, `pure_vol_db01`
- Use the application: `oracle_redo`, `postgres_data`
- Avoid spaces and special characters
- Keep names consistent across servers accessing the same LUNs

## The Bindings File

When using `user_friendly_names yes`, multipath maintains a bindings file that maps WWIDs to friendly names:

```bash
cat /etc/multipath/bindings
```

```
mpatha 3600508b4000c4a37
mpathb 3600508b4000c4a38
```

This file ensures names persist across reboots. If you delete it, names may change.

## Mixing Aliases and Auto-Names

You can set aliases for some devices and let others use automatic naming:

```
defaults {
    user_friendly_names yes
}

multipaths {
    multipath {
        wwid 3600508b4000c4a37
        alias db_data
    }
    # Other devices will get mpatha, mpathb, etc.
}
```

## Updating fstab and Applications

After setting aliases, update any references:

```bash
# Old
/dev/mapper/mpatha /mnt/data xfs defaults,_netdev 0 0

# New
/dev/mapper/db_data /mnt/data xfs defaults,_netdev 0 0
```

Also update any application configurations, LVM physical volumes, or scripts that reference the old names.

## Troubleshooting Name Changes

If aliases are not taking effect:

```bash
# Flush all maps and rediscover
sudo multipath -F
sudo multipath -v2

# Or reconfigure multipathd
sudo multipathd reconfigure

# Check for conflicts in bindings file
cat /etc/multipath/bindings
```

## Conclusion

Custom aliases make multipath device management much easier in environments with many LUNs. Set the `alias` attribute in the `multipaths` section of multipath.conf using the device WWID. Use descriptive names that reflect the function of each device to avoid confusion when managing storage.

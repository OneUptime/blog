# How to Blacklist Local Disks from Multipath on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, Blacklist, Storage, Linux

Description: Exclude local disks from DM-Multipath management on RHEL to prevent the system from creating multipath devices for internal storage.

---

By default, DM-Multipath may try to manage all block devices, including local internal disks that should not be multipathed. Blacklisting tells multipathd to ignore specific devices, preventing unnecessary multipath maps for local storage like boot disks and internal SSDs.

## Why Blacklist Local Disks

When multipathd creates a multipath device for a local disk that has only one path, it adds complexity without benefit. It can also cause boot issues if the root file system ends up behind a multipath device that was not expected.

## Checking Current Behavior

See what devices multipathd is managing:

```bash
sudo multipath -ll
sudo multipathd show maps
```

If you see local disks (like your boot disk) in the output, they should be blacklisted.

## Using find_multipaths

The simplest approach is to set `find_multipaths` in the defaults section:

```bash
defaults {
    find_multipaths yes
}
```

This tells multipathd to only create multipath devices when it detects more than one path to a device. Local disks with a single path are automatically excluded.

The `find_multipaths` parameter has several modes:

- `yes`: Create multipath only if multiple paths exist
- `no`: Try to create multipath for all devices
- `smart`: Like yes, but waits briefly for additional paths before deciding
- `greedy`: Create multipath for all non-blacklisted devices (even with one path)

## Blacklisting by Device Name

```bash
blacklist {
    devnode "^sd[a-z]$"
}
```

This blacklists all `/dev/sdX` devices. You would then use `blacklist_exceptions` to allow your SAN devices.

## Blacklisting by WWID

The most reliable method is blacklisting by WWID:

```bash
# Find the WWID of local disks
sudo /lib/udev/scsi_id -g -u /dev/sda
```

Add to multipath.conf:

```bash
blacklist {
    wwid "2000000000000001"
    wwid "2000000000000002"
}
```

## Blacklisting by Vendor/Product

If your local disks are from a specific vendor:

```bash
blacklist {
    device {
        vendor "ATA"
        product ".*"
    }
    device {
        vendor "VMware"
        product "Virtual disk"
    }
}
```

This blacklists all ATA (SATA/IDE) disks and VMware virtual disks from multipath.

## Blacklisting by Device Type

```bash
blacklist {
    devnode "^(ram|raw|loop|fd|md|dm-|sr|scd|st)[0-9]*"
    devnode "^hd[a-z]"
    devnode "^nvme[0-9]"
}
```

## Using blacklist_exceptions

When you blacklist broadly, use exceptions to whitelist specific devices:

```bash
blacklist {
    devnode ".*"
}

blacklist_exceptions {
    devnode "^sd[a-z]"
}
```

Or more specifically:

```bash
blacklist {
    device {
        vendor ".*"
        product ".*"
    }
}

blacklist_exceptions {
    device {
        vendor "NETAPP"
        product "LUN.*"
    }
    device {
        vendor "DGC"
        product ".*"
    }
}
```

## Common Blacklist Configuration for VMs

Virtual machines often need to blacklist the virtual disk controller:

```bash
blacklist {
    device {
        vendor "VMware"
        product "Virtual disk"
    }
    device {
        vendor "QEMU"
        product "QEMU HARDDISK"
    }
}
```

## Applying and Verifying

After editing the blacklist:

```bash
# Flush existing unused maps
sudo multipath -F

# Reconfigure
sudo multipathd reconfigure

# Verify local disks are excluded
sudo multipath -ll
sudo multipathd show maps
```

## Checking if a Device is Blacklisted

```bash
# Check a specific device
sudo multipathd show blacklist

# Verbose check
sudo multipath -v3 2>&1 | grep -i blacklist
```

## Conclusion

Blacklisting local disks from multipath keeps your configuration clean and prevents potential boot issues. Use `find_multipaths yes` as the first line of defense, then add explicit blacklist entries for device types that should never be multipathed. The combination of broad blacklisting with specific exceptions gives you the most control.

# Validation Summary: How to Add Block Devices to an Existing Stratis Pool on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- Linux block devices
- XFS thin-provisioned filesystems
- Linux storage utilities: lsblk, blkid, pvs, wipefs, sgdisk

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Stratis command man page: https://www.mankier.com/8/stratis
- Local util-linux wipefs help output
- Local GPT fdisk sgdisk help output

## Issues Found
- The monitoring script parsed `stratis pool list` with incorrect field numbers. In Stratis output, the total value is field 2 and its unit is field 3, while field 3 alone is only the unit. I replaced the parsing with an `awk` script that reads the numeric value and unit for total and used space, converts common binary units to GiB, and then calculates the percentage.
- The device-size note stated that Stratis works best with similarly sized data devices and that mixed sizes might not distribute data optimally. I changed it to the narrower, supportable guidance that Stratis can use devices of different sizes, but capacity planning is simpler with similar-sized data devices.

## Review Notes
The Stratis expansion commands, including `stratis pool add-data`, `stratis pool init-cache`, `stratis pool add-cache`, `stratis blockdev list`, and `stratis filesystem list`, are valid. Red Hat documents adding one or more block devices to a Stratis pool, and the Stratis man page documents the cache commands and notes that signatures must be erased before Stratis can claim an in-use-looking block device.

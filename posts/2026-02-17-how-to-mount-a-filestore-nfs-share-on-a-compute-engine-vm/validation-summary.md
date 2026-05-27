# Validation Summary: How to Mount a Filestore NFS Share on a Compute Engine VM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Filestore
- Compute Engine
- Linux NFS client tools
- NFS mount options
- `/etc/fstab`
- Google Cloud CLI
- Linux file permissions

## Sources Consulted
- Google Cloud Filestore: Mounting file shares on Compute Engine clients: https://docs.cloud.google.com/filestore/docs/mounting-fileshares
- Google Cloud Filestore: Get instance information: https://docs.cloud.google.com/filestore/docs/getting-instance-information
- Google Cloud Filestore: Access control: https://docs.cloud.google.com/filestore/docs/access-control
- Google Cloud Filestore: Configure firewall rules: https://docs.cloud.google.com/filestore/docs/configuring-firewall
- Google Cloud Compute Engine: Use startup scripts on Linux VMs: https://docs.cloud.google.com/compute/docs/instances/startup-scripts/linux
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- The Filestore describe command used `--zone`; current Filestore documentation uses the more general `--location` flag for instance locations. Changed the command to `--location=us-central1-a`.
- The performance mount example used `nointr`, `rsize=1048576`, `wsize=1048576`, and `retrans=2`. Current Filestore guidance recommends `hard`, `timeo=600`, `retrans=3`, `rsize=524288`, `wsize=524288`, `resvport`, and `async`, with `rsize=1048576` called out for basic-tier instances. Linux also ignores `intr` and `nointr` after kernel 2.6.25. Updated the mount command, option descriptions, and fstab example.
- The firewall troubleshooting note mentioned only TCP port 2049. Filestore documentation lists TCP ports 111, 2046, 2049, 2050, and 4045 for egress rules to Filestore instances. Updated the troubleshooting note.

## Review Notes
The core tutorial flow is technically sound: installing NFS client packages, creating a mount point, mounting `ip-address:/file-share`, verifying with `df`, using `_netdev` in `/etc/fstab`, and using startup-script metadata are consistent with official documentation. Future improvements could mention `nconnect` for supported Filestore tiers and Linux kernels, and `read_ahead_kb` tuning for NFS read throughput.

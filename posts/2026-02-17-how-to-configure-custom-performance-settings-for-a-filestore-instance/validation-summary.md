# Validation Summary: How to Configure Custom Performance Settings for a Filestore Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Filestore
- Google Cloud CLI (`gcloud`)
- NFSv3 and NFSv4.1
- Linux NFS mount options
- `fio` storage benchmarking
- Compute Engine VM network bandwidth

## Sources Consulted
- Google Cloud Filestore instance performance: https://cloud.google.com/filestore/docs/performance
- Google Cloud Filestore custom performance: https://cloud.google.com/filestore/docs/custom-performance
- Google Cloud Filestore create instances guide: https://cloud.google.com/filestore/docs/creating-instances
- Google Cloud SDK `gcloud filestore instances create`: https://cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud SDK `gcloud filestore instances update`: https://cloud.google.com/sdk/gcloud/reference/filestore/instances/update
- Google Cloud Filestore mounting file shares: https://cloud.google.com/filestore/docs/mounting-fileshares
- Google Cloud Filestore supported file system protocols: https://cloud.google.com/filestore/docs/about-supported-protocols
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Google Cloud Compute Engine N2 machine types: https://cloud.google.com/compute/docs/general-purpose-machines

## Issues Found
- The post said Basic tier performance was fixed regardless of capacity and gave incorrect Basic SSD scaling examples. Updated the Basic HDD and Basic SSD performance descriptions to match the current Google Cloud Filestore performance table.
- The post said Zonal, Regional, and Enterprise tiers all supported additional configurability. Updated this to clarify that custom performance applies to supported Zonal and Regional instances, not Basic or Enterprise instances.
- The `gcloud` examples used the non-current `--performance-limits` flag with `max-read-iops` and `max-read-throughput-mibps`. Replaced these with the documented `--performance=max-iops=...` and `--performance=max-iops-per-tb=...` forms.
- The post described custom throughput and IOPS as independently configurable. Updated the explanation to state that custom performance configures purchased IOPS, while write IOPS and throughput limits are derived.
- The NFS buffer guidance used 1 MiB read/write buffers as the general Filestore recommendation. Updated it to Google's recommended 512 KiB `rsize` and `wsize` for most tiers, with a note that Basic tiers use 1 MiB `rsize`.
- The combined mount command used `retrans=2`, omitted `resvport`, omitted Filestore's recommended `nconnect` guidance for scalable tiers, and included `nointr`, which modern Linux ignores. Updated the combined mount command and `fstab` line to use `retrans=3`, `resvport`, `nconnect=2`, and removed `nointr`.
- The NFS protocol section stated only that Filestore supports NFSv3. Updated it to mention NFSv3 on all tiers and NFSv4.1 on Zonal, Regional, and Enterprise tiers, while keeping the example mounted as NFSv3 because the `gcloud` examples use the default protocol.
- The Basic HDD small random I/O tip implied a single IOPS limit for all Basic HDD capacities. Updated it to refer to lower-capacity Basic HDD limits.

## Review Notes
The post is now technically accurate for current Filestore documentation. Future improvements could add Google's `read_ahead_kb` recommendation for Linux kernel 5.4+ and more detail on using at least four client VMs to reach full scalable-tier performance, but those additions were outside the scope of correcting technical errors without restructuring the post.

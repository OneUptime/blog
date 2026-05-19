# Validation Summary: How to Configure EnhanceIO for SSD Caching on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel modules
- EnhanceIO
- SSD block-device caching
- `eio_cli`
- udev
- fio

## Sources Consulted
- STEC EnhanceIO upstream repository: https://github.com/stec-inc/EnhanceIO
- STEC EnhanceIO README: https://raw.githubusercontent.com/stec-inc/EnhanceIO/master/README.txt
- STEC EnhanceIO installation notes: https://raw.githubusercontent.com/stec-inc/EnhanceIO/master/Install.txt
- STEC EnhanceIO persistence notes: https://raw.githubusercontent.com/stec-inc/EnhanceIO/master/Documents/Persistence.txt
- STEC EnhanceIO `eio_cli` source and manpage in the upstream repository
- Debian `eio_cli(8)` manpage: https://manpages.debian.org/experimental/enhanceio/eio_cli.8.en.html
- Linux kernel device-mapper writecache documentation: https://www.kernel.org/doc/html/v5.14/admin-guide/device-mapper/writecache.html
- Linux kernel device-mapper cache documentation: https://docs.kernel.org/admin-guide/device-mapper/cache.html

## Issues Found
- The post used nonexistent long `eio_cli` options such as `--diskname`, `--ssdname`, `--cachename`, `--mode`, `--policy`, and `--blksize`. Updated commands to the short options supported by upstream `eio_cli`: `-d`, `-s`, `-c`, `-m`, `-p`, and `-b`.
- The cache name `data-cache` was invalid for upstream `eio_cli`, which accepts only alphanumeric characters and underscores. Changed it to `data_cache`.
- The CLI installation instructions referenced `python3 setup.py install`, but upstream EnhanceIO has no `setup.py`, and `eio_cli` is a Python 2-style script. Replaced this with upstream-style installation to `/sbin/eio_cli` and noted the Python 2 compatibility requirement.
- The module loading section omitted the `enhanceio_rand` policy module. Added it to the manual load and boot-load examples.
- The post said EnhanceIO creates a virtual device. Upstream documentation says it is a transparent cache and does not use device mapper, so the explanation was changed to say it attaches to and intercepts I/O for the source device.
- The post said the source filesystem must be unmounted before creating the cache. Upstream documentation says caches can be created and deleted while a source volume is mounted, so the warning was corrected while preserving a cautious unmount option for first-time setup.
- The statistics paths used `/sys/bus/enhanceio/...`, but upstream EnhanceIO exposes cache stats under `/proc/enhanceio/<cache_name>/stats`. Updated the monitoring commands accordingly.
- The `eio_cli info --cachename ...` examples were invalid because `info` takes no cache-name option. Updated the info commands and sample output to match upstream `eio_cli`.
- The benchmark created the test file after running the read benchmark. Moved the `dd` command before `fio`.
- The persistence section incorrectly said caches are not automatically restored and provided an unsupported systemd service using invalid CLI flags and `--retain`. Replaced it with the upstream udev persistence behavior and caveats.
- The write-back flush instructions incorrectly switched the cache to read-only instead of using the `clean` subcommand. Updated the removal procedure to use `eio_cli clean -c data_cache` and check `nr_dirty`.
- The removal section used nonexistent `eio_cli list`. Replaced it with `eio_cli info`.
- The troubleshooting path for installed kernel modules did not match the upstream Makefile install path. Updated it to `/lib/modules/$(uname -r)/extra/enhanceio/enhanceio*.ko`.

## Review Notes
EnhanceIO is legacy software and the upstream repository is archived. Even with corrected commands, modern Ubuntu kernels may require patches or a distro-maintained package; lvmcache, dm-cache, or dm-writecache are better-supported options for new deployments.

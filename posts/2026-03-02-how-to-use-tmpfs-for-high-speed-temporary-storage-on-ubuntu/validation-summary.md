# Validation Summary: How to Use tmpfs for High-Speed Temporary Storage on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tmpfs (Linux memory-backed filesystem)
- Ubuntu Linux
- mount / /etc/fstab
- fio (I/O benchmarking)
- dd
- Docker (daemon configuration via systemd)
- Nginx (proxy cache directory)
- pip / npm (package caches)
- systemd unit files
- df / free / swapon / watch / awk

## Sources Consulted
- Linux kernel tmpfs documentation: https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html
- `mount(8)` and tmpfs mount option man pages
- Ubuntu systemd `/tmp` mount documentation
- Docker dockerd reference: https://docs.docker.com/reference/cli/dockerd/
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html
- pip CLI reference (`--cache-dir`): https://pip.pypa.io/en/stable/cli/pip_install/
- npm CLI reference (`--cache`): https://docs.npmjs.com/cli/v10/using-npm/config#cache
- systemd.unit / systemd.service man pages

## Issues Found
- **Invalid Docker daemon.json option (`tmp-dir`)**: The "Speeding Up Docker Builds" section claimed Docker could be pointed at a custom temporary directory by adding `{"tmp-dir": "/mnt/docker-tmp"}` to `/etc/docker/daemon.json`. This is not a valid daemon.json key in any current Docker version and would be ignored or rejected. The documented mechanism is the `DOCKER_TMPDIR` environment variable on the `dockerd` process. Replaced the daemon.json snippet with a systemd drop-in at `/etc/systemd/system/docker.service.d/tmpdir.conf` that sets `Environment="DOCKER_TMPDIR=/mnt/docker-tmp"`, followed by `systemctl daemon-reload` and `systemctl restart docker`.

## Review Notes
- The `tmpfs` mount syntax, option list (`size`, `mode`, `uid`/`gid`, `noexec`/`nosuid`/`nodev`, `nr_inodes`), and `/etc/fstab` entries are all correct.
- The `fio` flags (`--name`, `--directory`, `--rw=write`, `--bs`, `--numjobs`, `--size`, `--time_based`, `--runtime`, `--group_reporting`) and the `dd ... conv=fdatasync` invocation are valid.
- `pip install --cache-dir` and `npm install --cache` are correct CLI flags.
- The shutdown systemd unit pattern (Type=oneshot, RemainAfterExit=yes, ExecStop=...) works without an ExecStart — `oneshot` allows ExecStart to be omitted when RemainAfterExit=yes. Some users may prefer adding `ExecStart=/bin/true` for clarity, but it is not required.
- The `awk 'NR==2 {gsub(/%/,""); print $5}'` snippet works because gsub on `$0` causes fields to be re-split, so `$5` returns the percentage column without the trailing `%`.
- Whether `/tmp` itself is a tmpfs by default depends on the Ubuntu release and image (Ubuntu Server traditionally kept `/tmp` on disk; recent installs and many cloud images enable `tmp.mount`). The post's example `mount` output is plausible but not guaranteed on every Ubuntu install.
- The "5-10x or more" speed-up claim in the closing paragraph is workload-dependent (NVMe SSDs narrow the gap considerably) but reasonable for small-file / metadata-heavy workloads on spinning or older SSD storage.

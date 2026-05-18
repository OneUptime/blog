# Validation Summary: How to Set Up LizardFS on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- LizardFS (distributed file system, fork of MooseFS)
- Ubuntu 22.04
- systemd
- FUSE (for client mount)
- apt / Debian packaging

## Sources Consulted
- LizardFS GitHub repository and source code (https://github.com/lizardfs/lizardfs)
- LizardFS man pages (mfsmaster.cfg(5), mfschunkserver.cfg(5), mfsexports.cfg(5), mfsgoals.cfg(5), mfsmount(8), mfsmakesnapshot(1), lizardfs-admin(8))
- LizardFS administrators guide / handbook
- MooseFS documentation (for shared heritage of mfs* tools and config directives)

## Issues Found

1. **Invalid `MATOCU_LISTEN_PORT` directive in mfsmaster.cfg** — The actual directive for the client listener is `MATOCL_LISTEN_PORT` (CL = CLient). Fixed.

2. **Non-existent `MASTER_PORT` directive in mfsmaster.cfg** — The master config does not have a `MASTER_PORT` setting; the master exposes three separate listener ports via `MATOML_LISTEN_PORT` (metalogger), `MATOCS_LISTEN_PORT` (chunk servers), and `MATOCL_LISTEN_PORT` (clients). Removed the spurious line. (Note: `MASTER_PORT` is valid in `mfschunkserver.cfg` and `mfsmetalogger.cfg` because those are *client* configs connecting *to* the master — those uses in the post are correct.)

3. **Incorrect `/etc/fstab` entry format** — The original snippet used a custom mfs* device string with an invented `lizardfs` filesystem type. The correct LizardFS fstab entry uses `mfsmount` as the device, `fuse` as the filesystem type, and passes the master/port via mount options. Fixed to: `mfsmount    /mnt/lizardfs    fuse    mfsmaster=192.168.1.10,mfsport=9421,_netdev    0    0`.

4. **Incorrect `mfsgoals.cfg` syntax** — The actual format is `id name : list_of_labels`, with `id` being a number 1-40 and `name` being an identifier. The original had ordering and identifier issues (e.g., `ssd 1 : [ssd]` puts a non-numeric `ssd` as the id). Also corrected the erasure coding example to use the `$ec(k,m)` syntax that LizardFS 3.x actually accepts in goal definitions instead of expanded label lists.

5. **Wrong snapshot command** — Changed `mfssnapshot` to `mfsmakesnapshot`, which is the correct binary name shipped by the `lizardfs-client` package.

6. **Invalid `lizardfs-admin` subcommands** — `list-chunks` and `list-endangered-chunks` are not valid subcommands. The actual subcommand for inspecting under-replicated/missing/endangered chunks is `chunks-health`. Replaced both occurrences (Monitoring section and Troubleshooting section).

## Review Notes

- **Project status caveat:** LizardFS upstream development has been largely dormant since around 2018–2019. The `ppa.lizardfs.com` repository referenced in the post may or may not still be reachable; readers may need to build from source or use community forks. The `focal` (Ubuntu 20.04) suite is used in the repo line even though prerequisites call for Ubuntu 22.04, because no `jammy` suite was ever published — this is an upstream limitation and the `focal` packages typically install on 22.04 with `apt-key`'s deprecation warning.
- **`apt-key` is deprecated** on Ubuntu 22.04 in favor of placing the key under `/etc/apt/keyrings/` and using `signed-by=` in the sources list. `apt-key add` still functions with a warning, so the post's instructions remain usable; left as-is to avoid changing scope beyond the technical correctness fixes.
- **First-time master initialization:** `lizardfs-master -a` works because the daemon will create `metadata.mfs` from `metadata.mfs.empty` on first start (the `-a` flag enables auto-recovery from changelogs). The more explicit alternative is `sudo -u lizardfs cp /var/lib/lizardfs/metadata.mfs.empty /var/lib/lizardfs/metadata.mfs` before starting the service. Either approach is acceptable.
- The chunk server's `DATA_PATH` stores the chunk server's lock/state files, not the actual chunks (those go under directories listed in `mfshdd.cfg`). The post's configuration is correct on this point.

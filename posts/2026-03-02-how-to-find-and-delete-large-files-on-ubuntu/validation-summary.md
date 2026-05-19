# Validation Summary: How to Find and Delete Large Files on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- GNU coreutils (`df`, `du`, `sort`)
- GNU findutils (`find`)
- `ncdu`
- APT / dpkg package management
- Docker CLI
- `lsof`
- systemd journal / `journalctl`
- Snap packages
- Bash shell scripting

## Sources Consulted
- GNU Coreutils manual: https://www.gnu.org/software/coreutils/manual/coreutils.html
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Ubuntu `apt-get` manpage: https://manpages.ubuntu.com/manpages/noble/en/man8/apt-get.8.html
- Ubuntu `ncdu` manpage: https://manpages.ubuntu.com/manpages/jammy/en/man1/ncdu.1.html
- Docker CLI reference for `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/
- Docker CLI reference for `docker system prune`: https://docs.docker.com/reference/cli/docker/system/prune/
- Linux `lsof` manpage: https://man7.org/linux/man-pages/man8/lsof.8.html
- systemd `journalctl` manpage: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Snapcraft documentation for snap revisions and disabled snaps: https://snapcraft.io/docs/getting-started
- Local Ubuntu 24.04 command help/manpage checks for `find`, `du`, `sort`, `apt`, `docker`, `lsof`, `journalctl`, and `snap`

## Issues Found
- The `ncdu /` example claimed it excluded other mounts. According to the `ncdu` manpage, excluding other filesystems requires `-x` / `--one-file-system`, so the command was changed to `sudo ncdu -x /`.
- The "20 largest files" pipeline used space-separated output and printed only `$2`, which breaks paths containing spaces. The `find -printf` output was changed to tab-separated fields and the `awk` parser was updated accordingly.
- The large log file example used `xargs ls -lh`, which runs `ls` with no operands when there are no matches on GNU systems. It was changed to `xargs -r ls -lh`.
- The Docker volume example claimed to list large volumes but only printed volume names and mountpoints. It was replaced with `sudo docker system df -v`, which Docker documents as detailed disk usage including local volumes.
- The `apt autoclean` description said it removes packages no longer needed for installation. The official APT documentation says it removes package files that can no longer be downloaded, so the wording was corrected.
- The deleted-but-open file size pipeline assumed a fixed `lsof` column layout. The command was updated to locate the `SIZE` column from the header before sorting deleted entries.
- The `/proc/<PID>/fd/<FD>` instruction did not mention that `lsof` appends access-mode letters to file descriptors, such as `4w`. The text now tells readers to use the numeric part of the descriptor.

## Review Notes
The remaining commands are Ubuntu/GNU-specific, which is appropriate for the post title. Some cleanup commands are intentionally destructive (`find ... -delete`, Docker prune, and APT purge), but the post already frames them as cleanup actions and includes cautionary context.

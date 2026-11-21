# Validation summary

## Checks performed

- Executed exact published Python script on temporary fdinfo-shaped files: three watch records across two files reported correctly; an unreadable directory entry yielded unreadable_files=1 and exit code 2.
- All shell examples passed bash syntax checks; sysctl commands and Linux error classifications reviewed against manual pages.
- Reviewed cAdvisor 0.55.1 raw/common watcher recursion, event handling and .mount exclusion.
- Six-edge Mermaid flow structurally checked without rendering.
- Generated 1280x720 social image visually reviewed; readable unclipped title.

## Sources reviewed

- https://man7.org/linux/man-pages/man2/inotify_add_watch.2.html
- https://man7.org/linux/man-pages/man2/inotify_init.2.html
- https://man7.org/linux/man-pages/man7/inotify.7.html
- https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html
- https://man7.org/linux/man-pages/man5/proc_pid_fdinfo.5.html
- https://github.com/google/cadvisor/blob/v0.55.1/container/raw/watcher.go
- https://github.com/google/cadvisor/blob/v0.55.1/container/common/inotify_watcher.go
- https://man7.org/linux/man-pages/man8/sysctl.8.html

## Limitations

- No live inotify instance, Linux kernel limit exhaustion, sysctl write or collector restart was performed.
- The script counts visible fdinfo records, not unique kernel instances or host-wide quota consumption.
- No live new-container discovery acceptance test was performed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

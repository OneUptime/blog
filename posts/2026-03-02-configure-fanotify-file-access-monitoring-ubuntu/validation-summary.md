# Validation Summary: How to Configure fanotify for File Access Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linux fanotify API
- Ubuntu/Linux kernel filesystem monitoring
- C system programming
- systemd services
- journalctl/systemctl commands

## Sources Consulted
- Linux man-pages: fanotify(7), fanotify_init(2), fanotify_mark(2), inotify(7)
- Local glibc header: /usr/include/x86_64-linux-gnu/sys/fanotify.h
- Local Linux UAPI header: /usr/include/linux/fanotify.h
- systemd man-pages: systemd.service(5), systemctl(1), journalctl(1)

## Issues Found
- The C examples used `O_LARGEFILE`, but the post's compile commands did not enable GNU extensions, so the examples failed to compile on the reviewed Ubuntu/glibc environment. Added `#define _GNU_SOURCE` before the includes in each C example so `O_LARGEFILE` is declared.
- The audit example initialized fanotify with `FAN_REPORT_DFID_NAME` while still reading paths from `event->fd`. Official fanotify documentation states that groups identifying filesystem objects by file handles report `FAN_NOFD` in `event->fd`, so the sample would not print the claimed file paths. Changed the audit sample to use descriptor-based `FAN_CLASS_NOTIF` with `FAN_MARK_MOUNT` and `FAN_OPEN | FAN_CLOSE_WRITE`.
- The audit example requested `FAN_CREATE` and `FAN_DELETE` but did not parse the required file-handle information records. Removed those events from that descriptor-based sample.
- The prerequisite text stated broadly that fanotify requires root or `CAP_SYS_ADMIN`. Linux 5.13 added limited unprivileged fanotify groups, but the examples in this post still require `CAP_SYS_ADMIN` for mount/filesystem marks or permission classes. Narrowed the statement to the examples shown.
- The post said fanotify was introduced in Linux 2.6.36, but the reviewed Linux man-pages list the fanotify system calls as Linux 2.6.37. Updated the version.
- The `FAN_OPEN_PERM` reference mentioned only `FAN_CLASS_CONTENT`; official documentation also allows `FAN_CLASS_PRE_CONTENT`. Updated the reference.
- The access-control example ignored the result of writing a permission response. Added a minimal error check.

## Review Notes
- `FAN_CREATE` and `FAN_DELETE` are correctly documented as requiring Linux 5.1+, but practical use of those events requires file-handle reporting (`FAN_REPORT_FID` or related flags) and parsing the supplemental event information records.
- Permission events are correctly described as requiring `FAN_CLASS_CONTENT` or `FAN_CLASS_PRE_CONTENT`.

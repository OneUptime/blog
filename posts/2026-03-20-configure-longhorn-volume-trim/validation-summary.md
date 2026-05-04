# Validation Summary: How to Configure Longhorn Volume Trim

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Longhorn (Kubernetes block storage)
- Kubernetes (CronJob, StorageClass, kubectl)
- Longhorn HTTP API
- Longhorn `RecurringJob` CRD (`longhorn.io/v1beta2`)
- `fstrim` / FITRIM ioctl, DISCARD/UNMAP
- ext4 / xfs / btrfs filesystems
- BusyBox container image

## Sources Consulted
- Longhorn — Trim Filesystem in a Longhorn Volume: https://longhorn.io/docs/1.6.0/nodes-and-volumes/volumes/trim-filesystem/
- Longhorn — Scheduling Snapshots and Backups (RecurringJob CRD, label format): https://longhorn.io/docs/1.11.1/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn enhancement: Recurring Filesystem Trim (v1.5+): https://github.com/longhorn/longhorn/blob/master/enhancements/20230309-recurring-filesystem-trim.md
- Longhorn issue #5529 — `filesystem-trim` recurring task
- Longhorn issue #5186 — Auto trim via recurring job
- BusyBox source — `util-linux/fstrim.c` (confirms `fstrim` applet is included in default builds): https://git.busybox.net/busybox/plain/util-linux/fstrim.c

## Issues Found

1. **Fabricated/misleading "Via kubectl Settings" subsection.**
   - The post claimed `recurring-job-max-retention` could be patched to "set the trim interval (in hours)".
   - This is incorrect: `recurring-job-max-retention` exists but caps the maximum `retain` value across recurring jobs — it has nothing to do with trim cadence. **There is no built-in Longhorn setting that controls automatic filesystem trim cadence.** Automatic periodic trim is exclusively configured through a `RecurringJob` CRD with `task: filesystem-trim`.
   - **Fix:** Removed the misleading subsection body (incorrect patch command and grep stub) and replaced it with a one-line clarification stating that no global trim-interval setting exists and that periodic trim is configured via `RecurringJob`. The "Via Recurring Job" subsection that follows already provides the correct procedure.

2. **`retain: 0` in the RecurringJob example would fail admission validation.**
   - Longhorn's webhook enforces a minimum `retain` value of `1` on `RecurringJob` resources, even for tasks that produce no snapshots (e.g., `filesystem-trim`).
   - **Fix:** Changed `retain: 0` to `retain: 1` and updated the inline comment to reflect that trim does not create snapshots but the minimum allowed value is 1.

## Review Notes

- The `image: busybox` choice in the CronJob is technically valid: BusyBox's default build does include the `fstrim` applet (from its `util-linux` collection). It would only fail on stripped/minimal BusyBox builds. Left unchanged.
- The Longhorn HTTP API call `POST /v1/volumes/<name>?action=trimFilesystem` against the `longhorn-frontend` service is correct (camelCase action name).
- The volume-to-recurring-job binding label `recurring-job.longhorn.io/<job-name>=enabled` is correct. (Group form is `recurring-job-group.longhorn.io/<group-name>=enabled` for completeness, but not used here.)
- Prerequisite "Longhorn v1.4.0 or later" is accurate — filesystem trim landed in v1.4.0; the recurring `filesystem-trim` task became GA in v1.5.0, so users running 1.4.x can only do one-shot trim. Worth keeping in mind for readers but not a factual error.
- The `discard` mount option caveat in the post is correct: online discard can hurt write performance vs. periodic `fstrim`.
- `fstrim` in a container requires root and (in some kernels) `CAP_SYS_ADMIN` to issue the FITRIM ioctl. The CronJob example runs the default root user, which is typically sufficient on common kernels, but on hardened clusters with PodSecurity restrictions this may need an explicit `securityContext`. Not a correctness issue — a deployment-environment caveat.

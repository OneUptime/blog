# Validation Summary: How to Mount an S3 Bucket as a File System with s3fs-fuse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- s3fs-fuse
- Linux FUSE mounts
- macFUSE
- IAM roles and S3 IAM permissions
- `/etc/fstab`

## Sources Consulted
- s3fs-fuse upstream README: https://github.com/s3fs-fuse/s3fs-fuse
- s3fs Debian man page: https://manpages.debian.org/testing/s3fs/s3fs.1.en.html
- Amazon S3 strong consistency documentation: https://aws.amazon.com/s3/consistency/
- AWS documentation for Mountpoint for Amazon S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mountpoint.html

## Issues Found
- The macOS Homebrew command used `brew install s3fs`, but the upstream s3fs-fuse README currently documents `brew install gromgit/fuse/s3fs-mac` after installing macFUSE. Updated the command.
- The `/etc/fstab` example used `s3fs#my-bucket` with filesystem type `fuse`. Upstream s3fs-fuse documentation now shows the bucket as the first field and `fuse.s3fs` as the filesystem type. Updated the fstab line.
- The prefix mounting section said to use the `-o` option, but s3fs documents prefix mounting through the `bucket[:/path]` argument syntax. Updated the wording while keeping the example.
- The limitations section said S3 listings are eventually consistent after upload. AWS S3 now provides strong consistency for GET, PUT, DELETE, and LIST operations in all regions, so this was outdated. Replaced it with a note about s3fs metadata caching causing stale-looking views.
- The limitations section said POSIX file locks do not work. The more precise upstream limitation is that s3fs has no coordination between multiple clients mounting the same bucket. Updated the wording to avoid overstating local locking behavior.
- The limitations section said symbolic links are unsupported. Upstream s3fs-fuse lists symlinks as part of its supported POSIX subset, while hard links remain unsupported. Updated the limitation to mention only hard links and clarify that S3 itself does not provide native POSIX hard links.

## Review Notes
- `allow_other` can require `user_allow_other` in `/etc/fuse.conf` on some systems; this is an operational caveat, not an error in the mount examples.
- The IAM policy is broadly correct for read/write/delete/list usage, though production deployments should usually split bucket-level and object-level actions into separate statements for least-privilege clarity.

# Validation Summary: How to Mount S3 Buckets with s3fs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- s3fs-fuse (FUSE-based S3 filesystem)
- Amazon S3
- Ubuntu / apt
- FUSE (`/etc/fuse.conf`, `fusermount`)
- systemd mount units and `/etc/fstab`
- S3-compatible storage (MinIO, DigitalOcean Spaces, Wasabi, Backblaze B2)
- AWS IAM policies, SSE / SSE-KMS encryption
- Alternative tools: goofys, rclone, AWS CLI

## Sources Consulted
- s3fs-fuse official man page: https://github.com/s3fs-fuse/s3fs-fuse/blob/master/doc/man/s3fs.1.in
- s3fs-fuse source (verified option parsing directly): `src/s3fs.cpp`, `src/curl.cpp`, `src/s3fs_help.cpp` — cloned from https://github.com/s3fs-fuse/s3fs-fuse
- s3fs-fuse README / install instructions: https://github.com/s3fs-fuse/s3fs-fuse
- goofys repository: https://github.com/kahing/goofys
- rclone install docs: https://rclone.org/install/
- AWS S3 strong consistency announcement (Dec 1, 2020): https://aws.amazon.com/s3/consistency/
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html

## Issues Found
1. **Outdated consistency claim (fixed).** The Limitations section stated "S3's eventual consistency can cause issues." Since December 1, 2020, Amazon S3 provides strong read-after-write consistency for all operations, so the "eventual consistency" attribution is outdated. Reworded to note that S3 itself is now strongly consistent, while s3fs's own local stat cache can still serve stale metadata across multiple clients (which is the real, still-valid concern). No other content changed.

## Review Notes
- **storage_class casing is fine.** The post uses uppercase values (`STANDARD`, `STANDARD_IA`) while the man page documents lowercase. Verified against `S3fsCurl::SetStorageClass()` in `src/curl.cpp`, which calls `upper()` on the supplied value before use ("AWS requires uppercase storage class values"). Both cases work, so no change was needed.
- **Tilde in `-o passwd_file=~/.passwd-s3fs` is fine.** Confirmed bash performs tilde expansion after the `=` in this word, so the path resolves correctly. Not an error.
- **Deprecation warnings (still functional, no fix needed):** Verified in `src/s3fs.cpp` that `parallel_count` is now merged into `max_thread_count` and `enable_noobj_cache` is an alias for `enable_negative_cache` (now enabled by default). Both still work for backward compatibility but emit a warning; a future s3fs release may remove them. Worth refreshing if the post is updated later.
- `endpoint` is a valid legacy alias for `region`; both are accepted. Confirmed.
- Build dependencies, source-build steps (`./autogen.sh && ./configure && make && sudo make install`), credential file formats (`ACCESS_KEY:SECRET_KEY` and `BUCKET:KEY:SECRET`), `iam_role=auto`, fstab `fuse.s3fs` entries, the systemd `.mount` unit, `use_sse` / `use_sse=kmsid:<id>`, `multipart_size` / `multipart_copy_size` (min 5 MB) / `max_dirty_data` (min 50 MB), cache options, the goofys binary download URL, and the rclone install command were all verified and are correct.
- The IAM least-privilege policy JSON is syntactically valid and uses correct S3 actions and ARN formats.
- Comparison-table ratings (POSIX compliance, performance, memory) are subjective but reasonable; left as-is.

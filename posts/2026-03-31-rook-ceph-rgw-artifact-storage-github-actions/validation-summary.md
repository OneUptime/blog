# Validation Summary: How to Use Ceph RGW as Artifact Storage for GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph (RGW / RADOS Gateway)
- GitHub Actions (self-hosted runners)
- AWS CLI (`aws s3 sync`, `aws s3 cp`, `aws s3 mb`)
- `shallwefootball/s3-upload-action` GitHub Action (v1.3.0)
- `radosgw-admin` CLI
- Apache Maven (build tool used in examples)
- S3-compatible object storage

## Sources Consulted
- `shallwefootball/s3-upload-action` GitHub repository action.yml and index.js — confirmed `endpoint` input is supported and passed to the AWS SDK S3 client constructor
- Rook Ceph documentation for `radosgw-admin user create` flags (`--uid`, `--display-name`, `--access-key`, `--secret-key`)
- AWS CLI S3 reference for `s3 mb`, `s3 sync`, `s3 cp`, and `--endpoint-url` flag
- GitHub Actions documentation for `hashFiles()` expression function and `github.run_id` context variable
- Maven documentation for default local repository location (`~/.m2/repository/`)

## Issues Found
1. **Maven cache path was relative instead of absolute (lines 82, 94)**: The cache restore and save steps used `.m2/repository/` (relative to the workspace directory) instead of `~/.m2/repository/` (Maven's actual default local repository in the user's home directory). In GitHub Actions, `run` steps execute in `$GITHUB_WORKSPACE`, so the relative path would create/read a directory inside the checkout — Maven would never find or use those cached dependencies. Fixed both the restore and save steps to use `~/.m2/repository/`.

## Review Notes
- The `shallwefootball/s3-upload-action` hardcodes `ACL: 'public-read'` on every uploaded object. Users should ensure their Ceph RGW bucket policy and user capabilities permit this ACL, or uploads will fail with an AccessDenied error.
- The "Download Artifacts from a Previous Run" section uses `${{ github.run_id }}`, which references the current run's ID. To actually download from a previous run, users would need to supply or look up the prior run's ID. The code is syntactically correct but the section title is slightly misleading.
- The post assumes AWS CLI is pre-installed on the self-hosted runner. This is a reasonable assumption for most runner images but could be called out in prerequisites.

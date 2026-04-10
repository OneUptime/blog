# Validation Summary: How to Use Ceph Community Resources for Troubleshooting

## Status
validated

## Post Type
Reference / Community Resource Guide

## Technologies Covered
- Ceph (Reef / 18.x release series)
- Rook-Ceph (Kubernetes operator for Ceph)
- IRC (OFTC network)
- Slack (Ceph and Kubernetes workspaces)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com
- Rook project documentation: https://rook.io/docs/rook/latest/
- Rook GitHub repository and contributing guide: https://github.com/rook/rook
- Ceph tracker: https://tracker.ceph.com
- Kubernetes Slack workspace (for Rook channel verification)

## Issues Found
1. **Rook Slack channel name and workspace**: The post listed `#rook` in the "CNCF Slack workspace." The primary Rook discussion channel is `#rook-ceph` in the Kubernetes Slack workspace (`kubernetes.slack.com`). Fixed the channel name and workspace reference.

## Review Notes
- The `ceph version` command and its example output (`18.2.1 reef`) are correct. Ceph 18.x is the Reef release series.
- The `rook-dev@googlegroups.com` mailing list reference could not be independently confirmed as active. The Rook project primarily uses GitHub Discussions and Slack for community communication. This may warrant future verification.
- The Ceph mailing list addresses (`ceph-users@ceph.io`, `ceph-devel@ceph.io`) reflect the current ceph.io domain but could not be fully verified against the latest mailing list infrastructure.
- The Rook docs URL `https://rook.io/docs` is acceptable as a short-form URL, though the full canonical path is `https://rook.io/docs/rook/latest/`.
- Overall the post is a solid community resource guide with accurate pointers to the main Ceph and Rook support channels.

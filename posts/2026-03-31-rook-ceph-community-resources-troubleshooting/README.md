# How to Use Ceph Community Resources for Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Community, Troubleshooting, Support

Description: Navigate Ceph community resources including docs, mailing lists, IRC, GitHub issues, and the Ceph tracker to get help resolving cluster issues faster.

---

Ceph has a large, active open source community. Knowing which resource to use for which type of problem saves time and gets you to an answer faster.

## Official Documentation

The Ceph docs are the first stop for any configuration or operational question:

- Main docs: https://docs.ceph.com
- Rook-Ceph docs: https://rook.io/docs
- Troubleshooting guide: https://docs.ceph.com/en/latest/rados/troubleshooting/

Use the version selector to make sure you are reading docs for your installed version:

```bash
ceph version
# ceph version 18.2.1 (reef)
```

## Ceph Tracker (Bug Reports and Feature Requests)

For bugs and known issues, check the Ceph issue tracker:

- https://tracker.ceph.com

Search before opening a new issue. Use filters like component (OSD, RGW, RBD) and version to narrow results.

## GitHub Repositories

The Rook operator is on GitHub:

- https://github.com/rook/rook

Search existing issues before opening new ones:

```bash
# Useful GitHub search terms
# "slow request" type:issue is:open
# "HEALTH_WARN" type:issue is:closed label:bug
```

## Ceph Mailing Lists

Subscribe to the relevant mailing list for your use case:

- ceph-users@ceph.io - general user questions
- ceph-devel@ceph.io - development discussions
- rook-dev@googlegroups.com - Rook-specific questions

When posting, always include:
- Ceph version
- OS and kernel version
- `ceph status` output
- Relevant log excerpts

## IRC and Slack

Real-time help is available on:

- IRC: `#ceph` on OFTC (irc.oftc.net)
- Slack: https://ceph-storage.slack.com (invitation at ceph.io)
- Rook Slack: `#rook-ceph` channel in the Kubernetes Slack workspace

## Stack Overflow

For how-to questions, Stack Overflow with the `ceph` tag is useful:

- https://stackoverflow.com/questions/tagged/ceph

## Summary

The Ceph community provides a layered set of resources: official docs for reference, the tracker for known bugs, GitHub for Rook-specific issues, mailing lists for technical discussions, and IRC/Slack for real-time help. Always include your Ceph version and relevant command output when asking for help to get faster, more accurate responses.

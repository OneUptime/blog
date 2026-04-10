# How to Use Ceph Mailing Lists and IRC for Help

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Community, Mailing List, IRC

Description: Get effective help from Ceph mailing lists and IRC by posting well-structured questions with diagnostic context, version info, and clear problem statements.

---

Mailing lists and IRC remain the primary communication channels for the Ceph community. This guide shows how to use them effectively so your questions get answered rather than ignored.

## Ceph Mailing Lists

There are several mailing lists depending on your topic:

| List | Purpose |
|------|---------|
| ceph-users@ceph.io | General user questions and operational issues |
| ceph-devel@ceph.io | Development, patches, and architecture |
| ceph-announce@ceph.io | Release announcements (read-only) |

Subscribe at: https://lists.ceph.io/postorius/lists/

## Writing a Good Mailing List Post

The subject line matters. Be specific:

```yaml
Subject: [ceph-users] RGW returning 503 under load after upgrading to Reef 18.2.2
```

Your message body should follow this structure:

```yaml
Hi,

I'm seeing [specific issue] after [what changed].

Environment:
- Ceph version: 18.2.2 (Reef)
- OS: Ubuntu 22.04, kernel 5.15.0-91
- Cluster size: 3 MONs, 12 OSDs, 2 RGWs

Steps to reproduce:
1. ...
2. ...

Output of `ceph status`:
[paste here]

Relevant log snippet:
[paste here]

Any suggestions appreciated.
```

## IRC - Real-Time Help

Connect to the OFTC network:

```bash
# Using irssi
irssi -c irc.oftc.net -n yourname
# Then: /join #ceph

# Using weechat
weechat
# Then: /connect irc.oftc.net
# Then: /join #ceph
```

IRC guidelines:
- State your problem once clearly, then wait - do not repeat every 5 minutes
- Paste long output to https://paste.ceph.com or similar
- Be patient - responders are volunteers in various time zones

## Ceph Slack Workspace

For a more modern interface, the Ceph Slack workspace is active:

1. Request an invite at https://ceph.io/slack
2. Join `#general` for announcements and `#help` for user questions
3. Use `#rook` for Rook-Ceph operator questions

## What to Always Include

Before asking for help anywhere, always gather:

```bash
ceph version
ceph status
ceph health detail
```

Paste these in your question. Without version and status, community members cannot help you effectively.

## Following Up

If you resolve the issue yourself after posting, reply to the thread with what fixed it. This helps future searchers with the same problem find an answer in the mailing list archives.

## Summary

Ceph mailing lists serve different audiences - use ceph-users for operational questions and ceph-devel for development topics. Writing a structured post with version info, reproduction steps, and diagnostic output dramatically increases your chances of a helpful reply. IRC and Slack offer faster real-time responses for urgent questions.

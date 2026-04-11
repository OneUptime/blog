# Validation Summary: How Sentinel Leader Election Works in Redis

## Status
validated

## Post Type
Technical deep dive / Explainer

## Technologies Covered
- Redis Sentinel
- Redis Sentinel leader election protocol
- Raft consensus algorithm (as comparison)
- Redis Pub/Sub (Sentinel event channels)

## Sources Consulted
- Redis Sentinel documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- Redis Sentinel client specification and Pub/Sub message reference
- Redis `SENTINEL` command reference (https://redis.io/docs/latest/commands/sentinel/)
- Raft consensus algorithm paper (for comparison claims)

## Issues Found
1. **Invalid Pub/Sub channel name `+sentinel-event`** (line 124): The `SUBSCRIBE +sentinel-event` example used a non-existent Sentinel Pub/Sub channel. Redis Sentinel publishes events on specific named channels such as `+sdown`, `+odown`, `+elected-leader`, `+switch-master`, etc. There is no `+sentinel-event` channel. Changed to `SUBSCRIBE +elected-leader`, which is a real channel directly relevant to the election-observing context of the section.

## Review Notes
- The post accurately describes the Sentinel leader election protocol as a Raft-inspired mechanism. The epoch/term analogy, one-vote-per-epoch rule, and majority requirement are all correctly explained.
- The `SENTINEL is-master-down-by-addr` command doubles as both a "is master down?" query (when runid is `*`) and a vote request (when runid is the Sentinel's actual ID). The post correctly focuses on the vote-request usage but doesn't mention the dual purpose, which is fine for the scope of this article.
- The analysis of why 2 Sentinels are insufficient is slightly simplified — with 2 Sentinels and quorum=1, a partitioned Sentinel can declare ODOWN but still cannot complete failover without majority votes from all known Sentinels. The conclusion (always use at least 3) is correct and the general reasoning conveys the right idea.
- All configuration syntax, command formats, and Pub/Sub channel names (in the Pub/Sub Notifications section) are accurate for current Redis versions.

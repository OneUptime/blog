# Validation Summary: How MySQL Group Replication Consensus Works

## Status
validated

## Post Type
Technical explainer / Guide

## Technologies Covered
- MySQL Group Replication
- XCom (Group Communication System)
- Paxos consensus protocol
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Group Replication (https://dev.mysql.com/doc/refman/8.0/en/group-replication.html)
- MySQL 8.0 Reference Manual: Group Replication Technical Details - Consensus (https://dev.mysql.com/doc/refman/8.0/en/group-replication-summary.html)
- MySQL 8.0 Reference Manual: Group Replication Network Partitioning (https://dev.mysql.com/doc/refman/8.0/en/group-replication-network-partitioning.html)
- MySQL 8.0 Reference Manual: Group Replication Flow Control (https://dev.mysql.com/doc/refman/8.0/en/group-replication-flow-control.html)
- MySQL 8.0 Reference Manual: replication_group_members table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-members-table.html)
- MySQL 8.0 Reference Manual: replication_group_member_stats table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-group-member-stats-table.html)

## Issues Found

### 1. Consensus flow steps conflated ordering with conflict detection
**What was wrong:** Steps 3 and 4 of the transaction flow described members "voting" on conflicts and a quorum "agreeing" on certification. In reality, XCom/Paxos consensus is about agreeing on a total message delivery order (which requires a quorum). Certification (conflict detection) then happens independently and deterministically on each member — there is no voting on conflicts.

**What was changed:** Rewrote steps 3-4 to accurately describe that XCom uses Paxos to agree on total order, and each member then independently certifies the transaction. Also clarified that COMMIT returns success on the originating member.

### 2. Network partition minority behavior was inaccurate
**What was wrong:** The post stated the minority side "becomes read-only and reports MEMBER_STATE = ERROR." This is only true when `group_replication_unreachable_majority_timeout` is set to a positive value. By default (timeout = 0), the minority side blocks indefinitely waiting for the majority — it does not automatically transition to ERROR state.

**What was changed:** Clarified that the minority side cannot process transactions due to lacking a quorum, that ERROR state only occurs when the timeout is configured with a positive value, and that the default behavior is to block indefinitely.

## Review Notes
- The expansion "Extended Paxos Communication" for XCom is not officially documented by Oracle/MySQL. XCom is typically referred to simply as the group communication engine or Group Communication System (GCS). Various community sources use different expansions. This was not changed as it is not clearly wrong, but readers should be aware it is not an official name.
- The `group_replication_get_write_concurrency()` function is placed under the Single-Primary section, but it is not specific to single-primary mode — it controls the maximum number of consensus instances that can execute in parallel. Its placement is slightly misleading but not technically incorrect.
- All SQL queries, table names, column names, and variable names were verified as correct against MySQL 8.0 documentation.
- The quorum formula `floor((N/2) + 1)` is correct and the tolerance table values are accurate.

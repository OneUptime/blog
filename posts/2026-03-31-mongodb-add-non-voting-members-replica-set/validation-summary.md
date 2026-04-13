# Validation Summary: How to Add Non-Voting Members to a Replica Set in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- MongoDB non-voting members configuration (`votes`, `priority`)
- MongoDB shell (`mongosh`) commands (`rs.add`, `rs.conf`, `rs.reconfig`, `rs.status`)
- MongoDB Node.js driver (`MongoClient`, read preferences, read preference tags)
- MongoDB write concern (`w: N`, `w: "majority"`)

## Sources Consulted
- MongoDB documentation: Replica Set Members — Non-Voting Members (https://www.mongodb.com/docs/manual/core/replica-set-members/#non-voting-members)
- MongoDB documentation: Replica Set Configuration — `members[n].votes` (https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.members-n-.votes)
- MongoDB documentation: Replica Set Configuration — `members[n].priority` (https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.members-n-.priority)
- MongoDB documentation: Write Concern — `w: "majority"` (https://www.mongodb.com/docs/manual/reference/write-concern/#w-option)
- MongoDB documentation: `rs.add()` (https://www.mongodb.com/docs/manual/reference/method/rs.add/)
- MongoDB documentation: `rs.reconfig()` (https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/)

## Issues Found
- **Incorrect votes/priority constraint description (line 46):** The original text stated "a node cannot have votes without a non-zero priority, and vice versa (with exceptions for arbiters)." The "vice versa" implies that `priority: 0` requires `votes: 0`, which is incorrect. Hidden members commonly have `priority: 0` with `votes: 1`. The actual MongoDB constraint is one-directional: `votes: 0` requires `priority: 0`, but `priority: 0` does NOT require `votes: 0`. Fixed to clearly state the one-directional constraint and note the arbiter exception separately.

## Review Notes
- The code examples use arrow functions and `findIndex()`, which work in `mongosh` (MongoDB 5.0+) but not in the legacy `mongo` shell. Since `mongosh` is the current default shell, this is acceptable but worth noting for users on older versions.
- The 50-member limit and 7-voting-member limit are correct per current MongoDB documentation.
- The `w: "majority"` behavior (counting only data-bearing voting members) is accurately described.
- Numeric write concern (`w: N`) counting non-voting members is correctly stated.

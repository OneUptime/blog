# Validation Summary: How to Debug MongoDB Wire Protocol Issues

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- MongoDB (server, wire protocol, OP_MSG)
- MongoDB Node.js Driver (command monitoring API)
- PyMongo (monitoring.CommandListener)
- tcpdump (packet capture)
- Wireshark (MongoDB dissector)
- mongosniff (legacy MongoDB packet sniffer)
- mongod structured logging (logComponentVerbosity)

## Sources Consulted
- MongoDB Node.js Driver documentation — command monitoring: https://www.mongodb.com/docs/drivers/node/current/fundamentals/monitoring/command-monitoring/
- PyMongo documentation — monitoring module: https://pymongo.readthedocs.io/en/stable/api/pymongo/monitoring.html
- MongoDB manual — log messages and components: https://www.mongodb.com/docs/manual/reference/log-messages/
- MongoDB manual — setParameter / logComponentVerbosity: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.logComponentVerbosity
- Wireshark MongoDB dissector documentation: https://www.wireshark.org/docs/dfref/m/mongo.html
- MongoDB wire protocol specification: https://www.mongodb.com/docs/manual/reference/mongodb-wire-protocol/
- tcpdump man page for flag verification

## Issues Found
No technical issues found.

## Review Notes
- The claim about legacy opcodes being unsupported in "MongoDB 5.0+" is slightly imprecise. Legacy opcodes (OP_INSERT, OP_UPDATE, OP_DELETE, OP_KILL_CURSORS) were deprecated in MongoDB 5.0 and fully removed in MongoDB 6.0. The OP_QUERY opcode was retained only for the initial handshake. This is not materially incorrect for a debugging guide since 5.0 began the deprecation, but readers targeting exactly MongoDB 5.0 should be aware legacy opcodes still worked there.
- `mongosniff` was removed from MongoDB distributions some time ago. The post correctly notes it was "included with older MongoDB distributions," which is accurate. Users on modern MongoDB versions should rely on tcpdump + Wireshark instead.
- The "message length too long" error description cites the 16MB BSON document limit. In practice, this error can also relate to the wire protocol's `maxMessageSizeBytes` limit (48MB by default), which governs the total message size including batched operations. The 16MB explanation is the most common cause and reasonable for this context.

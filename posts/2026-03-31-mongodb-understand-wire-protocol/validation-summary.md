# Validation Summary: How to Understand the MongoDB Wire Protocol

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB wire protocol (OP_MSG)
- Python (socket, struct, bson/pymongo)
- tcpdump / Wireshark for packet capture
- BSON serialization format

## Sources Consulted
- MongoDB Wire Protocol specification: https://www.mongodb.com/docs/manual/reference/mongodb-wire-protocol/
- MongoDB OP_MSG specification: https://github.com/mongodb/specifications/blob/master/source/message/OP_MSG.md
- MongoDB Legacy Opcodes documentation: https://www.mongodb.com/docs/manual/legacy-opcodes/
- PyMongo bson module documentation: https://pymongo.readthedocs.io/en/stable/api/bson/index.html
- MongoDB 3.4 release notes (mongosniff removal): https://www.mongodb.com/docs/v7.1/release-notes/3.4-compatibility/

## Issues Found
1. **Incorrect timeline for exclusive OP_MSG usage**: The post stated "Modern MongoDB uses exclusively OP_MSG for all operations since MongoDB 3.6." While OP_MSG was introduced in 3.6, legacy opcodes (OP_QUERY, OP_INSERT, OP_UPDATE, etc.) were not removed until MongoDB 5.1, with the last OP_QUERY holdout for handshake commands removed in 6.0. Fixed to state that OP_MSG was introduced in 3.6 and became the exclusive format in 5.1+.

2. **Misleading code comment**: The comment said "Read 4-byte length prefix first" but the code actually reads the full 16-byte header. Fixed the comment to say "Read the 16-byte header."

3. **Recommending deprecated tool `mongosniff`**: The post recommended `mongosniff --source NET eth0` as a packet analysis tool. `mongosniff` was removed from MongoDB distributions in version 3.4. Removed the `mongosniff` reference and kept only the Wireshark recommendation, which is the current standard tool for MongoDB traffic analysis.

## Review Notes
- The Python code examples use `bson.encode()` from pymongo's bson module. Readers should be aware they need `pymongo` installed (`pip install pymongo`), not the standalone `bson` PyPI package which has a different API.
- The `read_message` function is a simplified example that doesn't handle OP_COMPRESSED (opCode 2012), which is commonly used alongside OP_MSG in production deployments.
- The tcpdump command uses `eth0` which is Linux-specific; macOS users would need a different interface name (e.g., `en0`).

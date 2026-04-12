# Validation Summary: How to Measure Wire Compression Savings in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server and wire protocol compression)
- mongosh (MongoDB Shell)
- mongostat (MongoDB database tools)
- PyMongo (Python MongoDB driver)
- Wire compression algorithms: Snappy, Zlib, Zstd

## Sources Consulted
- MongoDB `serverStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `getParameter` command reference: https://www.mongodb.com/docs/manual/reference/command/getParameter/
- MongoDB Network Compression (Node.js Driver): https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/network-compression/
- MongoDB `mongostat` documentation: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB Server source - `message_compressor_options_server.idl` (networkMessageCompressors parameter type)
- MongoDB Server source - `message_compressor_registry.cpp` (server-side `disabled` config value)
- MongoDB Java Driver source - `ConnectionString.java` (valid client compressor values)
- MongoDB Server source - `processinfo_linux.cpp` (`extra_info.user_time_us` platform availability)
- MongoDB Tools source - `stat_headers.go` (mongostat `-o` field names)

## Issues Found
1. **`compressors=disabled` is not a valid client connection string value (line 112):** The blog used `compressors=disabled` in a PyMongo connection URI to connect without compression. The value `disabled` is only valid for the server-side `--networkMessageCompressors` configuration option, not in client driver connection strings. MongoDB drivers (Java, Node.js, Python) reject unknown compressor values. Fixed by removing the `compressors` parameter entirely from the URI, since omitting it means no compression is negotiated. Added a clarifying comment.

2. **`extra_info.user_time_us` is Linux-only (line 125):** The blog referenced `extra_info.user_time_us` from `serverStatus` to measure CPU overhead without noting that this field is only populated on Linux (derived from POSIX `getrusage`). It is not available on macOS or Windows. Fixed by adding a parenthetical note about the platform limitation.

## Review Notes
- The `networkMessageCompressors` parameter is defined as a `String` type in the MongoDB server IDL, so the expected output showing it as a comma-separated string `'snappy,zstd,zlib'` is consistent with the source code.
- The `serverStatus` fields `network.bytesIn` and `network.bytesOut` are confirmed correct.
- The `mongostat` custom output fields (`net_in`, `net_out`, `query`, `insert`, `update`, `delete`) are all valid field names for the `-o` flag.
- The compression ratio ranges in the "Typical Compression Ratios" table are reasonable approximations. Actual ratios will vary by workload.
- The Python benchmark approach using `serverStatus` before/after is a valid methodology, though it measures total server network traffic (not just the benchmark client's traffic), which could include noise from other connections on a shared server. The blog doesn't explicitly call this out but it's an inherent limitation of the approach.

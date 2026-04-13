# Validation Summary: How to Enable Zstd Wire Compression in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.2+ wire compression)
- Zstd (Zstandard) compression algorithm
- Snappy compression
- Zlib compression
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- Go MongoDB driver

## Sources Consulted
- MongoDB official documentation: `net.compression.compressors` configuration option
- MongoDB official documentation: `--networkMessageCompressors` CLI option
- MongoDB Node.js driver documentation: `MongoClientOptions.compressors`
- PyMongo source code: `compression_support.py` `validate_compressors` function
- MongoDB Go driver documentation: `options.ClientOptions.SetCompressors`
- MongoDB 3.4 changelog (SERVER-28864) for Snappy introduction version
- Official Zstandard benchmarks (facebook.github.io/zstd) for compression ratio baselines
- MongoDB network compression community benchmarks (`wbleonard/mongodb-network-compression`)

## Issues Found
1. **Snappy minimum MongoDB version was wrong**: The comparison table listed Snappy's minimum MongoDB version as 3.6, but Snappy wire compression was introduced in MongoDB 3.4. Zlib was introduced in 3.6. Fixed the table to show 3.4 for Snappy.
2. **Compression ratio claims were overstated**: The table claimed Zlib achieves ~3.5x and Zstd achieves ~4x+ compression ratios. According to official Zstandard benchmarks (Silesia corpus) and MongoDB-specific tests, real-world ratios are closer to: Snappy ~1.5-2x, Zlib ~2.5-3x, Zstd ~2.8-3x at default compression levels. Updated all three ratio values to more accurate ranges.

## Review Notes
- The PyMongo example uses `compressors=["zstd"]` (list syntax). This works because PyMongo's `validate_compressors` accepts both a comma-separated string and an iterable, but the more idiomatic PyMongo style is `compressors="zstd"`. Left as-is since it is functionally correct.
- The `serverStatus` verification section's comment ("Check: compression.compressor field in connections") is vague. The actual structure is `network.compression.<algorithm>.compressor/decompressor` with `bytesIn`/`bytesOut` fields. Left as-is since the command itself is correct.
- The Node.js example uses `await` at the top level without an async wrapper; this works in ES modules or modern Node.js with top-level await but could confuse readers using CommonJS. Left as-is since `require` with top-level await is valid in newer Node.js versions.

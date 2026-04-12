# Validation Summary: New Features in MongoDB 6.0: Queryable Encryption, Change Streams

## Status
validated

## Post Type
Tutorial / Feature Overview

## Technologies Covered
- MongoDB 6.0 (and references to 7.0 and 8.0)
- Queryable Encryption (Client-Side Field Level Encryption)
- Change Stream Pre-Images
- Node.js MongoDB Driver
- mongodb-client-encryption package

## Sources Consulted
- MongoDB Queryable Encryption documentation: https://www.mongodb.com/docs/manual/core/queryable-encryption/
- MongoDB Queryable Encryption Quick Start: https://www.mongodb.com/docs/manual/core/queryable-encryption/quick-start/
- MongoDB 6.0 Release Notes and Queryable Encryption Preview announcement: https://www.mongodb.com/blog/post/mongodb-releases-queryable-encryption-preview
- MongoDB 7.0 Queryable Encryption GA announcement: https://www.mongodb.com/blog/post/mongodb-announces-queryable-encryption
- MongoDB 8.0 GA announcement (range queries): https://www.mongodb.com/press/mongo-db-announces-general-availability-of-mongo-db-8-0
- MongoDB changeStreamOptions cluster parameter docs: https://www.mongodb.com/docs/manual/reference/cluster-parameters/changestreamoptions/
- MongoDB Change Streams in 6.0 blog post: https://www.mongodb.com/company/blog/product-release-announcements/change-streams-mongodb-6-0-support-pre-post-image-retrieval-ddl-operations

## Issues Found

1. **Queryable Encryption was described as "generally available" in MongoDB 6.0** - It was actually a preview feature in 6.0. It became GA in MongoDB 7.0. Fixed the introduction to say "preview feature" with a note about GA in 7.0.

2. **Range queries shown as available in MongoDB 6.0** - The post described and demonstrated range queries on encrypted fields as a 6.0 feature. Range queries for Queryable Encryption did not become generally available until MongoDB 8.0. Only equality queries were supported in the 6.0 preview. Fixed by removing the range query from the encrypted fields map example, adding a comment noting range queries came in 8.0, and updating the introductory description and summary accordingly.

3. **Pre-image default expiration claimed to be 1 hour** - The post stated pre-images "automatically expired after 1 hour by default." The actual default behavior is that pre-images are retained until the corresponding change stream events are removed from the oplog (the `expireAfterSeconds` defaults to "off"). Fixed to describe the correct default retention behavior.

## Review Notes
- The `sparsity: 1` value in the removed range query example was technically valid (range 1-4) but non-default (default is 2). This is moot since the range example was removed.
- The local master key approach (`crypto.randomBytes(96)`) is correct for development but MongoDB recommends using a remote KMS provider (AWS KMS, Azure Key Vault, GCP KMS) in production. The post does not mention this caveat.
- The post says "Both features require MongoDB drivers version 6.0+" which is roughly correct, though specific minimum driver versions vary by language.
- The change stream section is accurate: `changeStreamPreAndPostImages`, `collMod`, and `fullDocumentBeforeChange: "whenAvailable"` all match official documentation.

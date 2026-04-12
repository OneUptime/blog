# Validation Summary: How to Migrate from MongoDB 5.0 to MongoDB 7.0

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB 5.0, 6.0, 7.0
- Feature Compatibility Version (FCV)
- mongodump / mongorestore
- MongoDB replica sets
- MongoDB aggregation framework ($percentile, $median)
- Compound wildcard indexes
- Ubuntu/Debian package management (apt)

## Sources Consulted
- MongoDB official documentation: setFeatureCompatibilityVersion command (https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/)
- MongoDB 7.0 release notes and upgrade procedures
- MongoDB 6.0 release notes
- Cross-referenced with other validated posts in this repo (mongodb-migrate-7x-to-8x, mongodb-how-to-check-mongodb-feature-compatibility-version, mongodb-how-to-migrate-from-mongodb-5x-to-6x)

## Issues Found
1. **`setFeatureCompatibilityVersion` missing `confirm: true` for MongoDB 7.0** (line 150): Starting with MongoDB 7.0, the `setFeatureCompatibilityVersion` command requires a mandatory `confirm: true` parameter. Without it, the command fails at runtime. Changed `db.adminCommand({ setFeatureCompatibilityVersion: "7.0" })` to `db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })`. The Phase 1 command setting FCV to "6.0" is correct as-is since `confirm` was only introduced in 7.0.

## Review Notes
- The upgrade path (5.0 -> 6.0 -> 7.0) is correctly described as requiring sequential major version upgrades.
- The rolling upgrade procedure (secondaries first, then step down primary) is the standard recommended approach.
- The driver compatibility table provides approximate minimum major versions; exact minimum patch versions could be more precise but are not incorrect.
- The backup and restore commands use correct flags and syntax.
- The GPG key import method using `/etc/apt/trusted.gpg.d/` is the modern recommended approach for Ubuntu 22.04+.
- The post correctly notes that clustered collections are a key 6.0 feature (first GA in a standard release).

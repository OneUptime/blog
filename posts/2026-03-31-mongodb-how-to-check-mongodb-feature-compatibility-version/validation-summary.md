# Validation Summary: How to Check MongoDB Feature Compatibility Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (versions 4.4 through 8.0)
- mongosh (MongoDB Shell)
- Feature Compatibility Version (FCV) administration
- Replica set and sharded cluster administration

## Sources Consulted
- MongoDB official documentation on Feature Compatibility Version: https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/
- MongoDB official documentation on getParameter: https://www.mongodb.com/docs/manual/reference/command/getParameter/
- MongoDB 7.0 release notes (confirm parameter addition): https://www.mongodb.com/docs/manual/release-notes/7.0/
- MongoDB upgrade procedures: https://www.mongodb.com/docs/manual/tutorial/upgrade-revision/

## Issues Found
- **Step 2 of upgrade process used `confirm: true` on a 6.0 binary**: The `confirm` parameter for `setFeatureCompatibilityVersion` was introduced in MongoDB 7.0 and is required in 7.0+. Step 2 describes a scenario where the binary is 6.0, so including `confirm: true` would cause an unrecognized parameter error. Fixed by removing `confirm: true` from the Step 2 command and adding a comment noting the parameter is only required on MongoDB 7.0+.

## Review Notes
- The post correctly notes that `confirm: true` is "required in MongoDB 7.0+" in the Setting the FCV section, but the upgrade step-by-step section was inconsistent with this guidance.
- All other code examples, commands, and technical explanations are accurate.
- The FCV valid values table is correct for the listed binary versions.
- The scripting example correctly uses `--quiet` to suppress shell output for script-friendly parsing.

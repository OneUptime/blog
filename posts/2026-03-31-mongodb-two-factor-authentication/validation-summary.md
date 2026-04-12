# Validation Summary: How to Implement Two-Factor Authentication with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (via Mongoose ODM)
- Node.js
- speakeasy (TOTP generation and verification)
- qrcode (QR code generation)
- bcrypt (password and backup code hashing)
- crypto (Node.js built-in, for generating random backup codes)

## Sources Consulted
- speakeasy npm package documentation: https://www.npmjs.com/package/speakeasy
- speakeasy GitHub README: https://github.com/speakeasyjs/speakeasy
- qrcode npm package documentation: https://www.npmjs.com/package/qrcode
- Mongoose schema documentation: https://mongoosejs.com/docs/guide.html
- Mongoose queries documentation (select): https://mongoosejs.com/docs/queries.html
- Mongoose Model API (findByIdAndUpdate): https://mongoosejs.com/docs/api/model.html

## Issues Found
1. **Missing `backupCodes` field in User schema**: The `generateBackupCodes` function stores hashed backup codes via `User.findByIdAndUpdate(userId, { backupCodes: hashed })`, but the User schema did not define a `backupCodes` field. With Mongoose's default `strict: true` mode, this update would be silently ignored and no backup codes would be persisted. Fixed by adding `backupCodes: { type: [String], select: false }` to the schema definition.

## Review Notes
- The `speakeasy` package has not been actively maintained since 2016. While it still functions correctly, projects with strict maintenance requirements may want to consider alternatives such as `otplib`.
- The `window: 1` parameter in `speakeasy.totp.verify` allows 1 time-step period of drift in each direction (roughly +/- 30 seconds with the default 30-second step). This is a reasonable default for most applications.
- The post correctly advises verifying a TOTP token before activating 2FA and hashing backup codes before storage.
- The backup codes section mentions "invalidate them after use" in the summary but does not show the implementation for consuming/invalidating a backup code. This is not an error but a gap readers should be aware of.

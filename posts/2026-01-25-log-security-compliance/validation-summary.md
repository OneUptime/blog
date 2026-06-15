# Validation Summary: How to Configure Log Security and Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Node.js crypto module
- Node.js TLS configuration
- AWS KMS
- AWS SDK for JavaScript v3
- Log redaction and PII handling
- Role-based access control
- Audit logging
- GDPR, HIPAA, and SOC 2 control mapping

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- AWS KMS GenerateDataKey API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- AWS SDK for JavaScript v3 KMS documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kms/
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- TypeScript Handbook, private class members: https://www.typescriptlang.org/docs/handbook/classes.html
- HIPAA Security Rule technical safeguards, 45 CFR 164.312: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312
- GDPR Article 25, data protection by design and by default: https://gdpr-info.eu/art-25-gdpr/
- GDPR Article 5, storage limitation principle: https://gdpr-info.eu/art-5-gdpr/
- European Data Protection Board Guidelines 4/2019 on Article 25: https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_201904_dataprotection_by_design_and_by_default_v2.0_en.pdf
- AICPA 2017 Trust Services Criteria with revised points of focus, 2022: https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022

## Issues Found
- `LogRedactor.redactString` was declared `private` but was called from `redactionMiddleware` outside the class. Changed it to a public method so the TypeScript example is valid.
- The redaction example skipped arrays, so sensitive strings inside array values would not be redacted. Added recursive array handling for strings and nested objects.
- The encryption example used the AWS SDK for JavaScript v2 style `AWS.KMS` client. AWS SDK v2 reached end of support on September 8, 2025, so the snippet was updated to use AWS SDK for JavaScript v3 KMS commands.
- The KMS data-key example generated or cached a plaintext data key and generated a new key during decrypt, which would not decrypt previously encrypted logs after cache loss or process restart. Updated the example to use envelope encryption: store `_encryptedDataKey` with each log entry and decrypt that data key with KMS before decrypting the log.
- The AES-GCM example accepted an arbitrary algorithm string even though it called GCM-specific authentication tag APIs. Restricted the configuration to `'aes-256-gcm'`.
- The encryption snippet referenced `fs.readFileSync` without importing `fs`. Added the missing import.
- The RBAC example exposed `accessController.policies.size` in the compliance check while `policies` was declared `private`. Made the policy map public read-only for the example.
- The developer team policy used the string literal `${user.team}` but never resolved it against the current user, so it would not match real log entries. Added placeholder resolution for `${user.*}` filter values.
- Glob resource matching converted strings directly to regular expressions without escaping regex metacharacters. Escaped non-glob metacharacters so `security.*` behaves as a glob pattern with a literal dot.
- The audit query wrapper calculated `startTime` but did not use it. Added `duration_ms` to success and failure audit metadata.
- The retention check claimed policies over one year fail GDPR storage limitation. GDPR does not define a universal one-year maximum, so the check now verifies that a positive retention period is configured.
- Corrected "Personal Identifiable Information" to "Personally Identifiable Information."
- Updated SOC 2 requirement labels to avoid inaccurate claims that specific CC references are exclusively encryption-at-rest or encryption-in-transit requirements.

## Review Notes
The post is technically useful as an illustrative guide, but the snippets still depend on application-specific types such as `Logger`, `LogEntry`, `EncryptedLogEntry`, `User`, and `AuditLogger`. Those omissions are acceptable for a blog post, but readers would need to define those types in a real implementation. The PII detection regexes are examples, not comprehensive validators, and production systems should combine redaction with schema-based field controls and tested secret-detection libraries.

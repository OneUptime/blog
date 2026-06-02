# Validation Summary: How to Set Up CloudFront Field-Level Encryption

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon CloudFront field-level encryption
- AWS CLI
- OpenSSL
- AWS Secrets Manager
- AWS Encryption SDK for Python
- Python
- Lambda

## Sources Consulted
- Amazon CloudFront Developer Guide: Use field-level encryption to help protect sensitive data: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html
- Amazon CloudFront Developer Guide: Quotas on field-level encryption: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-field-level-encryption
- AWS CLI Command Reference: create-field-level-encryption-config: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-field-level-encryption-config.html
- AWS CLI Command Reference: create-field-level-encryption-profile: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-field-level-encryption-profile.html
- AWS Encryption SDK Python examples: raw RSA keyring example: https://github.com/aws/aws-encryption-sdk-python/blob/master/examples/src/raw_rsa_keyring_example.py

## Issues Found
- The public key upload examples embedded a PEM file directly with literal newlines, which would produce invalid JSON for the AWS CLI. Updated the commands to escape PEM newlines before placing the key in `EncodedKey`.
- The field-level encryption configuration example used `QueryArgProfiles` as the top-level field and included an extra `Config` wrapper. Updated it to the documented `QueryArgProfileConfig` structure.
- The distribution cache behavior example allowed only `GET`, `HEAD`, and `POST`; CloudFront field-level encryption requires the cache behavior to accept all seven HTTP methods when configured through the API or CloudFormation. Updated `AllowedMethods` accordingly.
- The decryption example treated the encrypted value as a raw RSA-OAEP ciphertext and described a JSON envelope. CloudFront field-level encryption produces a base64-encoded AWS Encryption SDK message. Replaced the example with an AWS Encryption SDK raw RSA keyring decryption pattern using the configured provider ID and public key name.
- Added the documented prerequisite that the origin must support chunked encoding.

## Review Notes
The post is now technically aligned with the current CloudFront field-level encryption documentation. Future improvements could mention additional quotas such as the 16 KB maximum encrypted field length and 1 MB request body limit, but the existing quota list is not incorrect.

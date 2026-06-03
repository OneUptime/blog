# Validation Summary: How to Set Up CloudFront Signed URLs and Cookies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon CloudFront signed URLs
- Amazon CloudFront signed cookies
- CloudFront public keys and key groups
- AWS CLI for CloudFront
- Node.js crypto signing
- Python botocore CloudFrontSigner
- Express cookie handling
- OpenSSL RSA key generation

## Sources Consulted
- Amazon CloudFront Developer Guide: Specify signers that can create signed URLs and signed cookies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html
- Amazon CloudFront API Reference: CacheBehavior - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehavior.html
- AWS CLI Command Reference: create-public-key - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-public-key.html
- AWS CLI Command Reference: create-key-group - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-key-group.html
- AWS SDK for JavaScript v3: @aws-sdk/cloudfront-signer - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-cloudfront-signer/
- Amazon CloudFront Developer Guide: Use signed URLs - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html
- Amazon CloudFront Developer Guide: Set signed cookies using a custom policy - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html
- botocore CloudFrontSigner source - https://github.com/boto/botocore/blob/develop/botocore/signers.py

## Issues Found
- The introduction said each signed URL grants access to a single resource. That is true for canned-policy signed URLs, but custom-policy signed URLs can use wildcards. Updated the wording to distinguish canned-policy and custom-policy signed URLs.
- The `create-public-key` command embedded the PEM file directly into a JSON string. PEM newlines would make the JSON invalid. Changed the command to build valid JSON with `jq` and pass the PEM as the `EncodedKey` value.
- The cache behavior example used plain arrays for `AllowedMethods` and `CachedMethods`. CloudFront's API expects `AllowedMethods` to be an object containing `Quantity`, `Items`, and a nested `CachedMethods` object. Updated the JSON to match the CloudFront API shape.
- The `update-distribution` example could imply that a single cache behavior snippet is enough. Added a note that `update-distribution` requires the full distribution configuration.
- The Python signed-cookie example called a nonexistent `build_custom_policy` method and did not generate signed cookie values. Replaced it with `CloudFrontSigner.build_policy`, URL-safe base64 encoding, signature generation, and a dictionary containing the three required cookie names.
- The signed-cookie examples used a `cloudfront.net` resource URL while setting cookies for `.example.com`. Browsers will not send `.example.com` cookies to a `cloudfront.net` host. Updated the signed-cookie resource URL to `https://cdn.example.com/premium/*`, matching the `.example.com` cookie domain pattern when CloudFront is configured with that alternate domain name.

## Review Notes
The examples intentionally use SHA-1 signing, which remains compatible because CloudFront defaults signed URL and signed cookie validation to SHA1 when no `CloudFront-Hash-Algorithm` cookie is supplied. CloudFront also documents SHA256 support for signed cookies, but the post's SHA-1 examples are still technically valid.

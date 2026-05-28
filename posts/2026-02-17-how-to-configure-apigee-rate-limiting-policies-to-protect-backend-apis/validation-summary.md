# Validation Summary: How to Configure Apigee Rate Limiting Policies to Protect Backend APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Apigee
- Apigee Quota policy
- Apigee SpikeArrest policy
- Apigee VerifyAPIKey policy flow variables
- Apigee AssignMessage policy
- XML API proxy configuration
- curl command-line testing

## Sources Consulted
- Google Cloud Apigee Quota policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/quota-policy
- Google Cloud Apigee SpikeArrest policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/spike-arrest-policy
- Google Cloud Apigee Verify API Key policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/verify-api-key-policy
- Google Cloud Apigee AssignMessage policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/assign-message-policy
- Google Cloud Apigee flow variables reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/variables-reference
- Google Cloud Apigee fault handling documentation: https://docs.cloud.google.com/apigee/docs/api-platform/fundamentals/fault-handling
- curl command documentation: https://curl.se/docs/manpage.html

## Issues Found
- The Quota examples used `client_id` directly as the identifier after VerifyAPIKey. Google Cloud's Apigee documentation identifies the verified API key client ID as `verifyapikey.{policy_name}.client_id`, so the examples now use `verifyapikey.VerifyAPIKey.client_id`.
- The dynamic ProductQuota example used nested `<Allow>`, `<Interval>`, and `<TimeUnit>` fallback elements that do not match the documented Quota policy syntax. The example now uses documented fallback syntax: literal values on the element with `countRef` or `ref` attributes.
- The SpikeArrest policy included `<Identifier ref="client_id"/>` even though the combined flow runs SpikeArrest before VerifyAPIKey. Because no authenticated client ID exists at that point, the example now omits the identifier and correctly applies the SpikeArrest rate globally.
- Several snippets placed an XML declaration after a filename comment. XML declarations must be the first item in an XML document, so those declarations were removed from the snippets.
- The custom AssignMessage error-response policies did not explicitly assign changes to the response message. Added `<AssignTo createNew="false" transport="http" type="response"/>`, matching the documented pattern for modifying response messages.

## Review Notes
The post's high-level distinction between Quota and SpikeArrest is consistent with Google Cloud Apigee documentation. SpikeArrest smoothing behavior is correct for the default smoothing algorithm, but teams using distributed/hybrid Apigee deployments should also review the `UseEffectiveCount` option and message processor behavior before choosing production limits.

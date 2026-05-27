# Validation Summary: How to Use Apigee Key Value Maps for Dynamic Configuration in API Proxies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apigee
- Google Cloud Apigee Management API
- Apigee Key Value Maps
- Apigee KeyValueMapOperations policy
- Apigee ServiceCallout policy
- Apigee AssignMessage policy
- Apigee SpikeArrest policy
- XML
- curl

## Sources Consulted
- Google Cloud Apigee KeyValueMapOperations policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/key-value-map-operations-policy
- Google Cloud Apigee environment-scoped key value maps API: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps
- Google Cloud Apigee key value map entries API: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/create
- Google Cloud Apigee REST API resource overview: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest
- Google Cloud Apigee ServiceCallout policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/service-callout-policy
- Google Cloud Apigee AssignMessage policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/assign-message-policy
- Google Cloud Apigee SpikeArrest policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/spike-arrest-policy

## Issues Found
- The ServiceCallout example used a KVM value containing the full URL, including the protocol, as the entire `<URL>` value. Apigee ServiceCallout supports variable substitution in URLs, but the protocol portion cannot be supplied by a variable. I changed the stored KVM value to the host/path portion and kept `https://` literal in the policy.
- The SpikeArrest fallback example nested a second `<Rate>` element inside `<Rate>`, which is invalid for the policy. I changed it to `<Rate ref="config.spike.arrest.rate">30ps</Rate>`, which matches the documented fallback form.
- Several XML snippets placed an XML declaration after a leading XML comment containing the file path. XML declarations must appear at the start of an XML document, so I removed those declarations from the snippets.
- The summary said KVM updates take effect immediately. Apigee caches KVM `GET` results and API/UI updates do not reset that cache, so I changed the wording to say updates take effect after the KVM cache refreshes.
- The best practices did not mention the KVM cache refresh interval. I added a note to use `<ExpiryTimeInSecs>` to control how frequently Apigee refreshes cached KVM values.

## Review Notes
Apigee X and hybrid encrypt KVMs by default; the Management API still retains the `encrypted` field for backward compatibility and returns it as `true`. For sensitive values read with KeyValueMapOperations, future revisions could also mention the `private.` variable prefix to keep decrypted values out of Debug sessions.

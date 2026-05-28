# Validation Summary: How to Debug Apigee Proxy Runtime Errors Using the Trace Tool

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Apigee Debug / Trace tool
- Apigee API proxy runtime flows
- Apigee debug sessions REST API
- Apigee flow variables and conditions
- Apigee JavaScript policy
- Apigee ServiceCallout policy
- curl and Google Cloud OAuth access tokens

## Sources Consulted
- Google Cloud Apigee: Using Debug - https://docs.cloud.google.com/apigee/docs/api-platform/debug/trace
- Google Cloud Apigee REST API: DebugSession resource - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.apis.revisions.debugsessions
- Google Cloud Apigee REST API: Create debug session - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.apis.revisions.debugsessions/create
- Google Cloud Apigee REST API: Get debug session transaction data - https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.apis.revisions.debugsessions.data/get
- Google Cloud Apigee: Conditions reference - https://docs.cloud.google.com/apigee/docs/api-platform/reference/conditions-reference
- Google Cloud Apigee: Flow variables reference - https://docs.cloud.google.com/apigee/docs/api-platform/reference/variables-reference
- Google Cloud Apigee: JavaScript policy - https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/javascript-policy
- Google Cloud Apigee: ServiceCallout policy - https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/service-callout-policy

## Issues Found
- The console navigation path used `Develop > API Proxies`, but current Google Cloud Apigee documentation uses `Proxy development > API Proxies`. Updated the path.
- The debug session examples used numeric `timeout` values. The current REST API documents `timeout` as an int64 string, so the JSON examples now use string values such as `"300"`.
- The 500 error section stated that a 500 usually means the proxy failed rather than the backend. This was too broad because ServiceCallout errors, backend responses, and proxy faults can all result in 500-class behavior. Updated the wording to say tracing distinguishes the source.
- The filtering section was labeled as filtering by query parameter but used `proxy.pathsuffix`, which filters by path suffix. Updated the heading and comment.
- The ServiceCallout variables used `servicecallout.POLICY_NAME.response.*`, which is not the documented response variable pattern. Updated the examples to use the response message variable named in the policy's `<Response>` element, while keeping `servicecallout.POLICY_NAME.target.url` and `servicecallout.POLICY_NAME.failed`.
- The download example implied that `/debugsessions/SESSION_ID/data` downloads all trace data. The Apigee API returns transaction IDs at that endpoint; transaction data is retrieved from `/debugsessions/SESSION_ID/data/TRANSACTION_ID`. Updated the commands accordingly.

## Review Notes
The post remains technically valid after the corrections. The current Google Cloud documentation now consistently names the product UI feature "Debug"; "Trace" still appears in historical wording and common usage, but future edits could consider using "Debug tool" more prominently.

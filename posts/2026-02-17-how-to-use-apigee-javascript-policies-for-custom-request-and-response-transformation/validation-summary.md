# Validation Summary: How to Use Apigee JavaScript Policies for Custom Request

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apigee API proxies
- Apigee JavaScript policy
- Apigee JavaScript object model
- Apigee RaiseFault policy
- Apigee ServiceCallout response variables
- JavaScript
- XML policy configuration

## Sources Consulted
- Google Cloud Apigee JavaScript policy documentation: https://cloud.google.com/apigee/docs/api-platform/reference/policies/javascript-policy
- Google Cloud Apigee JavaScript object model documentation: https://cloud.google.com/apigee/docs/api-platform/reference/javascript-object-model
- Google Cloud Apigee Flow variables reference: https://cloud.google.com/apigee/docs/api-platform/reference/variables-reference
- Google Cloud Apigee RaiseFault policy documentation: https://cloud.google.com/apigee/docs/api-platform/reference/policies/raise-fault-policy
- Google Cloud Apigee ServiceCallout policy documentation: https://cloud.google.com/apigee/docs/api-platform/reference/policies/service-callout-policy

## Issues Found
- XML policy snippets placed a filename comment before the XML declaration. XML declarations must appear at the start of the document, so the snippets were changed to put the declaration first.
- The phone normalization example claimed to keep only digits and a leading plus sign, but the regular expression preserved plus signs anywhere in the string. The example now preserves only an original leading plus and strips all other non-digits.
- The phone normalization example used `startsWith()`. It was replaced with `charAt(0)` to avoid relying on newer JavaScript features in Apigee's Rhino-based JavaScript runtime.
- The ServiceCallout aggregation example used ambiguous response variable names. It now uses `userResponse.content`, `ordersResponse.content`, and `prefsResponse.content`, matching Apigee's documented pattern where the prefix is the ServiceCallout `<Response>` variable name.
- References to the Apigee Trace tool were updated to the current Debug tool wording used in Google Cloud Apigee documentation.

## Review Notes
The remaining examples are illustrative and assume the policies are attached in the appropriate request or response flow where the referenced request, response, and ServiceCallout variables are in scope. The JavaScript policy is an Extensible policy in Apigee and may have license or usage implications depending on the Apigee environment.

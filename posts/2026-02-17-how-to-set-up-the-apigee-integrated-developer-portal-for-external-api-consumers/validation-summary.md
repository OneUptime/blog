# Validation Summary: How to Set Up the Apigee Integrated Developer Portal for External API Consumers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apigee integrated developer portal
- Google Cloud Console
- Apigee REST API
- OpenAPI 3.0
- SmartDocs / Try this API
- Apigee CORS policy
- Google Cloud Load Balancing and DNS for custom portal domains
- `curl`, `gcloud`, `dig`

## Sources Consulted
- Google Cloud Apigee: Managing your portals: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/manage-portals
- Google Cloud Apigee: Publishing your APIs: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/publish-apis
- Google Cloud Apigee REST: organizations.sites.apidocs: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.sites.apidocs
- Google Cloud Apigee: Customizing your theme: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/api-portal-themes
- Google Cloud Apigee: Managing pages in your portal: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/portal-pages
- Google Cloud Apigee: Configuring account creation and sign-in: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/configure-register-sign-in
- Google Cloud Apigee: Customizing your domain: https://docs.cloud.google.com/apigee/docs/api-platform/publish/portal/custom-domain
- Google Cloud Apigee: CORS policy reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/cors-policy
- Google Cloud Apigee: Adding CORS support to an API proxy: https://docs.cloud.google.com/apigee/docs/api-platform/develop/adding-cors-support-api-proxy
- Google Cloud Apigee REST: environments stats API: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.stats/get
- Google Cloud Apigee: Metrics API examples: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/analytics-command-reference

## Issues Found
- The post showed an unsupported `POST /v1/organizations/YOUR_ORG/sites` API call for creating a portal. Current Google Cloud Apigee documentation describes portal creation through the Distribution > Portals UI, so the API example was removed and replaced with the documented console flow.
- The console path was outdated or inaccurate in several places. Updated portal navigation to use Distribution > Portals.
- API documentation examples used the display portal name in the `sites/{site}` path. Current docs use the generated site ID, so examples now use `SITE_ID` and explain the generated ID format.
- The OpenAPI documentation upload example used `PUT` and omitted `displayName`. Current Apigee documentation uses `PATCH` for `updateDocumentation`, with `oasDocumentation.spec.displayName` and base64 `contents`, so the example was corrected.
- The OpenAPI example had an incorrect Markdown code-fence close of ```` ```text ```` inside the description. Changed it to a plain closing fence.
- The theme, custom page, and custom registration field sections included undocumented REST endpoints and fields. Replaced them with the documented console workflows.
- The custom registration field section did not mention the documented limit of three custom fields. Added that limit.
- The CORS example used an `AssignMessage` policy instead of the current Apigee `CORS` policy, and its file comment appeared before the XML declaration. Replaced it with a valid `CORS` policy snippet, kept the XML declaration first, and added the documented note about skipping API key verification for `OPTIONS` preflight requests.
- The custom domain setup described a CNAME and automatic Let's Encrypt provisioning. Current Apigee documentation for Apigee integrated portals uses a TLS certificate, Internet NEG, external Application Load Balancer, and DNS A record, so the steps and verification command were corrected.

## Review Notes
The analytics and developer/app listing examples are technically plausible, but access depends on the caller's IAM permissions and Apigee organization configuration. The OpenAPI spec is illustrative and still assumes the backend actually enforces the documented API-key and rate-limit behavior.

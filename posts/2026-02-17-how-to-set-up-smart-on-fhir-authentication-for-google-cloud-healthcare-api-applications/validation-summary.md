# Validation Summary: Set Up SMART on FHIR Authentication for Google Cloud Healthcare API Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Healthcare API
- FHIR R4
- SMART on FHIR / SMART App Launch
- OAuth 2.0 / OpenID Connect
- Google Cloud IAM
- Node.js / Express
- Python requests

## Sources Consulted
- Google Cloud Healthcare API SMART on FHIR documentation: https://docs.cloud.google.com/healthcare-api/docs/smart-on-fhir
- Google Cloud Healthcare API FHIR consent and access control documentation: https://docs.cloud.google.com/healthcare-api/docs/fhir-consent
- Google Cloud Healthcare API IAM roles documentation: https://docs.cloud.google.com/healthcare-api/docs/access-control
- Google Cloud Healthcare API FHIR profile validation documentation: https://cloud.google.com/healthcare-api/docs/how-tos/fhir-profiles
- HL7 SMART App Launch implementation guide: https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html
- GoogleCloudPlatform SMART on FHIR / SMARTProxy repository: https://github.com/GoogleCloudPlatform/smart-on-fhir

## Issues Found
- The post said Google Cloud Healthcare API supports SMART on FHIR "out of the box" in a way that implied it mints SMART OAuth tokens directly. Updated the wording to clarify that the Healthcare API provides SMART access enforcement, while the authorization server runs outside the Healthcare API.
- The FHIR store configuration step used `validationConfig.enabledImplementationGuides` with `http://hl7.org/fhir/smart-app-launch` as if that enabled SMART access control. That field is for FHIR profile / ImplementationGuide validation, not SMART authorization enforcement. Replaced the step with proxy and service account setup, and clarified that no FHIR store update is required for SMART on FHIR access.
- The OAuth setup section described Google Cloud OAuth consent screen and Google OAuth endpoints as the SMART authorization server. Updated it to describe registering a client with an external SMART authorization server.
- The SMART discovery and CapabilityStatement examples pointed to Google OAuth endpoints. Replaced them with placeholder SMART authorization server endpoints so the example matches the supported architecture.
- The Python client used the direct Cloud Healthcare API FHIR base URL and Google OAuth token endpoint. Updated it to use the proxy FHIR base URL, discover the SMART authorization and token endpoints from `.well-known/smart-configuration`, and use returned patient context when available.
- The server-side enforcement example suggested that a simple Express middleware should enforce SMART resource scopes itself. Updated it to show the proxy forwarding `X-Authorization-Scope`, `X-Authorization-Patient`, `X-Authorization-Subject`, and `X-Authorization-Issuer` headers after token validation, leaving resource-level enforcement to Cloud Healthcare API.

## Review Notes
The examples remain illustrative and omit production concerns such as full JWT validation, PKCE implementation details for public clients, CSRF-safe state validation, HTTPS-only redirect URIs outside local development, and complete proxy deployment configuration. These are acceptable for the current post scope but should be expanded in a production-hardening follow-up.

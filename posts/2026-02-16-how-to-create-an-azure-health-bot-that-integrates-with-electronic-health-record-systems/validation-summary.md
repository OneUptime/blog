# Validation Summary: How to Create an Azure Health Bot That Integrates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Health Bot / Microsoft Healthcare agent service
- Azure Health Data Services FHIR service
- HL7 FHIR R4
- SMART on FHIR
- OAuth 2.0 and Microsoft Entra ID
- Bot Framework Web Chat / Direct Line
- Microsoft Teams channel
- Azure Monitor and Application Insights

## Sources Consulted
- Microsoft Learn: Healthcare agent service overview: https://learn.microsoft.com/en-us/azure/health-bot/overview
- Microsoft Learn: Create your first healthcare agent service: https://learn.microsoft.com/en-us/azure/health-bot/quickstart-createyourhealthcarebot
- Microsoft Learn: Healthcare agent service pricing details: https://learn.microsoft.com/en-us/azure/health-bot/pricing-details
- Microsoft Learn: Healthcare agent service data connections: https://learn.microsoft.com/en-us/azure/health-bot/data_connection
- Microsoft Learn: Healthcare agent service advanced scenario elements: https://learn.microsoft.com/en-us/azure/health-bot/scenario-authoring/advanced_functionality
- Microsoft Learn: Healthcare agent service authentication providers: https://learn.microsoft.com/en-us/azure/health-bot/authentication_providers
- Microsoft Learn: Programmatic client-side scenario invocation: https://learn.microsoft.com/en-us/azure/health-bot/integrations/programmatic_invocation
- Microsoft Learn: Direct Line channel in Healthcare agent service: https://learn.microsoft.com/en-us/azure/health-bot/channels/directline
- Microsoft Learn: Conversation logs: https://learn.microsoft.com/en-us/azure/health-bot/conversation_logs
- Microsoft Learn: Handoff in Healthcare agent service: https://learn.microsoft.com/en-us/azure/health-bot/handoff
- Microsoft Learn: Azure Health Data Services FHIR service overview: https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/overview
- Microsoft Learn: Authentication and authorization for Azure Health Data Services: https://learn.microsoft.com/en-us/azure/healthcare-apis/authentication-authorization
- HL7 FHIR R4: Appointment resource and search parameters: https://hl7.org/fhir/r4/appointment.html
- HL7 FHIR R4: MedicationRequest resource and search parameters: https://hl7.org/fhir/r4/medicationrequest.html
- HL7 FHIR US Core MedicationRequest profile: https://hl7.org/fhir/us/core/STU6/StructureDefinition-us-core-medicationrequest.html
- HL7 FHIR R4: Observation resource and search parameters: https://hl7.org/fhir/r4/observation.html
- HL7 FHIR R4: Search: https://hl7.org/fhir/R4/search.html

## Issues Found
- The Azure portal service name and pricing tier guidance were outdated. Updated creation guidance to search for "Healthcare agent service" and replaced the deprecated S1 production recommendation with Agent Tier (C1), while keeping Free (F0) for development.
- The management portal URL was hard-coded to the US portal. Replaced it with guidance to open the management portal from the Azure resource so the post does not imply one regional URL works for every deployment.
- The FHIR data connection setup used an imprecise type name and mixed data connection fields with authentication-provider fields. Updated the connection type to "FHIR Endpoint" and moved OAuth client credentials settings under an authentication provider.
- The SMART on FHIR section implied a Health Bot-specific SMART launch flow. Updated it to use an end-user OAuth 2.0 authentication provider configured with the EHR's SMART authorization and token endpoints.
- Health Bot scenario Action snippets used modern JavaScript features such as optional chaining, arrow functions, and `Array.find`, but Healthcare agent service Action code is documented as JavaScript ES5. Rewrote the appointment, medication, and lab-result formatting examples in ES5-compatible JavaScript.
- The identity verification snippet used `await fhirSearch(...)` in scenario code, but Action steps should use Data Connection objects for API calls and do not support arbitrary asynchronous API requests in the way shown. Replaced it with code that handles a Patient search response from a prior data connection step.
- The MedicationRequest query omitted `intent`, which is required in common US Core medication-list searches. Added `intent=order,plan` to the active medication query.
- The portal integration snippet used non-documented config fields for passing patient context. Replaced it with the documented `triggeredScenario` pattern and scenario arguments.
- The Web Chat section did not explicitly warn against exposing Direct Line or Health Bot secrets in the browser. Added a note to generate Direct Line tokens server-side and pass only short-lived tokens to client code.
- The audit logging section said to export conversation logs to Azure Monitor directly. Adjusted it to use built-in conversation log export and Application Insights custom telemetry for centralized Azure Monitor analysis.

## Review Notes
The post still uses "Azure Health Bot" in the title and narrative because that term remains recognizable and appears in older Microsoft materials, but current Microsoft Learn documentation primarily refers to the product as "Healthcare agent service." Future revisions could update the title and terminology throughout for consistency.

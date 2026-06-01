# Validation Summary: How to Configure Phone Number Provisioning and Call Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Communication Services
- Azure Communication Services Phone Numbers SDK for Python
- Azure Communication Services Call Automation SDK for Python
- Azure CLI
- Azure Event Grid
- Azure Monitor diagnostic settings
- Azure Log Analytics and Kusto Query Language
- Flask

## Sources Consulted
- Azure CLI `az communication` reference: https://learn.microsoft.com/en-us/cli/azure/communication
- Azure CLI `az eventgrid event-subscription create` reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Azure CLI `az monitor diagnostic-settings create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure Communication Services Phone Numbers Python API reference: https://learn.microsoft.com/en-us/python/api/azure-communication-phonenumbers
- Azure Communication Services Call Automation Python API reference: https://learn.microsoft.com/en-us/python/api/azure-communication-callautomation
- Azure Event Grid event schema for Azure Communication Services: https://learn.microsoft.com/en-us/azure/event-grid/communication-services-voice-video-events
- Azure Communication Services voice and video call logs: https://learn.microsoft.com/en-us/azure/communication-services/concepts/analytics/logs/voice-and-video-logs
- Azure Communication Services pricing: https://azure.microsoft.com/pricing/details/communication-services/

## Issues Found
- The ACS resource creation snippet used `unitedstates` as the resource location. Changed it to `Global` and kept data residency as `United States`, matching the Azure Communication Services resource model and Azure CLI examples.
- The shell snippet assigned the connection string to `ACS_CONNECTION`, while all Python examples read `ACS_CONNECTION_STRING`. Changed the shell snippet to export `ACS_CONNECTION_STRING`.
- The prerequisites mentioned Node.js even though the article only includes Python SDK examples. Removed the Node.js requirement.
- The inbound call handler imported unused Call Automation classes and used `FileSource` without importing it. Updated the imports and made caller extraction tolerate both phone-number and raw identifier shapes.
- The media playback examples used `play_media` without a target participant. Updated them to `play_media_to_all`, which matches the current Python Call Automation API for playing media to all participants.
- The outbound call example used `CallInvite` as `target_participant`. Updated it to pass `PhoneNumberIdentifier` as the target and `source_caller_id_number` separately, matching the current `create_call` signature.
- The IVR example referenced an undefined `caller_number`. Updated the function signatures so the caller phone number is passed into recognition and replay flows.
- The diagnostic settings command used unsupported log category names and passed a workspace name where the CLI expects a workspace resource ID. Updated it to resolve the Log Analytics workspace ID and enable the `allLogs` category group.
- The Log Analytics query counted rows in `ACSCallSummary`, which can overcount calls because the table can contain participant-level records. Updated the query to aggregate by `CorrelationId` before summarizing.
- The US toll-free pricing example used an outdated inbound rate. Updated the example to reflect the current published inbound toll-free rate and clarified that outbound rates vary by destination.
- The high-level call routing description implied built-in queue routing. Reworded it to describe routing incoming call events to applications that answer, transfer, or redirect calls.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI verification was performed against official Microsoft Learn command references rather than local `az --help` output. Python code blocks were syntax-checked locally with `ast.parse`, but the Azure SDK packages were not installed and no live ACS resource was available for runtime testing.

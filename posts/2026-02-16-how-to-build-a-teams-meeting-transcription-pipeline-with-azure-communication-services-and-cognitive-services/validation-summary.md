# Validation Summary: How to Build a Teams Meeting Transcription Pipeline with Azure Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Teams
- Azure Communication Services
- Azure Communication Services Call Automation and Call Recording
- Azure Event Grid
- Azure Functions
- Azure Blob Storage
- Azure AI Speech batch transcription
- Azure Cosmos DB
- Azure Cognitive Search / Azure AI Search
- C# / .NET
- Azure CLI

## Sources Consulted
- Azure Communication Services resource creation: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/create-communication-resource
- Azure Communication Services Teams meeting interoperability: https://learn.microsoft.com/en-us/azure/communication-services/concepts/join-teams-meeting
- Azure Communication Services Call Recording overview: https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/call-recording
- Azure Communication Services Call Recording quickstart: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/voice-video-calling/get-started-call-recording
- Azure Communication Services Call Recording REST API: https://learn.microsoft.com/en-us/rest/api/communication/callautomation/call-recording/start-recording
- Azure SDK for .NET StartRecordingOptions API: https://learn.microsoft.com/en-us/dotnet/api/azure.communication.callautomation.startrecordingoptions
- Azure Communication Services recording Event Grid schema: https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/call-recording#event-grid-notifications
- Azure AI Speech batch transcription creation: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/batch-transcription-create
- Azure AI Speech transcription REST API: https://learn.microsoft.com/en-us/rest/api/speechtotext/transcriptions/create

## Issues Found
- The post implied that creating an Azure Communication Services resource configures Teams integration. I changed the wording to clarify that Teams interoperability also depends on tenant and meeting settings.
- The Azure CLI example used `--data-location unitedstates`, but the Azure CLI documentation shows the value as `"United States"`. I updated the command and matched the documented `"Global"` location style.
- The recording section said a server-side call joins a Teams meeting and starts recording from a meeting URL. The documented Call Recording API starts recording an existing Azure Communication Services call by `callConnectionId` or `serverCallId`; joining a Teams meeting is done through the Calling SDK. I changed the wording and updated the C# sample to accept a `callConnectionId`.
- The C# sample created a `TeamsMeetingLinkLocator` but never used it, and then used a placeholder `ServerCallLocator("serverCallId")`. I removed the unused locator and used the current `StartRecordingOptions(string callConnectionId)` overload.
- The recording sample did not include a recording state callback URI even though the official examples include `RecordingStateCallbackUri` for recording status callbacks. I added it to the sample options.
- The architecture text said the recording is saved to blob storage before the Event Grid event. Azure Communication Services first exposes the completed recording through recording file status events and temporary service storage unless external storage is configured. I updated the flow to say the function copies the recording into blob storage after the recording-ready event.
- The Event Grid handler used a non-documented `RecordingFileStatusUpdatedEvent` type and referenced `data.RecordingId`, which is not part of the documented recording file status event schema. I changed the sample to deserialize `AcsRecordingFileStatusUpdatedEventData` and use `eventGridEvent.Id` as the transcription correlation id.

## Review Notes
The batch transcription request properties are consistent with Azure AI Speech batch transcription examples, but the basic `diarizationEnabled` setting is limited to two speakers unless the `diarization.speakers` range is also supplied. For larger meetings, a future improvement would be to show multi-speaker diarization configuration explicitly.

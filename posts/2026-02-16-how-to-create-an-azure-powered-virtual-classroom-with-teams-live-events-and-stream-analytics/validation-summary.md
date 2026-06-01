# Validation Summary: How to Create an Azure-Powered Virtual Classroom with Teams Live Events

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Teams Live Events
- Microsoft Graph online meetings API
- Azure Event Hubs
- Azure Stream Analytics
- Azure Functions for Python
- Azure SignalR Service
- JavaScript SignalR client
- Python
- SQL-like Stream Analytics Query Language

## Sources Consulted
- Microsoft Teams limits and specifications: https://learn.microsoft.com/en-us/microsoftteams/limits-specifications-teams
- Microsoft 365 Developer Blog, Teams Live Events Graph deprecation notice: https://devblogs.microsoft.com/microsoft365dev/deprecation-notice-teams-live-events-meeting-creation-via-microsoft-graph/
- Microsoft Graph create onlineMeeting documentation: https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings
- Microsoft Graph onlineMeeting resource documentation: https://learn.microsoft.com/en-us/graph/api/resources/onlinemeeting
- Microsoft Graph broadcastMeetingSettings documentation: https://learn.microsoft.com/en-us/graph/api/resources/broadcastmeetingsettings
- Azure Event Hubs Python quickstart: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-python-get-started-send
- Azure Stream Analytics windowing functions: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-window-functions
- Azure Stream Analytics DATEDIFF documentation: https://learn.microsoft.com/en-us/stream-analytics-query/datediff-azure-stream-analytics
- Azure Stream Analytics query language reference: https://learn.microsoft.com/en-us/stream-analytics-query/stream-analytics-query-language-reference
- Azure Functions timer trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- Azure SignalR Service serverless JavaScript quickstart: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-quickstart-azure-functions-javascript

## Issues Found
- Microsoft Graph Live Events creation is deprecated. Added a caveat that `isBroadcast`-based Live Events creation is planned for removal from Microsoft Graph v1.0 on June 30, 2026, and that new builds should plan for town halls or webinars.
- The Graph creation sample used `/communications/onlineMeetings` and manually supplied organizer data. Updated it to create the meeting on behalf of the instructor with `/users/{instructor_id}/onlineMeetings`, matching current Graph documentation.
- The Graph sample appended `Z` to `datetime.isoformat()`, which can create invalid timestamps for timezone-aware datetimes. Updated the sample to normalize to UTC and emit valid ISO 8601 timestamps.
- The Graph helper calls did not check HTTP failures. Added `raise_for_status()` before reading response JSON.
- The Event Hubs sample referenced `os.environ` without importing `os` and used naive UTC timestamps. Added the missing import and timezone-aware timestamps.
- The post described tracking student leaves but only showed a join function. Added a `track_student_leave` helper.
- The architecture wording implied Teams events flow automatically into Event Hub. Clarified that a classroom app or Microsoft Graph integration must collect and send those events.
- The Stream Analytics inactive-student query used a `SlidingWindow` pattern that would not reliably emit a "joined but inactive for 15 minutes" alert. Replaced it with a hopping-window query that flags students with no chat or poll activity in the recent 15-minute window, and adjusted the explanatory text.
- The SignalR client connected directly to `/api/signalr/negotiate`. Updated it to the Azure Functions serverless SignalR pattern shown in Microsoft documentation, where the client connects to the Function app API base path and the negotiate endpoint supplies the service URL and token.
- The Azure Functions timer sample used Python v2 decorators without defining `app = func.FunctionApp()` or a function name. Added the required v2 programming model setup.
- The attendance calculation could divide by zero when no students were enrolled. Added a zero-enrollment guard.

## Review Notes
The Teams Live Events approach is still technically relevant as of June 1, 2026, but it is near end of life. A future revision should update the tutorial to use Microsoft Graph Virtual Events APIs for town halls or webinars instead of Live Events.

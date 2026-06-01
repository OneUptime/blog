# Validation Summary: How to Manage Virtual Rooms for Controlled Calling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Communication Services Rooms API
- Azure Communication Services Calling SDK for JavaScript
- Azure Communication Services Rooms SDK for JavaScript
- Azure Communication Services Rooms SDK for Python
- Azure Communication Services Identity SDK
- JavaScript / Node.js
- Python

## Sources Consulted
- Microsoft Learn: Rooms API for structured meetings: https://learn.microsoft.com/en-gb/azure/communication-services/concepts/rooms/room-concept
- Microsoft Learn: Create a room resource: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/rooms/get-started-rooms
- Microsoft Learn: Join a room call: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/rooms/join-rooms-call
- Microsoft Learn: JavaScript RoomsClient API reference: https://learn.microsoft.com/en-us/javascript/api/%40azure/communication-rooms/roomsclient
- Microsoft Learn: Python RoomsClient API reference: https://learn.microsoft.com/en-us/python/api/azure-communication-rooms/azure.communication.rooms.roomsclient
- Microsoft Learn: Python RoomParticipant API reference: https://learn.microsoft.com/en-us/python/api/azure-communication-rooms/azure.communication.rooms.roomparticipant
- Microsoft Learn: Python CommunicationUserIdentifier API reference: https://learn.microsoft.com/en-us/python/api/azure-communication-rooms/azure.communication.rooms.communicationuseridentifier

## Issues Found
- The role list omitted the `Collaborator` role. Microsoft documents four predefined room roles: `Presenter`, `Collaborator`, `Attendee`, and `Consumer`. I added `Collaborator` to the role description, role table, and scenario examples.
- The JavaScript install command installed only `@azure/communication-rooms`, but the sample imports `@azure/communication-identity`. I updated the command and comment to install both packages.
- The room call sample listed HTTP-like room-specific call end reasons as if they were guaranteed Calling SDK `callEndReason` values. I replaced the specific mapping with guidance to inspect the SDK-provided `code`, `subCode`, and message.
- The Python sample passed dictionaries to `RoomParticipant.communication_identifier`, but the Python SDK expects a `CommunicationIdentifier`. I updated the sample to construct `CommunicationUserIdentifier` objects from the provided ACS user IDs.

## Review Notes
The JavaScript Rooms API calls, room locator usage in the Calling SDK, participant management methods, and room lifecycle operations align with current Microsoft documentation. The post uses simplified role capabilities; it is accurate for the columns shown, but the official role matrix contains additional operations such as roster management, PSTN dial-out, captions, and device controls.

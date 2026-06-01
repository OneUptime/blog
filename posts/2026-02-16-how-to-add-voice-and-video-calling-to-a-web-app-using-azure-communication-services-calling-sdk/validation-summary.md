# Validation Summary: How to Add Voice and Video Calling to a Web App Using Azure Communication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Communication Services
- Azure Communication Services Calling SDK for JavaScript
- Azure Communication Services Identity SDK for JavaScript
- Azure Communication Services Common SDK for JavaScript
- WebRTC
- Node.js
- Express
- JavaScript

## Sources Consulted
- Microsoft Learn: Add voice calling to your app with the Azure Communication Services Calling SDK for JavaScript: https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/voice-video-calling/getting-started-with-calling
- Microsoft Learn: Manage video during calls with the Azure Communication Services Calling SDK: https://learn.microsoft.com/en-us/azure/communication-services/how-tos/calling-sdk/manage-video
- Microsoft Learn: Create and manage access tokens for end users: https://learn.microsoft.com/en-ca/azure/communication-services/quickstarts/identity/access-tokens
- Microsoft Learn: Azure Communication Services Calling SDK overview and browser support matrix: https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/calling-sdk-features
- Microsoft Learn API reference: DeviceManager interface for @azure/communication-calling: https://learn.microsoft.com/en-us/javascript/api/azure-communication-services/%40azure/communication-calling/devicemanager?view=azure-communication-services-js
- npm package metadata and TypeScript declarations for @azure/communication-calling 1.43.1, checked via `npm view` and package tarball declarations.

## Issues Found
- The install command omitted `@azure/communication-identity`, but the backend token service imports `CommunicationIdentityClient` from that package. Added `@azure/communication-identity` to the install command and adjusted the prerequisite text to mention the Calling, Common, and Identity SDK packages.
- The client examples used `LocalVideoStream` without importing it from `@azure/communication-calling`. Added `LocalVideoStream` to the Calling SDK import in the initialization snippet.
- The browser prerequisite listed Chrome, Firefox, Edge, and Safari as generally supported WebRTC browsers, but the ACS Calling SDK support matrix is OS-specific and Firefox is currently public preview. Updated the prerequisite to refer to ACS-supported browsers and call out Firefox preview status.
- The device selection section implied speaker selection is always available. Updated the wording and added `deviceManager.isSpeakerSelectionAvailable` checks before enumerating or selecting speakers.

## Review Notes
The remaining ACS Calling SDK APIs used in the post, including `CallClient`, `createCallAgent`, `askDevicePermission`, `startCall`, `incomingCall`, `accept`, `remoteParticipantsUpdated`, `VideoStreamRenderer`, `startVideo`, `stopVideo`, `switchSource`, `mute`, `unmute`, `hold`, and `resume`, align with the current JavaScript SDK documentation and TypeScript declarations. A production implementation should also dispose video renderer views during cleanup to avoid leaks, but that is a lifecycle hardening note rather than a correctness blocker for this tutorial.

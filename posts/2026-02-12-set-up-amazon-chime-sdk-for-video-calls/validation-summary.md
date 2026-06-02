# Validation Summary: How to Set Up Amazon Chime SDK for Video Calls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Chime SDK Meetings
- AWS SDK for JavaScript v3
- Boto3
- Amazon Chime SDK for JavaScript
- Express
- WebRTC
- Screen sharing/content share

## Sources Consulted
- Amazon Chime SDK API Reference: CreateMeeting - https://docs.aws.amazon.com/chime-sdk/latest/APIReference/API_meeting-chime_CreateMeeting.html
- Amazon Chime SDK API Reference: CreateAttendee - https://docs.aws.amazon.com/chime-sdk/latest/APIReference/API_meeting-chime_CreateAttendee.html
- Boto3 ChimeSDKMeetings create_attendee reference - https://docs.aws.amazon.com/boto3/latest/reference/services/chime-sdk-meetings/client/create_attendee.html
- AWS SDK for JavaScript v3 ChimeSDKMeetings client reference - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/chime-sdk-meetings/
- Amazon Chime SDK for JavaScript documentation - https://aws.github.io/amazon-chime-sdk-js/
- Amazon Chime SDK for JavaScript AudioVideoFacade reference - https://aws.github.io/amazon-chime-sdk-js/interfaces/audiovideofacade.html
- Amazon Chime SDK FAQ - https://docs.aws.amazon.com/chime-sdk/latest/dg/chime-sdk-faq.html
- Amazon Chime SDK endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/chime-sdk.html
- Amazon Chime SDK pricing - https://aws.amazon.com/chime/chime-sdk/pricing/

## Issues Found
- The architecture diagram and explanation described both the meeting and attendee responses as "tokens." The CreateMeeting API returns meeting details including media placement, while CreateAttendee returns attendee information including the join token. Updated the wording to distinguish meeting details from the attendee join token.
- The frontend example called `bindAudioElement` without awaiting it. The Amazon Chime SDK for JavaScript API returns `Promise<void>` for this method, so the example now awaits it.
- The pricing section said audio-only meetings are cheaper than video meetings. Current Chime SDK WebRTC media pricing uses a single attendee-minute rate for audio, video, and screen share modalities, so the pricing language was corrected.
- The limits section was vague about active video limits. Updated it to reflect the current standard-meeting quota of 250 attendees, 25 concurrent published video streams per meeting by default, and 25 concurrent subscribed video streams per attendee.
- The summary said AWS handles "transcoding" as part of the basic meeting path. Removed that claim because the reviewed Chime SDK meeting documentation describes WebRTC signaling and media routing, not generic client media transcoding for basic meetings.

## Review Notes
The sample Express API is intentionally minimal and still lacks production concerns such as authentication, persistent meeting storage, request validation, attendee identity handling, and frontend creation/reuse of video elements. Those are implementation completeness concerns rather than technical inaccuracies in the post's core Chime SDK usage.

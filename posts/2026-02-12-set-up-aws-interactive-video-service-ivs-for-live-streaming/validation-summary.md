# Validation Summary: How to Set Up AWS Interactive Video Service (IVS) for Live Streaming

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Interactive Video Service (IVS) Low-Latency Streaming
- AWS CLI for IVS and IVS Chat
- OBS Studio RTMPS streaming configuration
- FFmpeg RTMPS streaming
- Amazon IVS Web Player SDK
- Amazon IVS timed metadata
- Amazon IVS Chat JavaScript SDK
- Python boto3 IVS Chat token generation
- Amazon S3 auto-recording for IVS
- Amazon CloudWatch IVS metrics

## Sources Consulted
- Amazon IVS create-channel AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ivs/create-channel.html
- Amazon IVS create-stream-key AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ivs/create-stream-key.html
- Amazon IVS list-stream-keys AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ivs/list-stream-keys.html
- Amazon IVS Streaming Configuration: https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/streaming-config.html
- Amazon IVS Channel Types: https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/channel-types.html
- Amazon IVS PutMetadata API reference: https://docs.aws.amazon.com/ivs/latest/LowLatencyAPIReference/API_PutMetadata.html
- Amazon IVS timed metadata user guide: https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/metadata.html
- Amazon IVS Web Player SDK reference: https://aws.github.io/amazon-ivs-player-docs/latest/web/
- Amazon IVS Chat create-room AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ivschat/create-room.html
- Amazon IVS Chat CreateChatToken API reference: https://docs.aws.amazon.com/ivs/latest/ChatAPIReference/API_CreateChatToken.html
- Amazon IVS Chat JavaScript SDK guide: https://docs.aws.amazon.com/ivs/latest/ChatUserGuide/chat-js-using-sdk.html
- Amazon IVS Chat JavaScript SDK reference: https://aws.github.io/amazon-ivs-chat-messaging-sdk-js/1.0.2/
- Amazon IVS create-recording-configuration AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ivs/create-recording-configuration.html
- Amazon IVS update-channel AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ivs/update-channel.html
- Amazon IVS CloudWatch monitoring documentation: https://docs.aws.amazon.com/ivs/latest/userguide/cloudwatch.html

## Issues Found
- The post implied that `create-stream-key` should be run after `create-channel` to get the stream key. AWS documents that `create-channel` creates and returns an associated stream key, and that a channel can have only one stream key. Updated Step 1 and Step 2 to explain that `create-channel` returns the key and that `create-stream-key` is only for replacing a deleted/missing key.
- The post said `list-stream-keys` lists stream keys for a channel, in a context that could imply it returns the secret key value. AWS CLI documentation shows it returns summary information and ARNs, not the stream key value. Updated the comment to say it lists stream key ARNs.
- The OBS and FFmpeg examples used `rtmps://ingest.ivs.us-east-1.amazonaws.com:443/app/`, which does not match the current IVS low-latency ingest URL format. Updated the examples to use `rtmps://<IVS-ingest-server>:443/app/...`, using the channel response `ingestEndpoint`.
- The IVS Chat JavaScript example returned token timestamps as raw JSON strings. AWS's Chat JS SDK tutorial converts `sessionExpirationTime` and `tokenExpirationTime` to `Date` objects. Updated the token provider accordingly.
- The IVS Chat JavaScript example called `sendMessage` with a plain object. The official SDK expects a `SendMessageRequest`. Updated the import and call to use `new SendMessageRequest(text)`.
- The IVS Chat JavaScript example read `message.sender.displayName`, but the SDK's `ChatUser` exposes `userId` and optional `attributes`. Updated the example to use `message.sender.attributes?.displayName || message.sender.userId`.
- The frontend chat request body used `roomId`; the official CreateChatToken field is `roomIdentifier`. Updated the example to use `roomIdentifier` for consistency with the backend/API.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI references rather than local `aws ... help` output.
- The post uses IVS Web Player SDK version `1.24.0`; the code shape remains compatible with the documented player API, but future maintenance could update the CDN version to a newer SDK release.

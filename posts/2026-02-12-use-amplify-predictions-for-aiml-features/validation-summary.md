# Validation Summary: How to Use Amplify Predictions for AI/ML Features

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Amplify JavaScript
- Amplify Predictions
- Amazon Rekognition
- Amazon Textract
- Amazon Translate
- Amazon Polly
- Amazon Transcribe
- Amazon Comprehend
- Amazon Cognito Identity Pools
- AWS IAM
- React
- TypeScript

## Sources Consulted
- AWS Amplify Predictions overview: https://docs.amplify.aws/react/frontend/predictions/
- AWS Amplify Predictions setup documentation: https://docs.amplify.aws/javascript/build-a-backend/add-aws-services/predictions/set-up-predictions/
- AWS Amplify label image documentation: https://docs.amplify.aws/react/frontend/predictions/label-image/
- AWS Amplify identify text documentation: https://docs.amplify.aws/react/frontend/predictions/identify-text/
- AWS Amplify translate documentation: https://docs.amplify.aws/react/frontend/predictions/translate/
- AWS Amplify interpret sentiment documentation: https://docs.amplify.aws/react/frontend/predictions/interpret-sentiment/
- AWS Amplify text-to-speech documentation: https://docs.amplify.aws/react/frontend/predictions/text-to-speech/
- Current `@aws-amplify/predictions` package types/runtime, version 6.1.72: https://www.npmjs.com/package/@aws-amplify/predictions
- Amazon Transcribe IAM actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazontranscribe.html

## Issues Found
- The overview omitted Amazon Transcribe even though the post described speech-to-text under Convert. Added Amazon Transcribe to the underlying service list.
- The manual configuration used `VoiceId` for the text-to-speech default. The current package reads `voiceId`; updated the config snippet.
- The Interpret examples and default config used uppercase `ALL`. The current package types/runtime use lowercase `all`; updated the config and examples.
- The label examples read `label.confidence`, but Amplify returns label confidence under `label.metadata.confidence`. Updated both the console example and React component.
- The text extraction example iterated `result.text.lines` as if each line had geometry. Amplify returns plain strings in `lines` and geometry in `linesDetailed`; updated the example.
- The sentiment example read `result.textInterpretation.entities`, but Amplify returns named entities as `textEntities`. Updated the example.
- The text-to-speech comments said raw audio was available at `result.speech.audioStream`. The current output returns `audioStream` at the top level. Updated the comment.
- The IAM policy snippet was marked as JSON but contained a JavaScript comment. Removed the comment so the block is valid JSON.
- The IAM policy claimed to cover all Predictions categories but omitted permissions needed for moderation labels, syntax detection, and Transcribe streaming. Added `rekognition:DetectModerationLabels`, `comprehend:DetectSyntax`, and `transcribe:StartStreamTranscriptionWebSocket`.

## Review Notes
The post now matches the current Amplify Predictions API shape for the covered examples. AWS Amplify documentation still shows some older Gen 1 configuration casing in places, so future updates should keep checking the installed package version and generated Amplify config when targeting a specific Amplify generation.

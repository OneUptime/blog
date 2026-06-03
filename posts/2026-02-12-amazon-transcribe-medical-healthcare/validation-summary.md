# Validation Summary: How to Use Amazon Transcribe Medical for Healthcare

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Transcribe Medical
- Amazon Transcribe Streaming
- AWS SDK for Python / Boto3
- Amazon S3
- Amazon Bedrock Runtime
- AWS KMS
- AWS IAM, CloudTrail, VPC endpoints, and HIPAA-oriented AWS controls

## Sources Consulted
- Amazon Transcribe Medical developer guide: https://docs.aws.amazon.com/transcribe/latest/dg/transcribe-medical.html
- Boto3 `start_medical_transcription_job` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/transcribe/client/start_medical_transcription_job.html
- Amazon Transcribe Medical conversation and specialty documentation: https://docs.aws.amazon.com/transcribe/latest/dg/transcribe-medical-conversation.html
- Amazon Transcribe Medical batch speaker partitioning documentation: https://docs.aws.amazon.com/transcribe/latest/dg/conversation-diarization-batch-med.html
- Amazon Transcribe diarization output documentation: https://docs.aws.amazon.com/transcribe/latest/dg/diarization.html
- Amazon Transcribe Medical streaming API reference: https://docs.aws.amazon.com/transcribe/latest/APIReference/API_streaming_StartMedicalStreamTranscription.html
- Boto3 `create_medical_vocabulary` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/transcribe/client/create_medical_vocabulary.html
- Amazon Transcribe Medical custom vocabulary file format: https://docs.aws.amazon.com/transcribe/latest/dg/create-med-vocab-text.html
- Amazon Transcribe PHI identification documentation: https://docs.aws.amazon.com/transcribe/latest/dg/phi-id.html
- Amazon Transcribe VPC endpoint / PrivateLink documentation: https://docs.aws.amazon.com/transcribe/latest/dg/vulnerability-analysis-and-management.html
- AWS HIPAA eligible services reference: https://aws.amazon.com/compliance/hipaa-eligible-services-reference/
- Amazon Bedrock Claude Messages API examples: https://docs.aws.amazon.com/bedrock/latest/userguide/api-inference-examples-claude-messages-code-examples.html

## Issues Found
- The post said Transcribe Medical supports only Primary Care and Cardiology. Updated this to distinguish batch support, where `PRIMARYCARE` is the valid specialty, from streaming support, where additional specialties such as Cardiology, Neurology, Oncology, Radiology, and Urology are valid.
- The batch transcription helper accepted `CARDIOLOGY` and sent speaker-label settings even for dictation. Updated it to use `PRIMARYCARE` for batch jobs and only include `Settings` when speaker diarization is enabled for conversations.
- The transcript description claimed medical-specific entity tagging by default. Updated it to describe the shared transcript structure and optional PHI labels when content identification is enabled.
- The conversation formatter tried to read word alternatives from `speaker_labels.segments[].items`, but AWS diarization output stores speaker timing there and word content in `results.items`. Updated the formatter to map segment timestamps to speakers and read transcript words from `results.items`.
- The conversation example included `ChannelIdentification: False`, which was unnecessary and potentially confusing beside speaker diarization. Removed it.
- The pipeline example sent invalid speaker-label settings for non-conversation jobs. Updated it to conditionally add `Settings`.
- The medical vocabulary example implied one-phrase-per-line list format and had an unused `phrases` argument. Updated it to pass the S3 URI explicitly and show the required tabular medical vocabulary format.

## Review Notes
- Python snippets were syntax-checked with `ast.parse`. Runtime validation against AWS was not performed because the local environment does not have `boto3` installed and no AWS credentials were used.
- Boto3 does not support streaming transcription; the article correctly uses a separate streaming SDK pattern. The `amazon-transcribe` Python streaming package is no longer described as an official supported AWS product on PyPI, so a future update could switch the streaming example to a currently supported SDK or direct HTTP/2/WebSocket implementation.
- The Bedrock example model ID `anthropic.claude-3-sonnet-20240229-v1:0` remains documented by AWS, but Claude 3 Sonnet has lifecycle caveats and should be revisited before publication or long-term production use.

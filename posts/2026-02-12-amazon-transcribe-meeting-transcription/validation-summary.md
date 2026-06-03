# Validation Summary: How to Use Amazon Transcribe for Meeting Transcription

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Transcribe batch transcription
- Amazon Transcribe speaker diarization
- Amazon Transcribe channel identification
- Amazon S3
- Amazon Bedrock Runtime
- Anthropic Claude on Amazon Bedrock
- Amazon DynamoDB
- Python
- Boto3

## Sources Consulted
- Amazon Transcribe Boto3 `start_transcription_job` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/transcribe/client/start_transcription_job.html
- Amazon Transcribe speaker diarization documentation: https://docs.aws.amazon.com/transcribe/latest/dg/diarization.html
- Amazon Transcribe batch diarization output example: https://docs.aws.amazon.com/transcribe/latest/dg/diarization-output-batch.html
- Amazon Bedrock Anthropic Claude Messages API examples: https://docs.aws.amazon.com/bedrock/latest/userguide/api-inference-examples-claude-messages-code-examples.html
- Amazon Bedrock model lifecycle documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Bedrock Claude Sonnet 4.6 model card and sample code: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html
- Python datetime documentation / Python 3.12 deprecations: https://docs.python.org/3.12/whatsnew/3.12.html

## Issues Found
- The transcript formatting code tried to read word content from `results.speaker_labels.segments[*].items`. Amazon Transcribe's diarization output stores those segment items as timestamp and speaker metadata, while transcript text is available in `results.items` and `results.audio_segments`. Changed the formatter to use `results.audio_segments`, which includes `transcript`, `start_time`, and `speaker_label`.
- The multi-channel example described the output as "per-channel speaker ID" and accepted an unused `num_channels` argument. Amazon Transcribe channel identification labels audio channels, not named speakers. Updated the function docstring to say "channel labels" and removed the unused argument.
- The Bedrock example used `anthropic.claude-3-sonnet-20240229-v1:0`. Amazon Bedrock marks Claude 3 Sonnet as Legacy as of January 30, 2026, with EOL on July 30, 2026. Updated the example to use the active Claude Sonnet 4.6 model ID shown in Amazon Bedrock's current sample code.
- The pipeline used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to `datetime.now(timezone.utc)` and imported `timezone`.

## Review Notes
The code snippets were checked for Python syntax after edits. Runtime execution against AWS services was not performed because it would require configured AWS credentials, existing S3 buckets, DynamoDB tables, Transcribe vocabulary names, and Bedrock model access.

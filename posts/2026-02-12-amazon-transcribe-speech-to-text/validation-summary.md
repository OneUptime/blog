# Validation Summary: How to Use Amazon Transcribe for Speech-to-Text

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Transcribe
- AWS SDK for Python (Boto3)
- Amazon Transcribe Streaming SDK for Python
- Amazon S3
- Python

## Sources Consulted
- Amazon Transcribe StartTranscriptionJob API Reference: https://docs.aws.amazon.com/transcribe/latest/APIReference/API_StartTranscriptionJob.html
- Boto3 TranscribeService.Client.start_transcription_job reference: https://docs.aws.amazon.com/boto3/latest/reference/services/transcribe/client/start_transcription_job.html
- Amazon Transcribe SDK examples and streaming SDK notes: https://docs.aws.amazon.com/transcribe/latest/dg/getting-started-sdk.html
- Amazon Transcribe speaker diarization documentation: https://docs.aws.amazon.com/transcribe/latest/dg/diarization.html
- Boto3 TranscribeService.Client.create_vocabulary reference: https://docs.aws.amazon.com/boto3/latest/reference/services/transcribe/client/create_vocabulary.html
- Amazon Transcribe custom vocabulary documentation: https://docs.aws.amazon.com/transcribe/latest/dg/custom-vocabulary.html

## Issues Found
- The speaker transcript formatting example read `alternatives` and `type` fields from `speaker_labels.segments[].items`. AWS diarization output puts only timestamps and speaker labels in that section; the transcript text remains in `results.items`. Updated the example to build a timestamp-to-word lookup from `results.items` and use segment timestamps to format speaker text.
- The pipeline example passed `Settings.VocabularyName` while using automatic language identification. AWS documents that custom vocabularies with automatic language identification should be passed through `LanguageIdSettings`. Updated the pipeline to use `Settings.VocabularyName` only when a fixed language is supplied, and `LanguageIdSettings` when language identification is enabled.

## Review Notes
All Python snippets compile successfully with Python 3 after the fixes. The examples still assume valid AWS credentials, same-region S3 buckets, appropriate S3 permissions, existing output buckets, and audio that matches the streaming sample rate and PCM encoding.

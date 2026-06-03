# Validation Summary: How to Use Amazon Polly for Text-to-Speech

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Polly
- AWS SDK for Python (boto3)
- Python
- SSML
- Amazon S3

## Sources Consulted
- Amazon Polly SynthesizeSpeech API: https://docs.aws.amazon.com/polly/latest/dg/API_SynthesizeSpeech.html
- boto3 Polly synthesize_speech reference: https://docs.aws.amazon.com/boto3/latest/reference/services/polly/client/synthesize_speech.html
- boto3 Polly describe_voices reference: https://docs.aws.amazon.com/botocore/latest/reference/services/polly/client/describe_voices.html
- Amazon Polly StartSpeechSynthesisTask API: https://docs.aws.amazon.com/polly/latest/dg/API_StartSpeechSynthesisTask.html
- Amazon Polly supported SSML tags: https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html
- Amazon Polly whispering SSML tag: https://docs.aws.amazon.com/polly/latest/dg/whispered-tag.html
- Amazon Polly phoneme SSML tag: https://docs.aws.amazon.com/polly/latest/dg/phoneme-tag.html
- Amazon Polly speech marks: https://docs.aws.amazon.com/polly/latest/dg/speechmarks.html
- Amazon Polly speech mark types: https://docs.aws.amazon.com/polly/latest/dg/using-speechmarks.html
- Amazon Polly available neural voices: https://docs.aws.amazon.com/polly/latest/dg/neural-voices.html

## Issues Found
- The `describe_voices` example only read the first response page, so it could miss voices when the API returns a `NextToken`. Changed it to use the boto3 `describe_voices` paginator.
- The SSML example escaped `<s>` tags as `&lt;s&gt;`, which would not create sentence elements in the SSML input. Changed them to real `<s>` tags.
- The SSML example used `<emphasis>` with `Engine='neural'`, but Amazon Polly documents `<emphasis>` as unavailable for neural voices. Removed that neural example usage and marked the standalone emphasis reference as standard-voices-only.
- The phoneme example used non-IPA strings while declaring `alphabet="ipa"`. Replaced them with IPA pronunciations.
- The whispered speech example did not mention its engine limitation. Marked it as standard-voices-only, matching Amazon Polly documentation.
- The long-form section described the SynthesizeSpeech limit as 3,000 characters, or 6,000 for SSML. Updated it to the documented 6,000 total input characters with no more than 3,000 billed characters.
- The Markdown cleanup code block contained a literal triple-backtick regex inside a triple-backtick fenced block, which broke the rendered Python snippet. Rewrote the regex as `` `{3}...`{3} `` and moved code-block removal before inline-code removal.
- The speech marks section implied Polly returns timing for arbitrary SSML tags. Updated it to specify that the `ssml` speech mark type corresponds to custom SSML `<mark>` elements.

## Review Notes
The Python snippets were parsed with `ast.parse` after edits. Runtime execution was not attempted because the examples require AWS credentials, a Polly-enabled AWS account, and user-provided placeholder variables such as `long_article_text` and `article_text`.

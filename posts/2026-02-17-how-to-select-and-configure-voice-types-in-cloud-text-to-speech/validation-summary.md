# Validation Summary: How to Select and Configure Voice Types in Cloud Text-to-Speech

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Text-to-Speech
- Google Cloud Text-to-Speech Python client library
- Standard, WaveNet, Neural2, Studio, Chirp 3, and Gemini TTS voices
- Python

## Sources Consulted
- Google Cloud Text-to-Speech supported voices and languages: https://cloud.google.com/text-to-speech/docs/list-voices-and-types
- Google Cloud Text-to-Speech pricing: https://cloud.google.com/text-to-speech/pricing
- Google Cloud Text-to-Speech Python synthesize text sample: https://cloud.google.com/text-to-speech/docs/samples/tts-synthesize-text
- Google Cloud Text-to-Speech voices.list REST reference: https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1beta1/voices/list
- Google Cloud Text-to-Speech Python AudioConfig reference: https://cloud.google.com/python/docs/reference/texttospeech/latest/google.cloud.texttospeech_v1.types.AudioConfig
- Google Cloud Text-to-Speech Python Voice reference: https://cloud.google.com/python/docs/reference/texttospeech/latest/google.cloud.texttospeech_v1.types.Voice

## Issues Found
- The post described Cloud Text-to-Speech as offering only four voice technologies. Updated the wording to mention newer Chirp 3 and Gemini TTS models while keeping the article focused on the legacy and general-purpose families it compares.
- The post described Neural2 as Google's latest generation. Updated the wording because Google now documents newer Chirp 3 and Gemini TTS models.
- The post stated WaveNet costs about 4x more than Standard and listed WaveNet at $16 per 1 million characters. Updated WaveNet pricing to $4 per 1 million characters, matching the current Google Cloud pricing table.
- The post stated Studio voices cost about 2x more than Neural2/WaveNet. Updated the wording because current pricing lists Studio at $160 per 1 million characters, Neural2 at $16, and WaveNet/Standard at $4.
- The fine-tuning Python snippet used `os.makedirs` without importing `os`. Added the missing import.
- The multi-language Python snippet used `texttospeech.TextToSpeechClient()` without importing `texttospeech`. Added the missing import.
- The Mandarin Chinese mapping used `zh-CN-Neural2-*` voices, which are not listed in the supported voices table. Replaced them with supported `cmn-CN-Wavenet-*` voice names.

## Review Notes
The Python snippets parse successfully with `python3`, but they were not executed against Google Cloud because that would require project credentials and billable API access. Pricing is current as of this validation date and should be rechecked before publication because cloud pricing changes over time.

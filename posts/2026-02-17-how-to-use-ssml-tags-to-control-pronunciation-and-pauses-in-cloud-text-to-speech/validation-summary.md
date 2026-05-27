# Validation Summary: How to Use SSML Tags to Control Pronunciation and Pauses in Cloud Text-to-Speech

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Text-to-Speech
- Speech Synthesis Markup Language (SSML)
- Python
- Google Cloud Text-to-Speech Python client library

## Sources Consulted
- Google Cloud Text-to-Speech SSML documentation: https://docs.cloud.google.com/text-to-speech/docs/ssml
- Google Cloud Text-to-Speech quotas and limits: https://docs.cloud.google.com/text-to-speech/quotas
- Google Cloud Text-to-Speech Python `SynthesisInput` reference: https://docs.cloud.google.com/python/docs/reference/texttospeech/latest/google.cloud.texttospeech_v1.types.SynthesisInput
- Google Cloud Text-to-Speech Python quickstart sample: https://docs.cloud.google.com/text-to-speech/docs/samples/tts-quickstart
- Google Cloud Text-to-Speech supported voices list: https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types

## Issues Found
- The post described `<emphasis>` as applying to a word or phrase, but Google Cloud Text-to-Speech documents that `<emphasis>` should only be used around a full sentence because phrase-level use can create unwanted pauses. Updated the explanation and examples to use sentence-level emphasis.
- The post listed `strong`, `moderate`, and `reduced` as the emphasis levels, but Google Cloud also supports `none`. Added `none` to the list.
- The notification helper interpolated `message` and `details` directly into SSML. Because SSML is XML, reserved characters such as `&` and `<` can make the request invalid. Added `html.escape()` before inserting dynamic text into the SSML string.
- The best-practices section said the maximum SSML input length is 5000 characters. Google Cloud documents the request content limit as 5000 bytes. Updated the wording to bytes.

## Review Notes
The Python examples use current Google Cloud Text-to-Speech client APIs (`TextToSpeechClient`, `SynthesisInput(ssml=...)`, `VoiceSelectionParams`, `AudioConfig`, and `synthesize_speech`). The selected `en-US-Neural2-D` voice is present in the current supported voices list. All Python fenced code blocks parse successfully with `python3`.

# Validation Summary: How to Add Custom Vocabulary and Phrases to Cloud Speech-to-Text for

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Speech-to-Text
- Speech adaptation
- Phrase hints and SpeechContext
- Built-in class tokens
- SpeechAdaptation PhraseSet and CustomClass resources
- Python Google Cloud client library

## Sources Consulted
- Google Cloud Speech-to-Text RecognitionConfig REST reference: https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig
- Google Cloud Speech-to-Text SpeechContext Python client reference: https://docs.cloud.google.com/python/docs/reference/speech/latest/google.cloud.speech_v1.types.SpeechContext
- Google Cloud Speech-to-Text model adaptation guide: https://docs.cloud.google.com/speech-to-text/docs/v1/adaptation
- Google Cloud Speech-to-Text introduction to model adaptation: https://docs.cloud.google.com/speech-to-text/docs/v1/adaptation-model
- Google Cloud Speech-to-Text supported class tokens: https://docs.cloud.google.com/speech-to-text/docs/class-tokens
- Google Cloud Speech-to-Text quotas and limits: https://docs.cloud.google.com/speech-to-text/docs/quotas
- Google Cloud Speech-to-Text latest models: https://docs.cloud.google.com/speech-to-text/docs/latest-models

## Issues Found
- The post described "Model Adaptation (Custom Model)" as training a custom model variant with domain data. Google Cloud Speech-to-Text documentation uses model adaptation for phrase sets, custom classes, and adaptation boost, not for training a custom speech model in the shown API flow. I changed this to "Model Adaptation with Phrase Sets" and described reusable PhraseSet and CustomClass resources.
- The post called built-in pattern helpers "built-in custom classes." Google documents these as built-in class tokens, while custom classes are user-defined adaptation resources. I changed the heading, explanation, and docstring to "built-in class tokens."
- The limits section said you can have up to 10 speech contexts per request. The current documented adaptation limits list 5,000 phrases per request, 100 characters per phrase, and up to 20 PhraseSets and 20 CustomClasses per SpeechAdaptation. I replaced the unsupported speech-context limit with the documented SpeechAdaptation resource limits.

## Review Notes
- The Python snippets are syntactically valid; all six code blocks parse successfully with `python3`.
- The examples use the v1 `speech_contexts` / `SpeechContext` style, which remains documented. For reusable custom classes and phrase sets, Google Cloud's newer examples use the `adaptation` field with SpeechAdaptation resources; a future article could show that fuller flow.

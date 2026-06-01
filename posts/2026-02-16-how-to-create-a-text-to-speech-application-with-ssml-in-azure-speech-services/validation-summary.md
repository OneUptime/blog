# Validation Summary: How to Create a Text-to-Speech Application with SSML in Azure Speech Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Speech Services
- Azure Speech SDK for Python
- Speech Synthesis Markup Language (SSML)
- Text-to-speech synthesis
- Neural voices and speaking styles
- Python XML generation

## Sources Consulted
- Microsoft Learn: Speech Synthesis Markup Language (SSML) overview - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup
- Microsoft Learn: Pronunciation with SSML - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation
- Microsoft Learn: Voice and sound with SSML - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice
- Microsoft Learn: SSML phonetic alphabets - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-ssml-phonetic-sets
- Microsoft Learn: Language and voice support for Azure Speech - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
- Microsoft Learn: Text to speech quickstart - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech
- Python documentation: xml.sax.saxutils - https://docs.python.org/3/library/xml.sax.utils.html

## Issues Found
- The telephone `say-as` example used `format="1"`, but Azure's `telephone` interpretation does not define a `format` value. Removed the unsupported format attribute.
- The IPA phoneme examples used non-IPA phone strings that could be rejected as invalid SSML. Replaced them with valid IPA-style phoneme strings.
- The inline phoneme example used `alphabet="x-microsoft-ups"`, which is not a supported inline `phoneme` alphabet value. Changed it to Azure's supported `sapi` alphabet and updated the phone string.
- The examples used `style="serious"` with `en-US-AriaNeural`, but that style is not listed for Aria. Changed those examples to the supported `newscast-formal` style and adjusted the nearby comment.
- The dynamic SSML builder inserted unescaped text and attribute values into XML. Added `xml.sax.saxutils.escape` and `quoteattr` so generated SSML remains valid for dynamic plain text and attribute values.

## Review Notes
The code examples use the current Azure Speech SDK package and the documented `SpeechConfig`, `SpeechSynthesizer`, `speak_ssml_async`, `AudioOutputConfig`, and `SpeechSynthesisOutputFormat` APIs. The examples after Step 1 assume the previously created `synthesizer` remains in scope. Python syntax and literal SSML XML parsing were verified locally.

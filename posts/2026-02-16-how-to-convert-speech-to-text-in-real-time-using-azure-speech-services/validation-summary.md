# Validation Summary: How to Convert Speech to Text in Real Time Using Azure Speech Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Speech / Azure Speech Services
- Azure Speech SDK
- Python
- Speech-to-text transcription
- Continuous speech recognition
- Language identification
- Word-level timestamps
- Phrase list grammar
- GStreamer for compressed audio input

## Sources Consulted
- Microsoft Learn: Speech to text quickstart - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text
- Microsoft Learn: About the Speech SDK - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-sdk
- Microsoft Learn: Display text formatting with speech to text - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/display-text-format
- Microsoft Learn: Implement language identification - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification
- Microsoft Learn: Get speech recognition results - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-speech-recognition-results
- Microsoft Learn: How to use compressed input audio - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-use-codec-compressed-audio-input-streams
- Microsoft Learn Python API: SpeechRecognizer - https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.speechrecognizer
- Microsoft Learn Python API: SpeechConfig - https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.speechconfig
- Microsoft Learn Python API: PhraseListGrammar - https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.phraselistgrammar
- Azure Speech pricing - https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/

## Issues Found
- The introduction said the post covered audio streams, but no stream example was included. Changed the wording to say the post covers microphone and audio-file transcription.
- The resource setup only told readers to copy the key and region, but continuous language identification examples require endpoint-based configuration. Updated the setup text to include the endpoint.
- The single-shot microphone example used `enable_dictation()` as if it enabled automatic punctuation. Microsoft documents display text punctuation as automatic and dictation mode as a continuous-recognition feature for spoken punctuation. Removed the call from the single-shot example and clarified the comment.
- The continuous-recognition docstring said Ctrl+C would stop the sample even though the code waits for Enter. Updated the docstring to match the code.
- The audio-file example described "batch processing" and claimed stereo WAV support. Updated the wording to avoid confusing SDK file recognition with Azure Batch transcription and corrected the default SDK WAV input format to 16 kHz or 8 kHz, 16-bit, mono PCM.
- The language detection example claimed language switching mid-conversation but did not set continuous language identification mode. Updated the code to create `SpeechConfig` from an endpoint and set `SpeechServiceConnection_LanguageIdMode` to `Continuous`.
- The timestamp example requested word-level timestamps but only returned segment-level offsets. Updated the code to include word-level `Words` timing from the detailed JSON result.
- The latency tip described `SpeechServiceConnection_InitialSilenceTimeoutMs` as a general low-latency setting. Reworded it as an initial-silence timeout control.

## Review Notes
The examples still use subscription keys directly for readability. Microsoft recommends environment variables or stronger credential handling for production applications.

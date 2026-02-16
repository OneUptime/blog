# How to Convert Speech to Text in Real Time Using Azure Speech Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Speech Services, Speech-to-Text, Transcription, AI, Real-Time, Cognitive Services

Description: Build real-time speech-to-text transcription using Azure Speech Services with streaming recognition, language detection, and practical Python examples.

---

Real-time speech-to-text transcription is one of those capabilities that sounds simple but involves significant engineering underneath. You need to capture audio, stream it to a recognition service, handle partial results as the user is still speaking, deal with punctuation and capitalization, and manage errors and disconnections. Azure Speech Services handles all of this complexity and exposes it through a clean SDK. In this post, I will show you how to build real-time transcription from a microphone, from audio files, and from audio streams.

## Step 1: Create a Speech Services Resource

In the Azure Portal:

1. Search for "Speech" in the marketplace.
2. Click "Create."
3. Select your subscription, resource group, and region.
4. Choose the Free F0 tier (5 hours of transcription per month) or Standard S0 for production.
5. Review and create.

Copy the speech key and region from the resource overview.

## Step 2: Install the SDK

```bash
# Install the Azure Speech SDK
pip install azure-cognitiveservices-speech
```

The Speech SDK supports Python, C#, C++, Java, JavaScript, Go, and Swift.

## Step 3: Transcribe from a Microphone in Real Time

This is the most common real-time scenario. The SDK captures audio from your default microphone and streams it to Azure for recognition.

```python
import azure.cognitiveservices.speech as speechsdk

# Configure the speech service
speech_key = "your-speech-key"
speech_region = "eastus"  # Your resource's region

speech_config = speechsdk.SpeechConfig(
    subscription=speech_key,
    region=speech_region
)

# Set the recognition language
speech_config.speech_recognition_language = "en-US"

# Enable automatic punctuation (adds periods, commas, question marks)
speech_config.enable_dictation()

# Use the default microphone as input
audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)

# Create the recognizer
recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    audio_config=audio_config
)

def recognize_from_microphone():
    """
    Perform single-shot recognition from the microphone.
    Listens until a pause is detected, then returns the result.
    """
    print("Speak into your microphone...")
    result = recognizer.recognize_once_async().get()

    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        print(f"Recognized: {result.text}")
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech could be recognized.")
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation = result.cancellation_details
        print(f"Recognition canceled: {cancellation.reason}")
        if cancellation.error_details:
            print(f"Error details: {cancellation.error_details}")

    return result


recognize_from_microphone()
```

## Step 4: Continuous Recognition for Long Conversations

Single-shot recognition stops after the first pause. For continuous transcription (like meeting notes or live captions), use the continuous recognition mode.

```python
import threading

def continuous_recognition():
    """
    Continuously transcribe speech from the microphone.
    Handles both interim (partial) and final results.
    Press Ctrl+C to stop.
    """
    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=speech_region
    )
    speech_config.speech_recognition_language = "en-US"
    speech_config.enable_dictation()

    audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config
    )

    # Track the full transcript
    transcript = []
    done = threading.Event()

    def on_recognizing(evt):
        """Called with partial results while the user is still speaking."""
        # These are interim results that may change
        print(f"  [Partial]: {evt.result.text}", end="\r")

    def on_recognized(evt):
        """Called when a complete utterance has been recognized."""
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print(f"\n[Final]: {evt.result.text}")
            transcript.append(evt.result.text)

    def on_canceled(evt):
        """Called when recognition is canceled (error or end of stream)."""
        print(f"\nRecognition canceled: {evt.cancellation_details.reason}")
        done.set()

    def on_session_stopped(evt):
        """Called when the session ends."""
        print("\nSession stopped.")
        done.set()

    # Connect event handlers
    recognizer.recognizing.connect(on_recognizing)
    recognizer.recognized.connect(on_recognized)
    recognizer.canceled.connect(on_canceled)
    recognizer.session_stopped.connect(on_session_stopped)

    # Start continuous recognition
    print("Starting continuous recognition. Speak freely...")
    print("Press Enter to stop.\n")
    recognizer.start_continuous_recognition()

    # Wait for user to press Enter
    input()
    recognizer.stop_continuous_recognition()

    # Return the full transcript
    full_text = " ".join(transcript)
    print(f"\n--- Full Transcript ---\n{full_text}")
    return full_text


continuous_recognition()
```

## Step 5: Transcribe an Audio File

For batch processing of recorded audio, you can transcribe from a WAV file:

```python
def transcribe_audio_file(audio_path):
    """
    Transcribe a WAV audio file to text.
    Supports WAV files with 16-bit PCM, mono or stereo audio.
    """
    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=speech_region
    )
    speech_config.speech_recognition_language = "en-US"
    speech_config.enable_dictation()

    # Point to the audio file instead of the microphone
    audio_config = speechsdk.audio.AudioConfig(filename=audio_path)

    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config
    )

    transcript = []
    done = threading.Event()

    def on_recognized(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            transcript.append(evt.result.text)

    def on_canceled(evt):
        done.set()

    def on_session_stopped(evt):
        done.set()

    recognizer.recognized.connect(on_recognized)
    recognizer.canceled.connect(on_canceled)
    recognizer.session_stopped.connect(on_session_stopped)

    # Start recognition and wait for completion
    recognizer.start_continuous_recognition()
    done.wait()  # Block until the file is fully processed

    return " ".join(transcript)


# Transcribe a meeting recording
text = transcribe_audio_file("meeting_recording.wav")
print(f"Transcription:\n{text}")
```

## Step 6: Multi-Language Detection and Transcription

If you are processing audio in multiple languages, Azure Speech Services can automatically detect the language.

```python
def transcribe_with_language_detection(audio_path):
    """
    Transcribe audio with automatic language detection.
    Supports switching between languages mid-conversation.
    """
    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=speech_region
    )

    # Configure auto-detection with candidate languages
    auto_detect_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
        languages=["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP"]
    )

    audio_config = speechsdk.audio.AudioConfig(filename=audio_path)

    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
        auto_detect_source_language_config=auto_detect_config
    )

    results = []
    done = threading.Event()

    def on_recognized(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            # Get the detected language for this segment
            auto_detect_result = speechsdk.AutoDetectSourceLanguageResult(evt.result)
            detected_language = auto_detect_result.language

            results.append({
                "text": evt.result.text,
                "language": detected_language
            })
            print(f"[{detected_language}]: {evt.result.text}")

    def on_session_stopped(evt):
        done.set()

    def on_canceled(evt):
        done.set()

    recognizer.recognized.connect(on_recognized)
    recognizer.session_stopped.connect(on_session_stopped)
    recognizer.canceled.connect(on_canceled)

    recognizer.start_continuous_recognition()
    done.wait()

    return results


results = transcribe_with_language_detection("multilingual_call.wav")
```

## Step 7: Adding Timestamps to Transcriptions

For meeting notes and subtitles, you often need timestamps for each segment.

```python
def transcribe_with_timestamps(audio_path):
    """
    Transcribe audio with word-level timestamps.
    Useful for generating subtitles or aligning text with audio.
    """
    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=speech_region
    )
    speech_config.speech_recognition_language = "en-US"
    # Request word-level timestamps
    speech_config.request_word_level_timestamps()

    audio_config = speechsdk.audio.AudioConfig(filename=audio_path)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config
    )

    segments = []
    done = threading.Event()

    def on_recognized(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            # Parse the detailed JSON result for word-level timing
            import json
            result_json = json.loads(
                evt.result.properties.get(
                    speechsdk.PropertyId.SpeechServiceResponse_JsonResult
                )
            )

            # Extract timing information
            offset_ticks = result_json.get("Offset", 0)
            duration_ticks = result_json.get("Duration", 0)

            # Convert from ticks (100ns units) to seconds
            start_seconds = offset_ticks / 10_000_000
            duration_seconds = duration_ticks / 10_000_000

            segments.append({
                "text": evt.result.text,
                "start": start_seconds,
                "end": start_seconds + duration_seconds
            })

            print(f"[{start_seconds:.2f}s - {start_seconds + duration_seconds:.2f}s]: "
                  f"{evt.result.text}")

    def on_session_stopped(evt):
        done.set()

    def on_canceled(evt):
        done.set()

    recognizer.recognized.connect(on_recognized)
    recognizer.session_stopped.connect(on_session_stopped)
    recognizer.canceled.connect(on_canceled)

    recognizer.start_continuous_recognition()
    done.wait()

    return segments
```

## Performance Tips

**Audio format matters.** The SDK works best with 16 kHz, 16-bit, mono PCM WAV files. If your audio is in a different format, convert it before processing. Using compressed formats like MP3 is possible but requires the GStreamer library.

**Use phrase lists for domain terms.** If your audio contains technical terms, product names, or jargon that the default model might not recognize, add them as phrase hints:

```python
# Add domain-specific terms to improve recognition accuracy
phrase_list = speechsdk.PhraseListGrammar.from_recognizer(recognizer)
phrase_list.addPhrase("Kubernetes")
phrase_list.addPhrase("kubectl")
phrase_list.addPhrase("Azure DevOps")
phrase_list.addPhrase("OneUptime")
```

**Handle network interruptions.** Real-time recognition requires a stable network connection. The SDK automatically reconnects after brief interruptions, but for unreliable networks, implement reconnection logic in your application.

**Reduce latency.** The default recognition mode balances accuracy and latency. For lower latency (at the cost of slightly lower accuracy), use the `speech_config.set_property(speechsdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000")` setting.

## Wrapping Up

Azure Speech Services makes real-time speech-to-text transcription accessible with just a few lines of code. The SDK handles audio capture, streaming, partial results, and reconnection so you can focus on what to do with the transcribed text. Start with single-shot recognition for simple use cases, move to continuous recognition for longer conversations, and add language detection and timestamps as your requirements grow. For production systems, invest in phrase lists for your domain vocabulary and implement proper error handling for network interruptions.

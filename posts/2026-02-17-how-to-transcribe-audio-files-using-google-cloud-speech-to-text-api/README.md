# How to Transcribe Audio Files Using Google Cloud Speech-to-Text API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Speech-to-Text, Audio Transcription, Machine Learning, Cloud API

Description: A practical guide to transcribing audio files of any length using Google Cloud Speech-to-Text API with support for multiple languages and audio formats.

---

Transcribing audio to text is one of those tasks that has gotten dramatically easier with cloud APIs. Whether you need to transcribe meeting recordings, customer support calls, podcasts, or dictated notes, Google Cloud Speech-to-Text API handles the heavy lifting. It supports over 125 languages, handles noisy audio reasonably well, and can process everything from short voice commands to hours-long recordings.

In this guide, I will cover the three ways to transcribe audio with the API and help you pick the right approach for your use case.

## Three Transcription Methods

Speech-to-Text offers three methods depending on your audio length:

**Synchronous Recognition**: For audio up to 1 minute. You send the audio, wait, and get the result. Simple but limited.

**Asynchronous Recognition**: For audio up to 480 minutes (8 hours). The API processes the audio in the background and you poll for results or get notified when complete.

**Streaming Recognition**: For real-time transcription. You stream audio in and get results back as the audio is processed. Covered in a separate post.

For most file-based transcription, you will use asynchronous recognition.

## Prerequisites

Get set up with the API and client library:

```bash
# Enable the Speech-to-Text API
gcloud services enable speech.googleapis.com

# Install the Python client
pip install google-cloud-speech

# If your audio needs conversion, install ffmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
```

## Synchronous Transcription (Short Audio)

For audio clips under 1 minute:

```python
from google.cloud import speech

def transcribe_short_audio(audio_path, language_code="en-US"):
    """Transcribe a short audio file (under 1 minute)."""
    client = speech.SpeechClient()

    # Read the audio file
    with open(audio_path, "rb") as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)

    # Configure recognition settings
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code=language_code,
        enable_automatic_punctuation=True,  # Add periods, commas, etc.
        model="latest_long",  # Best accuracy for most use cases
    )

    # Perform synchronous recognition
    response = client.recognize(config=config, audio=audio)

    # Print the transcription results
    for result in response.results:
        print(f"Transcript: {result.alternatives[0].transcript}")
        print(f"Confidence: {result.alternatives[0].confidence:.2f}")

    return response

transcribe_short_audio("voice_note.wav")
```

## Asynchronous Transcription (Long Audio)

For audio longer than 1 minute, use the async method. The audio must be in Cloud Storage:

```python
from google.cloud import speech

def transcribe_long_audio(gcs_uri, language_code="en-US"):
    """Transcribe a long audio file stored in Cloud Storage."""
    client = speech.SpeechClient()

    # Reference the audio in GCS
    audio = speech.RecognitionAudio(uri=gcs_uri)

    # Configuration for long audio transcription
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
        sample_rate_hertz=44100,
        language_code=language_code,
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True,  # Get timestamps for each word
        model="latest_long",
        use_enhanced=True,  # Use the enhanced model for better accuracy
    )

    # Start the long-running operation
    print("Starting transcription...")
    operation = client.long_running_recognize(config=config, audio=audio)

    # Wait for the operation to complete
    print("Waiting for results (this may take a while)...")
    response = operation.result(timeout=3600)

    # Process the results
    full_transcript = []
    for result in response.results:
        alternative = result.alternatives[0]
        full_transcript.append(alternative.transcript)

        # Print word-level timestamps if requested
        for word in alternative.words:
            start = word.start_time.total_seconds()
            end = word.end_time.total_seconds()
            print(f"  [{start:.1f}s - {end:.1f}s] {word.word}")

    return " ".join(full_transcript)

# Upload your audio to GCS first
# gsutil cp meeting_recording.flac gs://your-bucket/audio/
transcript = transcribe_long_audio("gs://your-bucket/audio/meeting_recording.flac")
print(f"\nFull transcript:\n{transcript}")
```

## Handling Different Audio Formats

The API supports several audio encodings. Here is how to handle common formats:

```python
from google.cloud import speech

def get_config_for_format(file_path, language_code="en-US"):
    """Create the appropriate config based on audio file format."""
    extension = file_path.lower().split(".")[-1]

    # Map file extensions to encoding configs
    format_configs = {
        "wav": {
            "encoding": speech.RecognitionConfig.AudioEncoding.LINEAR16,
            "sample_rate_hertz": 16000,
        },
        "flac": {
            "encoding": speech.RecognitionConfig.AudioEncoding.FLAC,
            "sample_rate_hertz": 44100,
        },
        "mp3": {
            "encoding": speech.RecognitionConfig.AudioEncoding.MP3,
            "sample_rate_hertz": 16000,
        },
        "ogg": {
            "encoding": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            "sample_rate_hertz": 16000,
        },
        "webm": {
            "encoding": speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            "sample_rate_hertz": 48000,
        },
    }

    if extension not in format_configs:
        raise ValueError(f"Unsupported format: {extension}")

    fmt = format_configs[extension]

    config = speech.RecognitionConfig(
        encoding=fmt["encoding"],
        sample_rate_hertz=fmt["sample_rate_hertz"],
        language_code=language_code,
        enable_automatic_punctuation=True,
        model="latest_long",
    )

    return config
```

## Multi-Language Transcription

If your audio contains multiple languages, you can specify alternative languages:

```python
from google.cloud import speech

def transcribe_multilingual(gcs_uri, primary_language="en-US", additional_languages=None):
    """Transcribe audio that may contain multiple languages."""
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(uri=gcs_uri)

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
        sample_rate_hertz=44100,
        language_code=primary_language,
        # Provide alternative languages the audio might contain
        alternative_language_codes=additional_languages or [],
        enable_automatic_punctuation=True,
        model="latest_long",
    )

    operation = client.long_running_recognize(config=config, audio=audio)
    response = operation.result(timeout=3600)

    for result in response.results:
        alt = result.alternatives[0]
        # The detected language is included in the result
        detected_lang = result.language_code
        print(f"[{detected_lang}] {alt.transcript}")

    return response

# Transcribe audio that might switch between English and Spanish
transcribe_multilingual(
    gcs_uri="gs://your-bucket/audio/bilingual_call.flac",
    primary_language="en-US",
    additional_languages=["es-ES", "fr-FR"],
)
```

## Converting Audio Files for the API

Sometimes your audio is in a format the API does not directly support, or you need to adjust the sample rate. Use ffmpeg for conversion:

```python
import subprocess
import os

def convert_audio(input_path, output_path, sample_rate=16000, channels=1):
    """Convert audio to a format suitable for Speech-to-Text API."""
    # Convert to FLAC with the specified sample rate and channel count
    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-ar", str(sample_rate),  # Set sample rate
        "-ac", str(channels),     # Set to mono (recommended for speech)
        "-f", "flac",             # Output format
        "-y",                     # Overwrite output file
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr}")

    file_size = os.path.getsize(output_path)
    print(f"Converted: {input_path} -> {output_path} ({file_size / 1024 / 1024:.1f} MB)")

    return output_path

# Convert an MP4 video file to audio for transcription
convert_audio("meeting_video.mp4", "meeting_audio.flac")
```

## Building a Transcription Pipeline

Here is a complete pipeline that handles uploading, transcribing, and saving results:

```python
from google.cloud import speech, storage
import json
import os

def transcription_pipeline(audio_path, bucket_name, language="en-US"):
    """Complete pipeline: upload audio, transcribe, and save results."""
    storage_client = storage.Client()
    speech_client = speech.SpeechClient()

    # Step 1: Upload audio to GCS
    bucket = storage_client.bucket(bucket_name)
    blob_name = f"audio/{os.path.basename(audio_path)}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(audio_path)
    gcs_uri = f"gs://{bucket_name}/{blob_name}"
    print(f"Uploaded to: {gcs_uri}")

    # Step 2: Configure and start transcription
    audio = speech.RecognitionAudio(uri=gcs_uri)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
        sample_rate_hertz=16000,
        language_code=language,
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True,
        model="latest_long",
    )

    operation = speech_client.long_running_recognize(config=config, audio=audio)
    print("Transcribing...")
    response = operation.result(timeout=3600)

    # Step 3: Process and save results
    transcript_data = {
        "source_file": audio_path,
        "gcs_uri": gcs_uri,
        "language": language,
        "segments": [],
        "full_text": "",
    }

    full_text_parts = []
    for result in response.results:
        alt = result.alternatives[0]
        segment = {
            "text": alt.transcript,
            "confidence": alt.confidence,
            "words": [
                {
                    "word": w.word,
                    "start": w.start_time.total_seconds(),
                    "end": w.end_time.total_seconds(),
                }
                for w in alt.words
            ],
        }
        transcript_data["segments"].append(segment)
        full_text_parts.append(alt.transcript)

    transcript_data["full_text"] = " ".join(full_text_parts)

    # Save results locally
    output_path = audio_path.rsplit(".", 1)[0] + "_transcript.json"
    with open(output_path, "w") as f:
        json.dump(transcript_data, f, indent=2)

    print(f"Transcript saved to: {output_path}")
    print(f"Total words: {sum(len(s['words']) for s in transcript_data['segments'])}")

    return transcript_data

# Run the pipeline
result = transcription_pipeline("interview.flac", "your-transcription-bucket")
```

## Wrapping Up

Google Cloud Speech-to-Text makes audio transcription accessible and reliable. The key is choosing the right method for your audio length, using the correct encoding settings, and enabling features like automatic punctuation and word timestamps that make the output more useful. For production workloads, the async API combined with Cloud Storage is the way to go.

For monitoring your transcription pipeline's health and tracking job completion rates, [OneUptime](https://oneuptime.com) can help you ensure your audio processing workflows run smoothly.

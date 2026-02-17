# How to Enable Speaker Diarization in Cloud Speech-to-Text for Multi-Speaker Audio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Speech-to-Text, Speaker Diarization, Audio Processing, Transcription

Description: Learn how to use speaker diarization in Google Cloud Speech-to-Text to identify and label different speakers in multi-speaker audio recordings like meetings and interviews.

---

When you transcribe a meeting, interview, or podcast with multiple participants, a plain transcript is only half useful. You need to know who said what. Speaker diarization solves this by automatically identifying different speakers in an audio recording and labeling each word or segment with a speaker tag.

Google Cloud Speech-to-Text includes speaker diarization as a built-in feature. You do not need to train any models or provide voice samples - the API figures out who is speaking based on voice characteristics. Let me show you how to use it.

## What Speaker Diarization Does

Speaker diarization analyzes the audio and assigns a speaker label (Speaker 1, Speaker 2, etc.) to each word in the transcription. It does not identify who the speakers are by name - it just distinguishes between different voices. You get output like:

```
Speaker 1: Good morning, let's start the meeting.
Speaker 2: Sure, I have the Q4 numbers ready.
Speaker 1: Great, can you share those first?
Speaker 3: Before that, can we discuss the budget review?
```

The API handles overlapping speech, speaker changes mid-sentence, and varying numbers of participants.

## Basic Speaker Diarization

Here is how to enable diarization for a short audio file:

```python
from google.cloud import speech

def transcribe_with_diarization(audio_path, num_speakers=2):
    """Transcribe audio with speaker diarization enabled."""
    client = speech.SpeechClient()

    with open(audio_path, "rb") as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)

    # Configure diarization settings
    diarization_config = speech.SpeakerDiarizationConfig(
        enable_speaker_diarization=True,
        min_speaker_count=2,           # Minimum expected speakers
        max_speaker_count=num_speakers, # Maximum expected speakers
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        diarization_config=diarization_config,
        model="latest_long",
    )

    response = client.recognize(config=config, audio=audio)

    # The diarization results are in the last result
    result = response.results[-1]
    words = result.alternatives[0].words

    # Group words by speaker
    current_speaker = None
    current_text = []

    for word in words:
        if word.speaker_tag != current_speaker:
            # New speaker - print the previous speaker's text
            if current_speaker is not None:
                print(f"Speaker {current_speaker}: {' '.join(current_text)}")
                current_text = []
            current_speaker = word.speaker_tag

        current_text.append(word.word)

    # Print the last speaker's text
    if current_text:
        print(f"Speaker {current_speaker}: {' '.join(current_text)}")

    return words

transcribe_with_diarization("meeting_recording.wav", num_speakers=3)
```

## Long Audio with Diarization

For recordings longer than 1 minute, use the async API with Cloud Storage:

```python
from google.cloud import speech

def transcribe_long_with_diarization(gcs_uri, min_speakers=2, max_speakers=6):
    """Transcribe a long audio file with speaker diarization."""
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(uri=gcs_uri)

    diarization_config = speech.SpeakerDiarizationConfig(
        enable_speaker_diarization=True,
        min_speaker_count=min_speakers,
        max_speaker_count=max_speakers,
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
        sample_rate_hertz=44100,
        language_code="en-US",
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True,  # Get timestamps for each word
        diarization_config=diarization_config,
        model="latest_long",
    )

    print("Starting transcription with diarization...")
    operation = client.long_running_recognize(config=config, audio=audio)
    response = operation.result(timeout=3600)

    # Process the diarized results
    result = response.results[-1]
    words = result.alternatives[0].words

    return words

words = transcribe_long_with_diarization(
    gcs_uri="gs://your-bucket/meetings/team-standup.flac",
    min_speakers=3,
    max_speakers=8,
)
```

## Formatting Diarized Output

Raw word-level diarization data needs formatting to be useful. Here is a function that creates a clean, readable transcript:

```python
def format_diarized_transcript(words):
    """Format word-level diarization into a readable transcript."""
    if not words:
        return ""

    segments = []
    current_speaker = words[0].speaker_tag
    current_words = []
    segment_start = words[0].start_time.total_seconds()

    for word in words:
        if word.speaker_tag != current_speaker:
            # Speaker changed - save the current segment
            segment_end = current_words[-1].end_time.total_seconds() if current_words else 0
            segments.append({
                "speaker": current_speaker,
                "text": " ".join([w.word for w in current_words]),
                "start_time": segment_start,
                "end_time": segment_end,
            })

            # Start a new segment
            current_speaker = word.speaker_tag
            current_words = []
            segment_start = word.start_time.total_seconds()

        current_words.append(word)

    # Add the last segment
    if current_words:
        segments.append({
            "speaker": current_speaker,
            "text": " ".join([w.word for w in current_words]),
            "start_time": segment_start,
            "end_time": current_words[-1].end_time.total_seconds(),
        })

    # Format the output
    formatted_lines = []
    for seg in segments:
        timestamp = format_timestamp(seg["start_time"])
        formatted_lines.append(f"[{timestamp}] Speaker {seg['speaker']}: {seg['text']}")

    return "\n\n".join(formatted_lines)


def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

# Format and print the transcript
formatted = format_diarized_transcript(words)
print(formatted)
```

## Building a Meeting Transcript Generator

Here is a complete meeting transcription tool that produces a structured output:

```python
from google.cloud import speech, storage
import json
import os
from collections import Counter

def generate_meeting_transcript(audio_path, bucket_name, output_path, num_speakers=4):
    """Generate a structured meeting transcript with speaker statistics."""
    # Upload to GCS if it is a local file
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    blob_name = f"meetings/{os.path.basename(audio_path)}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(audio_path)
    gcs_uri = f"gs://{bucket_name}/{blob_name}"

    # Run transcription with diarization
    speech_client = speech.SpeechClient()

    diarization_config = speech.SpeakerDiarizationConfig(
        enable_speaker_diarization=True,
        min_speaker_count=2,
        max_speaker_count=num_speakers,
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True,
        diarization_config=diarization_config,
        model="latest_long",
    )

    audio = speech.RecognitionAudio(uri=gcs_uri)
    operation = speech_client.long_running_recognize(config=config, audio=audio)

    print("Transcribing meeting (this may take a while)...")
    response = operation.result(timeout=3600)

    # Process results
    result = response.results[-1]
    words = result.alternatives[0].words

    # Build segments
    segments = build_segments(words)

    # Calculate speaker statistics
    speaker_stats = calculate_speaker_stats(segments)

    # Create the meeting transcript document
    transcript = {
        "source_file": audio_path,
        "total_duration_seconds": words[-1].end_time.total_seconds() if words else 0,
        "num_speakers_detected": len(speaker_stats),
        "speaker_statistics": speaker_stats,
        "segments": [
            {
                "speaker": s["speaker"],
                "text": s["text"],
                "start_time": s["start_time"],
                "end_time": s["end_time"],
                "duration": round(s["end_time"] - s["start_time"], 1),
            }
            for s in segments
        ],
    }

    # Save the transcript
    with open(output_path, "w") as f:
        json.dump(transcript, f, indent=2)

    print(f"\nTranscript saved to: {output_path}")
    print(f"Duration: {format_timestamp(transcript['total_duration_seconds'])}")
    print(f"Speakers detected: {transcript['num_speakers_detected']}")

    for speaker_id, stats in speaker_stats.items():
        print(f"  Speaker {speaker_id}: {stats['word_count']} words, "
              f"{stats['speaking_time']:.0f}s speaking time")

    return transcript


def build_segments(words):
    """Group words into speaker segments."""
    if not words:
        return []

    segments = []
    current_speaker = words[0].speaker_tag
    current_words = []
    segment_start = words[0].start_time.total_seconds()

    for word in words:
        if word.speaker_tag != current_speaker:
            if current_words:
                segments.append({
                    "speaker": current_speaker,
                    "text": " ".join([w.word for w in current_words]),
                    "start_time": segment_start,
                    "end_time": current_words[-1].end_time.total_seconds(),
                })
            current_speaker = word.speaker_tag
            current_words = []
            segment_start = word.start_time.total_seconds()

        current_words.append(word)

    if current_words:
        segments.append({
            "speaker": current_speaker,
            "text": " ".join([w.word for w in current_words]),
            "start_time": segment_start,
            "end_time": current_words[-1].end_time.total_seconds(),
        })

    return segments


def calculate_speaker_stats(segments):
    """Calculate speaking statistics for each speaker."""
    stats = {}

    for seg in segments:
        speaker = seg["speaker"]
        if speaker not in stats:
            stats[speaker] = {"word_count": 0, "speaking_time": 0, "segment_count": 0}

        stats[speaker]["word_count"] += len(seg["text"].split())
        stats[speaker]["speaking_time"] += seg["end_time"] - seg["start_time"]
        stats[speaker]["segment_count"] += 1

    # Round values
    for speaker in stats:
        stats[speaker]["speaking_time"] = round(stats[speaker]["speaking_time"], 1)

    return stats
```

## Tips for Better Diarization Results

A few things that improve diarization accuracy:

- Set the min and max speaker count as accurately as possible. If you know there are exactly 3 speakers, set both to 3.
- Use high-quality audio. Background noise and echo make it harder for the API to distinguish speakers.
- Mono audio works fine for diarization. You do not need separate channels per speaker.
- Overlapping speech is challenging for any diarization system. Results are less accurate when multiple people talk simultaneously.
- Short utterances (just a few words) are harder to attribute to the correct speaker.

## Wrapping Up

Speaker diarization transforms a plain transcript into a structured conversation record. For meetings, interviews, and multi-speaker recordings, knowing who said what is often as important as what was said. The Cloud Speech-to-Text diarization feature handles this without any training or speaker enrollment, making it practical for most transcription use cases.

For monitoring the health of your transcription services and tracking processing times, [OneUptime](https://oneuptime.com) helps you keep tabs on your audio processing pipeline and catch issues early.

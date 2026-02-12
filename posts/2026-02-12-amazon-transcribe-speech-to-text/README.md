# How to Use Amazon Transcribe for Speech-to-Text

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Transcribe, Speech-to-Text, Audio, Transcription

Description: Learn how to convert audio and video files to text with Amazon Transcribe, including custom vocabularies, speaker identification, and real-time streaming.

---

Amazon Transcribe is AWS's automatic speech recognition service. It converts audio to text with impressive accuracy, handles multiple speakers, supports dozens of languages, and can be customized for your domain's vocabulary. Whether you're transcribing meeting recordings, building voice interfaces, creating subtitles, or processing call center audio, Transcribe handles the heavy lifting.

The service works in two modes: batch transcription for pre-recorded audio files and streaming transcription for real-time audio. Let's dig into both.

## Batch Transcription

The most common use case is transcribing audio files stored in S3. You start a transcription job, wait for it to complete, and retrieve the results.

```python
import boto3
import json
import time

transcribe = boto3.client('transcribe', region_name='us-east-1')

def start_transcription(job_name, media_uri, language='en-US', settings=None):
    """Start a batch transcription job.

    Args:
        job_name: Unique name for the job
        media_uri: S3 URI of the audio file
        language: Language code (e.g., 'en-US', 'es-ES', 'fr-FR')
        settings: Optional dict of transcription settings
    """
    params = {
        'TranscriptionJobName': job_name,
        'Media': {'MediaFileUri': media_uri},
        'LanguageCode': language,
        'OutputBucketName': 'my-transcription-output'
    }

    if settings:
        params['Settings'] = settings

    response = transcribe.start_transcription_job(**params)
    print(f"Transcription job started: {job_name}")
    return response

def wait_for_transcription(job_name):
    """Wait for a transcription job to complete and return results."""
    while True:
        response = transcribe.get_transcription_job(
            TranscriptionJobName=job_name
        )
        status = response['TranscriptionJob']['TranscriptionJobStatus']

        if status == 'COMPLETED':
            result_uri = response['TranscriptionJob']['Transcript']['TranscriptFileUri']
            print(f"Transcription complete! Results at: {result_uri}")
            return response['TranscriptionJob']

        elif status == 'FAILED':
            reason = response['TranscriptionJob'].get('FailureReason', 'Unknown')
            print(f"Transcription failed: {reason}")
            return None

        print(f"Status: {status}")
        time.sleep(15)

# Transcribe an audio file
start_transcription(
    job_name='meeting-2026-02-12',
    media_uri='s3://my-audio-bucket/meetings/standup-feb12.mp3',
    language='en-US'
)

result = wait_for_transcription('meeting-2026-02-12')
```

## Processing the Transcript

The transcription output includes the full text, word-level timestamps, confidence scores, and speaker labels if enabled.

```python
def parse_transcript(bucket, key):
    """Download and parse a Transcribe output file."""
    s3 = boto3.client('s3', region_name='us-east-1')

    response = s3.get_object(Bucket=bucket, Key=key)
    transcript_data = json.loads(response['Body'].read())

    results = transcript_data['results']

    # Full transcript text
    full_text = results['transcripts'][0]['transcript']
    print(f"Full transcript ({len(full_text)} chars):")
    print(full_text[:500])
    print()

    # Word-level details
    items = results.get('items', [])
    print(f"Total items: {len(items)}")

    # Show first few words with confidence
    for item in items[:10]:
        if item['type'] == 'pronunciation':
            word = item['alternatives'][0]['content']
            confidence = float(item['alternatives'][0]['confidence'])
            start_time = item.get('start_time', 'N/A')
            print(f"  {start_time}s: '{word}' (confidence: {confidence:.2%})")

    return transcript_data

# Parse the output
transcript = parse_transcript('my-transcription-output', 'meeting-2026-02-12.json')
```

## Speaker Identification

For meetings and multi-speaker recordings, enable speaker diarization to identify who said what.

```python
def transcribe_with_speakers(job_name, media_uri, max_speakers=10):
    """Transcribe audio with speaker identification."""
    response = transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': media_uri},
        LanguageCode='en-US',
        Settings={
            'ShowSpeakerLabels': True,
            'MaxSpeakerLabels': max_speakers
        }
    )

    # Wait for completion
    result = wait_for_transcription(job_name)
    return result

def format_speaker_transcript(transcript_data):
    """Format a transcript with speaker labels."""
    results = transcript_data['results']
    items = results.get('items', [])

    # Build speaker segments from the speaker_labels data
    speaker_labels = results.get('speaker_labels', {})
    segments = speaker_labels.get('segments', [])

    formatted_lines = []
    current_speaker = None

    for segment in segments:
        speaker = segment['speaker_label']
        # Get text for this segment's time range
        segment_text = []
        for item in segment.get('items', []):
            if item.get('type') == 'pronunciation':
                segment_text.append(item['alternatives'][0]['content'])
            elif item.get('type') == 'punctuation':
                if segment_text:
                    segment_text[-1] += item['alternatives'][0]['content']

        text = ' '.join(segment_text)

        if speaker != current_speaker:
            current_speaker = speaker
            formatted_lines.append(f"\n{speaker}:")

        formatted_lines.append(f"  {text}")

    formatted = '\n'.join(formatted_lines)
    print(formatted)
    return formatted

# Transcribe a meeting with speaker identification
transcribe_with_speakers(
    'team-meeting-feb12',
    's3://meetings/team-standup.mp3',
    max_speakers=5
)
```

## Custom Vocabulary

Custom vocabularies improve accuracy for domain-specific terms, product names, and jargon that Transcribe might not recognize out of the box.

```python
def create_custom_vocabulary(vocab_name, phrases, language='en-US'):
    """Create a custom vocabulary for improved recognition of specific terms."""
    response = transcribe.create_vocabulary(
        VocabularyName=vocab_name,
        LanguageCode=language,
        Phrases=phrases
    )

    print(f"Vocabulary '{vocab_name}' creation started")

    # Wait for it to be ready
    while True:
        result = transcribe.get_vocabulary(VocabularyName=vocab_name)
        status = result['VocabularyState']
        if status == 'READY':
            print("Vocabulary is ready!")
            return result
        elif status == 'FAILED':
            print(f"Vocabulary creation failed: {result.get('FailureReason', '')}")
            return None
        time.sleep(10)

# Create vocabulary with tech terms and product names
vocab_phrases = [
    'OneUptime',
    'StatusPage',
    'Kubernetes',
    'kubectl',
    'Prometheus',
    'Grafana',
    'microservices',
    'observability',
    'SRE',
    'MTTR',
    'P99-latency'
]

create_custom_vocabulary('tech-monitoring-vocab', vocab_phrases)

# Use the vocabulary in transcription
start_transcription(
    job_name='tech-meeting-with-vocab',
    media_uri='s3://meetings/architecture-review.mp3',
    settings={
        'VocabularyName': 'tech-monitoring-vocab',
        'ShowSpeakerLabels': True,
        'MaxSpeakerLabels': 6
    }
)
```

## Real-Time Streaming Transcription

For live audio, use the streaming API. This is essential for real-time captioning, voice assistants, and live transcription displays.

```python
import asyncio
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent

class StreamingHandler(TranscriptResultStreamHandler):
    """Handle real-time transcription events."""

    async def handle_transcript_event(self, transcript_event: TranscriptEvent):
        results = transcript_event.transcript.results

        for result in results:
            if not result.is_partial:
                # This is a finalized transcript segment
                for alt in result.alternatives:
                    print(f"[Final] {alt.transcript}")
            else:
                # This is a partial result (still being processed)
                for alt in result.alternatives:
                    print(f"[Partial] {alt.transcript}", end='\r')

async def stream_audio_file(audio_file_path):
    """Stream an audio file for real-time transcription."""
    client = TranscribeStreamingClient(region='us-east-1')

    stream = await client.start_stream_transcription(
        language_code='en-US',
        media_sample_rate_hz=16000,
        media_encoding='pcm'
    )

    handler = StreamingHandler(stream.output_stream)

    # Read and send audio chunks
    async def send_audio():
        chunk_size = 1024 * 16  # 16KB chunks
        with open(audio_file_path, 'rb') as f:
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                await stream.input_stream.send_audio_event(audio_chunk=data)
                await asyncio.sleep(0.05)  # Simulate real-time pacing

        await stream.input_stream.end_stream()

    # Run sending and receiving concurrently
    await asyncio.gather(send_audio(), handler.handle_events())

# Run the streaming transcription
# asyncio.run(stream_audio_file('live-audio.raw'))
```

## Automatic Language Identification

When you don't know what language the audio is in, Transcribe can automatically detect it.

```python
def transcribe_auto_language(job_name, media_uri, possible_languages=None):
    """Transcribe with automatic language identification."""
    if possible_languages is None:
        possible_languages = ['en-US', 'es-US', 'fr-FR', 'de-DE', 'ja-JP']

    response = transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': media_uri},
        IdentifyLanguage=True,
        LanguageOptions=possible_languages
    )

    result = wait_for_transcription(job_name)

    if result:
        detected = result.get('LanguageCode', 'unknown')
        confidence = result.get('IdentifiedLanguageScore', 0)
        print(f"Detected language: {detected} (confidence: {confidence:.2%})")

    return result
```

## Building a Transcription Pipeline

Here's a complete pipeline triggered by S3 uploads.

```python
import os
import uuid

class TranscriptionPipeline:
    """Automated transcription pipeline for audio files."""

    def __init__(self, output_bucket):
        self.transcribe = boto3.client('transcribe', region_name='us-east-1')
        self.s3 = boto3.client('s3', region_name='us-east-1')
        self.output_bucket = output_bucket

    def process(self, bucket, key, options=None):
        """Process an audio file through the transcription pipeline."""
        options = options or {}
        job_name = f"transcribe-{uuid.uuid4().hex[:8]}"

        # Determine settings
        settings = {}
        if options.get('speakers', False):
            settings['ShowSpeakerLabels'] = True
            settings['MaxSpeakerLabels'] = options.get('max_speakers', 10)

        if options.get('vocabulary'):
            settings['VocabularyName'] = options['vocabulary']

        # Start transcription
        params = {
            'TranscriptionJobName': job_name,
            'Media': {'MediaFileUri': f's3://{bucket}/{key}'},
            'OutputBucketName': self.output_bucket
        }

        if options.get('language'):
            params['LanguageCode'] = options['language']
        else:
            params['IdentifyLanguage'] = True
            params['LanguageOptions'] = ['en-US', 'es-US', 'fr-FR']

        if settings:
            params['Settings'] = settings

        self.transcribe.start_transcription_job(**params)

        # Wait and return results
        result = wait_for_transcription(job_name)
        if result:
            transcript = self._download_transcript(job_name)
            return transcript

        return None

    def _download_transcript(self, job_name):
        """Download and parse the transcript from S3."""
        key = f'{job_name}.json'
        try:
            response = self.s3.get_object(
                Bucket=self.output_bucket,
                Key=key
            )
            return json.loads(response['Body'].read())
        except Exception as e:
            print(f"Error downloading transcript: {e}")
            return None

# Usage
pipeline = TranscriptionPipeline('transcription-results')
transcript = pipeline.process(
    'audio-uploads',
    'calls/support-call-001.mp3',
    options={
        'speakers': True,
        'max_speakers': 2,
        'vocabulary': 'tech-monitoring-vocab'
    }
)
```

For meeting-specific transcription with features like action item detection, see our guide on [Amazon Transcribe for meeting transcription](https://oneuptime.com/blog/post/amazon-transcribe-meeting-transcription/view). For healthcare applications with medical terminology support, check out [Amazon Transcribe Medical](https://oneuptime.com/blog/post/amazon-transcribe-medical-healthcare/view).

Amazon Transcribe handles the most common speech-to-text needs well out of the box, and custom vocabularies fill in the gaps for domain-specific terminology. Start with batch transcription to validate quality, then move to streaming when you need real-time results.

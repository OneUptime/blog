# How to Use Amazon Transcribe for Meeting Transcription

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Transcribe, Meeting Transcription, Productivity

Description: Build automated meeting transcription systems with Amazon Transcribe including speaker identification, action item extraction, and searchable meeting archives.

---

Meeting transcription is one of those things that sounds simple but gets complicated fast. You've got multiple speakers talking over each other, domain-specific jargon, background noise, and the need to figure out not just what was said, but who said it. Amazon Transcribe handles most of this surprisingly well, especially when you take advantage of speaker diarization, custom vocabularies, and post-processing.

This guide walks through building a meeting transcription system - from basic transcription to a fully featured pipeline that generates summaries, extracts action items, and stores everything in a searchable archive.

## Basic Meeting Transcription with Speaker Labels

The foundation of meeting transcription is Transcribe's speaker diarization feature, which identifies different speakers in the audio.

```python
import boto3
import json
import time

transcribe = boto3.client('transcribe', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')

def transcribe_meeting(job_name, audio_uri, max_speakers=10, vocabulary=None):
    """Transcribe a meeting recording with speaker identification."""
    settings = {
        'ShowSpeakerLabels': True,
        'MaxSpeakerLabels': max_speakers,
        'ChannelIdentification': False
    }

    if vocabulary:
        settings['VocabularyName'] = vocabulary

    response = transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': audio_uri},
        LanguageCode='en-US',
        Settings=settings,
        OutputBucketName='meeting-transcripts'
    )

    print(f"Transcription job started: {job_name}")

    # Wait for completion
    while True:
        result = transcribe.get_transcription_job(
            TranscriptionJobName=job_name
        )
        status = result['TranscriptionJob']['TranscriptionJobStatus']

        if status == 'COMPLETED':
            print("Transcription complete!")
            return result['TranscriptionJob']
        elif status == 'FAILED':
            reason = result['TranscriptionJob'].get('FailureReason', '')
            print(f"Failed: {reason}")
            return None

        time.sleep(15)

# Transcribe a meeting
result = transcribe_meeting(
    job_name='standup-2026-02-12',
    audio_uri='s3://meetings/recordings/standup-feb12.mp3',
    max_speakers=6,
    vocabulary='company-terms'
)
```

## Formatting the Transcript

Raw Transcribe output needs formatting to be human-readable. Here's how to build a clean, timestamped transcript with speaker labels.

```python
def format_meeting_transcript(transcript_data):
    """Convert raw Transcribe output into a readable meeting transcript."""
    results = transcript_data['results']

    # Get speaker segments
    speaker_labels = results.get('speaker_labels', {})
    segments = speaker_labels.get('segments', [])

    if not segments:
        # No speaker labels - return plain text
        return results['transcripts'][0]['transcript']

    # Build a timeline of speaker segments
    formatted_lines = []
    current_speaker = None
    current_text = []
    segment_start = None

    for segment in segments:
        speaker = segment['speaker_label']
        start_time = float(segment['start_time'])
        end_time = float(segment['end_time'])

        # Collect words for this segment
        words = []
        for item in segment.get('items', []):
            if item.get('type') == 'pronunciation':
                words.append(item['alternatives'][0]['content'])
            elif item.get('type') == 'punctuation':
                if words:
                    words[-1] += item['alternatives'][0]['content']

        text = ' '.join(words)

        if speaker != current_speaker:
            # Save previous speaker's text
            if current_speaker and current_text:
                timestamp = format_timestamp(segment_start)
                formatted_lines.append(
                    f"[{timestamp}] {current_speaker}: {' '.join(current_text)}"
                )

            current_speaker = speaker
            current_text = [text] if text else []
            segment_start = start_time
        else:
            if text:
                current_text.append(text)

    # Don't forget the last segment
    if current_speaker and current_text:
        timestamp = format_timestamp(segment_start)
        formatted_lines.append(
            f"[{timestamp}] {current_speaker}: {' '.join(current_text)}"
        )

    return '\n\n'.join(formatted_lines)

def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

# Download and format the transcript
def get_formatted_transcript(job_name):
    """Download transcript from S3 and format it."""
    response = s3.get_object(
        Bucket='meeting-transcripts',
        Key=f'{job_name}.json'
    )
    transcript_data = json.loads(response['Body'].read())
    return format_meeting_transcript(transcript_data)

formatted = get_formatted_transcript('standup-2026-02-12')
print(formatted)
```

## Multi-Channel Transcription

If your meeting is recorded with separate audio channels (like a conference system where each participant has their own channel), use channel identification for better speaker accuracy.

```python
def transcribe_multichannel(job_name, audio_uri, num_channels=2):
    """Transcribe a multi-channel recording with per-channel speaker ID."""
    response = transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': audio_uri},
        LanguageCode='en-US',
        Settings={
            'ChannelIdentification': True,
            # Channel identification provides more accurate speaker
            # separation than speaker diarization for multi-channel audio
        },
        OutputBucketName='meeting-transcripts'
    )

    # Wait for completion and return
    while True:
        result = transcribe.get_transcription_job(
            TranscriptionJobName=job_name
        )
        status = result['TranscriptionJob']['TranscriptionJobStatus']
        if status in ['COMPLETED', 'FAILED']:
            return result['TranscriptionJob']
        time.sleep(15)
```

## Extracting Action Items and Summaries

Once you have a transcript, use a foundation model to extract action items, decisions, and summaries. This is where you get real productivity gains.

```python
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

def extract_meeting_insights(transcript_text):
    """Extract action items, decisions, and summary from a meeting transcript."""
    prompt = f"""Analyze this meeting transcript and extract:

1. A brief summary (2-3 sentences)
2. Key decisions made
3. Action items with assigned owners (if mentioned) and deadlines (if mentioned)
4. Open questions or topics that need follow-up

Format the output as JSON with keys: summary, decisions, action_items, open_questions

Meeting transcript:
{transcript_text[:10000]}"""  # Trim if very long

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 2048,
            'temperature': 0.2,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )

    result = json.loads(response['body'].read())
    insights_text = result['content'][0]['text']

    # Try to parse as JSON
    try:
        # Find JSON in the response
        import re
        json_match = re.search(r'\{[\s\S]*\}', insights_text)
        if json_match:
            insights = json.loads(json_match.group())
            return insights
    except json.JSONDecodeError:
        pass

    return {'raw': insights_text}

# Extract insights from the transcript
insights = extract_meeting_insights(formatted)
print(json.dumps(insights, indent=2))
```

## Building a Complete Meeting Pipeline

Here's a full pipeline that handles the entire flow from audio upload to searchable archive.

```python
from datetime import datetime

class MeetingTranscriptionPipeline:
    """End-to-end meeting transcription and analysis pipeline."""

    def __init__(self, config):
        self.transcribe = boto3.client('transcribe', region_name='us-east-1')
        self.s3 = boto3.client('s3', region_name='us-east-1')
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.meetings_table = self.dynamodb.Table(config['table_name'])
        self.output_bucket = config['output_bucket']
        self.vocabulary = config.get('vocabulary')

    def process_meeting(self, meeting_id, audio_bucket, audio_key, metadata=None):
        """Process a meeting recording end-to-end."""
        metadata = metadata or {}
        job_name = f"meeting-{meeting_id}"

        print(f"Processing meeting: {meeting_id}")

        # Step 1: Transcribe
        print("Step 1: Transcribing audio...")
        self._start_transcription(job_name, audio_bucket, audio_key)
        transcript_data = self._wait_and_get_transcript(job_name)

        if not transcript_data:
            return {'status': 'failed', 'step': 'transcription'}

        # Step 2: Format transcript
        print("Step 2: Formatting transcript...")
        formatted_transcript = format_meeting_transcript(transcript_data)

        # Step 3: Extract insights
        print("Step 3: Extracting insights...")
        insights = extract_meeting_insights(formatted_transcript)

        # Step 4: Store everything
        print("Step 4: Storing results...")
        self._store_results(meeting_id, {
            'transcript': formatted_transcript,
            'insights': insights,
            'metadata': metadata,
            'audio_location': f's3://{audio_bucket}/{audio_key}'
        })

        # Step 5: Save formatted transcript to S3
        self.s3.put_object(
            Bucket=self.output_bucket,
            Key=f'transcripts/{meeting_id}.txt',
            Body=formatted_transcript.encode('utf-8'),
            ContentType='text/plain'
        )

        # Save insights as JSON
        self.s3.put_object(
            Bucket=self.output_bucket,
            Key=f'insights/{meeting_id}.json',
            Body=json.dumps(insights, indent=2).encode('utf-8'),
            ContentType='application/json'
        )

        print(f"Meeting {meeting_id} processed successfully!")
        return {
            'status': 'success',
            'meeting_id': meeting_id,
            'transcript_length': len(formatted_transcript),
            'insights': insights
        }

    def _start_transcription(self, job_name, bucket, key):
        """Start the Transcribe job."""
        settings = {
            'ShowSpeakerLabels': True,
            'MaxSpeakerLabels': 10
        }

        if self.vocabulary:
            settings['VocabularyName'] = self.vocabulary

        self.transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{bucket}/{key}'},
            LanguageCode='en-US',
            Settings=settings,
            OutputBucketName=self.output_bucket,
            OutputKey=f'raw/{job_name}.json'
        )

    def _wait_and_get_transcript(self, job_name):
        """Wait for transcription and download results."""
        while True:
            result = self.transcribe.get_transcription_job(
                TranscriptionJobName=job_name
            )
            status = result['TranscriptionJob']['TranscriptionJobStatus']

            if status == 'COMPLETED':
                # Download from S3
                response = self.s3.get_object(
                    Bucket=self.output_bucket,
                    Key=f'raw/{job_name}.json'
                )
                return json.loads(response['Body'].read())
            elif status == 'FAILED':
                return None

            time.sleep(15)

    def _store_results(self, meeting_id, data):
        """Store meeting results in DynamoDB."""
        self.meetings_table.put_item(Item={
            'meeting_id': meeting_id,
            'processed_at': datetime.utcnow().isoformat(),
            'summary': data['insights'].get('summary', ''),
            'action_items': json.dumps(data['insights'].get('action_items', [])),
            'decisions': json.dumps(data['insights'].get('decisions', [])),
            'transcript_s3': f"s3://{self.output_bucket}/transcripts/{meeting_id}.txt",
            'audio_location': data['audio_location'],
            'metadata': json.dumps(data['metadata'])
        })

# Usage
pipeline = MeetingTranscriptionPipeline({
    'table_name': 'meeting-transcripts',
    'output_bucket': 'meeting-archive',
    'vocabulary': 'company-terms'
})

result = pipeline.process_meeting(
    meeting_id='standup-2026-02-12',
    audio_bucket='meeting-recordings',
    audio_key='2026/02/12/standup.mp3',
    metadata={
        'meeting_type': 'standup',
        'team': 'engineering',
        'attendees': ['Alice', 'Bob', 'Carol']
    }
)
```

## Searching Meeting Archives

With transcripts stored in DynamoDB and S3, you can build search functionality.

```python
def search_meetings(query, table_name='meeting-transcripts'):
    """Search through meeting transcripts and summaries."""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table(table_name)

    # Scan with filter (for production, use OpenSearch)
    response = table.scan(
        FilterExpression='contains(summary, :q)',
        ExpressionAttributeValues={':q': query}
    )

    results = response['Items']
    for item in results:
        print(f"Meeting: {item['meeting_id']}")
        print(f"  Date: {item['processed_at']}")
        print(f"  Summary: {item['summary'][:200]}")
        print()

    return results

# Search for meetings about specific topics
search_meetings('deployment')
search_meetings('monitoring')
```

## Tips for Better Transcription Quality

Audio quality makes a huge difference. Use a decent microphone, minimize background noise, and record at 16kHz or higher. If participants are on different devices, multi-channel recording gives much better speaker separation than mixing everything into one track.

Custom vocabularies are worth the setup time. Add your company name, product names, technical terms, people's names, and any jargon your team uses regularly.

For real-time meeting transcription, check out our guide on [Amazon Transcribe speech-to-text](https://oneuptime.com/blog/post/2026-02-12-amazon-transcribe-speech-to-text/view) which covers the streaming API in detail. And for monitoring the health of your transcription pipeline, see our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).

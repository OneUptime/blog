# How to Use Amazon Transcribe Medical for Healthcare

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Transcribe, Healthcare, Medical Transcription

Description: Learn how to use Amazon Transcribe Medical for healthcare-specific speech-to-text including clinical conversations, medical dictation, and HIPAA-compliant workflows.

---

Medical transcription has always been expensive and slow. Doctors dictate notes, human transcriptionists type them up, and the whole process introduces delays and errors into patient care documentation. Amazon Transcribe Medical changes this equation by providing automatic speech recognition specifically tuned for healthcare.

Unlike general-purpose Transcribe, the Medical version understands medical terminology out of the box - drug names, procedures, diagnoses, anatomy, and the particular way clinicians speak during patient encounters. It's HIPAA eligible, which means you can process protected health information (PHI) with it, assuming you have a proper BAA (Business Associate Agreement) with AWS.

## General Transcribe vs. Transcribe Medical

The key difference is domain knowledge. General Transcribe might hear "acetaminophen" and transcribe it as "a set of mini fan." Medical Transcribe gets it right because it's been trained on medical speech. It also understands medical abbreviations, drug dosages, and the conversational patterns common in clinical settings.

For batch jobs, Transcribe Medical supports **Primary Care**. For real-time streaming, it supports additional specialties including **Cardiology**, **Neurology**, **Oncology**, **Radiology**, and **Urology**.

## Basic Medical Transcription

Here's how to transcribe a medical dictation.

```python
import boto3
import json
import time

transcribe = boto3.client('transcribe', region_name='us-east-1')

def transcribe_medical_audio(job_name, media_uri, audio_type='DICTATION'):
    """Transcribe medical audio using Amazon Transcribe Medical.

    Args:
        job_name: Unique job identifier
        media_uri: S3 URI of the audio file
        audio_type: 'DICTATION' (single speaker) or 'CONVERSATION' (multi-speaker)
    """
    settings = {}
    if audio_type == 'CONVERSATION':
        settings = {
            'ShowSpeakerLabels': True,
            'MaxSpeakerLabels': 2
        }

    request = {
        'MedicalTranscriptionJobName': job_name,
        'Media': {'MediaFileUri': media_uri},
        'LanguageCode': 'en-US',
        'Specialty': 'PRIMARYCARE',
        'Type': audio_type,
        'OutputBucketName': 'medical-transcripts'
    }
    if settings:
        request['Settings'] = settings

    response = transcribe.start_medical_transcription_job(**request)

    print(f"Medical transcription job started: {job_name}")
    return response

def wait_for_medical_transcription(job_name):
    """Wait for a medical transcription job to complete."""
    while True:
        response = transcribe.get_medical_transcription_job(
            MedicalTranscriptionJobName=job_name
        )
        job = response['MedicalTranscriptionJob']
        status = job['TranscriptionJobStatus']

        if status == 'COMPLETED':
            uri = job['Transcript']['TranscriptFileUri']
            print(f"Transcription complete! URI: {uri}")
            return job
        elif status == 'FAILED':
            reason = job.get('FailureReason', 'Unknown')
            print(f"Transcription failed: {reason}")
            return None

        print(f"Status: {status}")
        time.sleep(15)

# Transcribe a physician's dictation

transcribe_medical_audio(
    'patient-note-2026-02-12',
    's3://medical-audio/dictations/dr-smith-note-001.mp3',
    audio_type='DICTATION'
)

result = wait_for_medical_transcription('patient-note-2026-02-12')
```

## Processing Medical Transcripts

Medical transcripts have the same core structure as regular Transcribe output, with optional PHI labels when you enable content identification.

```python
def parse_medical_transcript(bucket, key):
    """Parse a medical transcription result."""
    s3 = boto3.client('s3', region_name='us-east-1')

    response = s3.get_object(Bucket=bucket, Key=key)
    transcript_data = json.loads(response['Body'].read())

    results = transcript_data['results']

    # Full transcript
    full_text = results['transcripts'][0]['transcript']
    print(f"Transcript ({len(full_text)} chars):")
    print(full_text)
    print()

    # Word-level confidence analysis
    items = results.get('items', [])
    low_confidence_words = []

    for item in items:
        if item['type'] == 'pronunciation':
            alt = item['alternatives'][0]
            confidence = float(alt['confidence'])
            if confidence < 0.8:
                low_confidence_words.append({
                    'word': alt['content'],
                    'confidence': confidence,
                    'time': item.get('start_time', 'N/A')
                })

    if low_confidence_words:
        print(f"\nLow-confidence words ({len(low_confidence_words)}):")
        for w in low_confidence_words:
            print(f"  '{w['word']}' at {w['time']}s "
                  f"(confidence: {w['confidence']:.2%})")

    return transcript_data

transcript = parse_medical_transcript('medical-transcripts', 'patient-note-2026-02-12.json')
```

## Clinical Conversation Transcription

For doctor-patient conversations, you need speaker diarization to separate the clinician's observations from the patient's responses.

```python
def transcribe_clinical_conversation(job_name, audio_uri):
    """Transcribe a doctor-patient conversation with speaker labels."""
    response = transcribe.start_medical_transcription_job(
        MedicalTranscriptionJobName=job_name,
        Media={'MediaFileUri': audio_uri},
        LanguageCode='en-US',
        Specialty='PRIMARYCARE',
        Type='CONVERSATION',
        Settings={
            'ShowSpeakerLabels': True,
            'MaxSpeakerLabels': 2
        },
        OutputBucketName='medical-transcripts'
    )

    return wait_for_medical_transcription(job_name)

def format_clinical_transcript(transcript_data, speaker_map=None):
    """Format a clinical conversation transcript with speaker labels.

    Args:
        transcript_data: Raw Transcribe Medical output
        speaker_map: Dict mapping speaker labels to names, e.g.
                     {'spk_0': 'Dr. Smith', 'spk_1': 'Patient'}
    """
    if speaker_map is None:
        speaker_map = {'spk_0': 'Speaker 1', 'spk_1': 'Speaker 2'}

    results = transcript_data['results']
    segments = results.get('speaker_labels', {}).get('segments', [])

    formatted = []
    current_speaker = None
    current_text = []

    segment_speakers = {
        item['start_time']: item['speaker_label']
        for segment in segments
        for item in segment.get('items', [])
    }

    for item in results.get('items', []):
        if item.get('type') == 'pronunciation':
            speaker = item.get('speaker_label') or segment_speakers.get(item.get('start_time'), current_speaker)
            text = item['alternatives'][0]['content']
        elif item.get('type') == 'punctuation':
            if current_text:
                current_text[-1] += item['alternatives'][0]['content']
            continue
        else:
            continue

        if speaker != current_speaker:
            if current_speaker and current_text:
                name = speaker_map.get(current_speaker, current_speaker)
                formatted.append(f"{name}: {' '.join(current_text)}")
            current_speaker = speaker
            current_text = [text]
        else:
            current_text.append(text)

    if current_speaker and current_text:
        name = speaker_map.get(current_speaker, current_speaker)
        formatted.append(f"{name}: {' '.join(current_text)}")

    return '\n\n'.join(formatted)
```

## Real-Time Medical Transcription

For live clinical encounters, use the streaming API. This is useful for real-time documentation during patient visits.

```python
async def stream_medical_transcription(audio_stream_generator):
    """Stream medical audio for real-time transcription."""
    from amazon_transcribe.client import TranscribeStreamingClient
    from amazon_transcribe.handlers import TranscriptResultStreamHandler
    from amazon_transcribe.model import TranscriptEvent

    class MedicalStreamHandler(TranscriptResultStreamHandler):
        def __init__(self, output_stream):
            super().__init__(output_stream)
            self.transcript_parts = []

        async def handle_transcript_event(self, transcript_event):
            results = transcript_event.transcript.results
            for result in results:
                if not result.is_partial:
                    for alt in result.alternatives:
                        self.transcript_parts.append(alt.transcript)
                        print(f"[Final] {alt.transcript}")

    client = TranscribeStreamingClient(region='us-east-1')

    stream = await client.start_medical_stream_transcription(
        language_code='en-US',
        media_sample_rate_hz=16000,
        media_encoding='pcm',
        specialty='PRIMARYCARE',
        type='CONVERSATION'
    )

    handler = MedicalStreamHandler(stream.output_stream)

    async def send_audio():
        async for chunk in audio_stream_generator:
            await stream.input_stream.send_audio_event(audio_chunk=chunk)
        await stream.input_stream.end_stream()

    import asyncio
    await asyncio.gather(send_audio(), handler.handle_events())

    return ' '.join(handler.transcript_parts)
```

## Building a Medical Documentation Pipeline

Here's a complete pipeline for clinical documentation that generates structured notes from audio.

```python
class ClinicalDocumentationPipeline:
    """Automated clinical documentation from audio recordings."""

    def __init__(self, output_bucket):
        self.transcribe = boto3.client('transcribe', region_name='us-east-1')
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.s3 = boto3.client('s3', region_name='us-east-1')
        self.output_bucket = output_bucket

    def process_encounter(self, encounter_id, audio_bucket, audio_key, encounter_type='CONVERSATION'):
        """Process a clinical encounter recording."""
        job_name = f"encounter-{encounter_id}"

        # Step 1: Transcribe
        print("Transcribing audio...")
        settings = {}
        if encounter_type == 'CONVERSATION':
            settings = {
                'ShowSpeakerLabels': True,
                'MaxSpeakerLabels': 2
            }

        request = {
            'MedicalTranscriptionJobName': job_name,
            'Media': {'MediaFileUri': f's3://{audio_bucket}/{audio_key}'},
            'LanguageCode': 'en-US',
            'Specialty': 'PRIMARYCARE',
            'Type': encounter_type,
            'OutputBucketName': self.output_bucket,
            'OutputKey': f'raw/{job_name}.json'
        }
        if settings:
            request['Settings'] = settings

        self.transcribe.start_medical_transcription_job(**request)

        result = wait_for_medical_transcription(job_name)
        if not result:
            return None

        # Step 2: Get and format transcript
        raw_transcript = self._download_transcript(f'raw/{job_name}.json')
        formatted = format_clinical_transcript(
            raw_transcript,
            speaker_map={'spk_0': 'Clinician', 'spk_1': 'Patient'}
        )

        # Step 3: Generate structured clinical note
        print("Generating clinical note...")
        clinical_note = self._generate_clinical_note(formatted)

        # Step 4: Store results
        self._store_results(encounter_id, formatted, clinical_note)

        return {
            'encounter_id': encounter_id,
            'transcript': formatted,
            'clinical_note': clinical_note
        }

    def _generate_clinical_note(self, transcript):
        """Use a foundation model to generate a structured clinical note."""
        prompt = f"""Based on this clinical conversation transcript, generate a structured
clinical note in SOAP format (Subjective, Objective, Assessment, Plan).

Important:
- Only include information that was actually discussed
- Use standard medical terminology
- Flag any mentioned medications with dosages
- Note any follow-up items mentioned

Transcript:
{transcript[:8000]}"""

        response = self.bedrock.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 2048,
                'temperature': 0.1,  # Low temperature for medical accuracy
                'messages': [{'role': 'user', 'content': prompt}]
            })
        )

        result = json.loads(response['body'].read())
        return result['content'][0]['text']

    def _download_transcript(self, key):
        """Download transcript from S3."""
        response = self.s3.get_object(Bucket=self.output_bucket, Key=key)
        return json.loads(response['Body'].read())

    def _store_results(self, encounter_id, transcript, note):
        """Store processed results in S3."""
        self.s3.put_object(
            Bucket=self.output_bucket,
            Key=f'transcripts/{encounter_id}.txt',
            Body=transcript.encode('utf-8'),
            ContentType='text/plain'
        )
        self.s3.put_object(
            Bucket=self.output_bucket,
            Key=f'notes/{encounter_id}.txt',
            Body=note.encode('utf-8'),
            ContentType='text/plain'
        )

# Usage
pipeline = ClinicalDocumentationPipeline('clinical-docs')
result = pipeline.process_encounter(
    encounter_id='enc-2026-02-12-001',
    audio_bucket='clinic-recordings',
    audio_key='2026/02/12/room3-encounter.mp3'
)

if result:
    print("\n--- Clinical Note ---")
    print(result['clinical_note'])
```

## Custom Medical Vocabulary

Even though Transcribe Medical knows medical terminology, you can still add custom vocabulary for terms specific to your practice, facility names, or newly approved medications.

```python
def create_medical_vocabulary(name, vocabulary_s3_uri):
    """Create a custom vocabulary for medical transcription."""
    response = transcribe.create_medical_vocabulary(
        VocabularyName=name,
        LanguageCode='en-US',
        VocabularyFileUri=vocabulary_s3_uri
    )

    print(f"Medical vocabulary '{name}' creation started")
    return response

# Example vocabulary file format (a table-formatted text file)
# Upload this to S3 first
vocab_content = """Phrase	IPA	SoundsLike	DisplayAs
Ozempic			
semaglutide			
tirzepatide			
SGLT2			
dapagliflozin			
OneUptime			
"""

create_medical_vocabulary(
    'practice-custom-terms',
    's3://medical-config/vocabularies/custom-terms.txt'
)
```

## HIPAA Compliance Considerations

When working with medical audio and transcripts, HIPAA compliance is non-negotiable. A few critical points:

- Enable encryption at rest and in transit for all S3 buckets storing medical data
- Use VPC endpoints to keep traffic off the public internet
- Enable CloudTrail logging for all Transcribe Medical API calls
- Set up strict IAM policies - principle of least privilege
- Enable S3 access logging and object-level logging
- Have a signed BAA with AWS before processing any PHI

```python
# Ensure your S3 bucket has proper encryption
s3 = boto3.client('s3', region_name='us-east-1')

s3.put_bucket_encryption(
    Bucket='medical-transcripts',
    ServerSideEncryptionConfiguration={
        'Rules': [{
            'ApplyServerSideEncryptionByDefault': {
                'SSEAlgorithm': 'aws:kms',
                'KMSMasterKeyID': 'arn:aws:kms:us-east-1:123456789012:key/your-kms-key'
            }
        }]
    }
)

# Block public access
s3.put_public_access_block(
    Bucket='medical-transcripts',
    PublicAccessBlockConfiguration={
        'BlockPublicAcls': True,
        'IgnorePublicAcls': True,
        'BlockPublicPolicy': True,
        'RestrictPublicBuckets': True
    }
)
```

Transcribe Medical removes a huge bottleneck from clinical documentation workflows. The accuracy for medical speech is genuinely impressive, and combining it with a foundation model for note generation can save clinicians significant time. For general transcription needs outside healthcare, see our guide on [Amazon Transcribe speech-to-text](https://oneuptime.com/blog/post/2026-02-12-amazon-transcribe-speech-to-text/view). And for monitoring the infrastructure that supports these clinical applications, check out our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).

# How to Use Amazon Polly for Text-to-Speech

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Polly, Text-to-Speech, Audio, Accessibility

Description: Learn how to convert text to natural-sounding speech with Amazon Polly, including SSML markup, neural voices, and building audio content pipelines.

---

Amazon Polly turns text into lifelike speech. It's the AWS service you reach for when you need to generate audio from text - whether that's reading articles aloud, creating voice prompts for IVR systems, building accessibility features, or generating audio content at scale. With neural voices that sound remarkably human, Polly has come a long way from the robotic text-to-speech of a few years ago.

The API is straightforward, but there's depth in the SSML markup and voice customization options that let you fine-tune pronunciation, pacing, emphasis, and more. Let's walk through everything from basic synthesis to production-grade audio pipelines.

## Basic Speech Synthesis

The simplest use: convert text to an audio file.

```python
import boto3
from contextlib import closing

polly = boto3.client('polly', region_name='us-east-1')

def synthesize_speech(text, voice_id='Joanna', output_format='mp3'):
    """Convert text to speech and save as an audio file."""
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat=output_format,
        VoiceId=voice_id,
        Engine='neural'  # Use neural engine for natural-sounding speech
    )

    # Save the audio stream to a file
    if 'AudioStream' in response:
        with closing(response['AudioStream']) as stream:
            output_file = f'speech_{voice_id.lower()}.{output_format}'
            with open(output_file, 'wb') as f:
                f.write(stream.read())
            print(f"Audio saved to {output_file}")
            return output_file

    return None

# Generate speech with different voices
text = "Welcome to OneUptime. Your infrastructure monitoring starts here."

synthesize_speech(text, 'Joanna')   # US English, female
synthesize_speech(text, 'Matthew')  # US English, male
synthesize_speech(text, 'Amy')      # British English, female
```

## Available Voices

Polly offers dozens of voices across many languages. Here's how to explore them.

```python
def list_voices(language_code=None, engine=None):
    """List available Polly voices, optionally filtered."""
    params = {}
    if language_code:
        params['LanguageCode'] = language_code
    if engine:
        params['Engine'] = engine

    response = polly.describe_voices(**params)

    voices = response['Voices']
    for voice in sorted(voices, key=lambda v: v['LanguageCode']):
        engines = ', '.join(voice['SupportedEngines'])
        print(f"  {voice['Id']:15s} {voice['LanguageCode']:8s} "
              f"{voice['Gender']:8s} {engines}")

    return voices

# List all neural English voices
print("Neural English voices:")
list_voices(language_code='en-US', engine='neural')

print("\nAll neural voices:")
list_voices(engine='neural')
```

## SSML for Fine-Tuned Speech

SSML (Speech Synthesis Markup Language) gives you precise control over how Polly speaks. You can add pauses, change speed, adjust emphasis, and control pronunciation.

```python
def synthesize_ssml(ssml_text, voice_id='Joanna', output_format='mp3'):
    """Synthesize speech from SSML markup."""
    response = polly.synthesize_speech(
        TextType='ssml',
        Text=ssml_text,
        OutputFormat=output_format,
        VoiceId=voice_id,
        Engine='neural'
    )

    if 'AudioStream' in response:
        with closing(response['AudioStream']) as stream:
            output_file = f'ssml_speech.{output_format}'
            with open(output_file, 'wb') as f:
                f.write(stream.read())
            return output_file

# Use SSML for natural-sounding announcements
ssml = """
<speak>
    <p>
        &lt;s&gt;Good morning, team.&lt;/s&gt;
        &lt;s&gt;Here is your daily infrastructure report.&lt;/s&gt;
    </p>

    <break time="500ms"/>

    <p>
        &lt;s&gt;All <emphasis level="strong">critical</emphasis> services are operational.&lt;/s&gt;
        &lt;s&gt;Uptime across all regions is
           <prosody rate="slow">ninety nine point nine nine percent</prosody>.&lt;/s&gt;
    </p>

    <break time="300ms"/>

    <p>
        &lt;s&gt;There were <say-as interpret-as="cardinal">3</say-as> minor incidents
           in the past <say-as interpret-as="cardinal">24</say-as> hours,
           all resolved within SLA.&lt;/s&gt;
    </p>

    <break time="500ms"/>

    <p>
        &lt;s&gt;<prosody volume="soft">End of report.</prosody>&lt;/s&gt;
    </p>
</speak>
"""

synthesize_ssml(ssml)
```

## Common SSML Tags

Here's a reference for the most useful SSML tags.

```python
# Pauses between sentences
pause_example = '<speak>First point.<break time="1s"/>Second point.</speak>'

# Speaking rate control
speed_example = '''<speak>
    <prosody rate="slow">This is spoken slowly.</prosody>
    <prosody rate="fast">This is spoken quickly.</prosody>
</speak>'''

# Volume control
volume_example = '''<speak>
    <prosody volume="loud">This is loud.</prosody>
    <prosody volume="soft">This is quiet.</prosody>
</speak>'''

# Emphasis
emphasis_example = '''<speak>
    This is <emphasis level="strong">very important</emphasis>.
</speak>'''

# Number and date formatting
format_example = '''<speak>
    The date is <say-as interpret-as="date" format="mdy">02/12/2026</say-as>.
    The cost is <say-as interpret-as="currency">$49.99</say-as>.
    Call us at <say-as interpret-as="telephone">1-800-555-0123</say-as>.
</speak>'''

# Phonetic pronunciation
phoneme_example = '''<speak>
    You say <phoneme alphabet="ipa" ph="tomeito">tomato</phoneme>,
    I say <phoneme alphabet="ipa" ph="tomato">tomato</phoneme>.
</speak>'''

# Whispered speech
whisper_example = '''<speak>
    <amazon:effect name="whispered">This is a secret.</amazon:effect>
</speak>'''
```

## Long-Form Audio Generation

For content longer than Polly's 3,000 character limit (or 6,000 for SSML), you need to split the text into chunks and concatenate the audio.

```python
def synthesize_long_text(text, voice_id='Joanna', max_chars=2900):
    """Synthesize long text by splitting into chunks and concatenating."""
    chunks = split_text(text, max_chars)
    audio_parts = []

    for i, chunk in enumerate(chunks):
        print(f"Synthesizing chunk {i + 1}/{len(chunks)}...")

        response = polly.synthesize_speech(
            Text=chunk,
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine='neural'
        )

        if 'AudioStream' in response:
            with closing(response['AudioStream']) as stream:
                audio_parts.append(stream.read())

    # Concatenate MP3 chunks
    # Note: For production, use a proper audio library like pydub
    combined = b''.join(audio_parts)

    output_file = 'long_speech.mp3'
    with open(output_file, 'wb') as f:
        f.write(combined)

    print(f"Combined audio saved to {output_file}")
    return output_file

def split_text(text, max_chars):
    """Split text at sentence boundaries to stay under the character limit."""
    sentences = text.replace('\n', ' ').split('. ')
    chunks = []
    current_chunk = ''

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # Add period back
        if not sentence.endswith('.'):
            sentence += '.'

        if len(current_chunk) + len(sentence) + 1 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += ' ' + sentence

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks
```

## Asynchronous Synthesis for Large Jobs

For very long content, use the StartSpeechSynthesisTask API, which saves results directly to S3.

```python
import time

def start_async_synthesis(text, bucket, key_prefix, voice_id='Joanna'):
    """Start an async synthesis task that saves to S3."""
    response = polly.start_speech_synthesis_task(
        Text=text,
        OutputFormat='mp3',
        OutputS3BucketName=bucket,
        OutputS3KeyPrefix=key_prefix,
        VoiceId=voice_id,
        Engine='neural'
    )

    task_id = response['SynthesisTask']['TaskId']
    print(f"Synthesis task started: {task_id}")
    return task_id

def wait_for_synthesis(task_id):
    """Wait for an async synthesis task to complete."""
    while True:
        response = polly.get_speech_synthesis_task(TaskId=task_id)
        task = response['SynthesisTask']
        status = task['TaskStatus']

        print(f"Status: {status}")

        if status == 'completed':
            print(f"Audio URI: {task['OutputUri']}")
            return task
        elif status == 'failed':
            print(f"Failed: {task.get('TaskStatusReason', 'Unknown')}")
            return task

        time.sleep(5)

# Generate audio for a long article
task_id = start_async_synthesis(
    long_article_text,
    bucket='audio-content',
    key_prefix='articles/2026/02/',
    voice_id='Matthew'
)

wait_for_synthesis(task_id)
```

## Building an Audio Content Pipeline

Here's a pipeline that automatically generates audio versions of blog posts or articles.

```python
class AudioContentPipeline:
    """Generate audio versions of text content."""

    def __init__(self, output_bucket):
        self.polly = boto3.client('polly', region_name='us-east-1')
        self.s3 = boto3.client('s3', region_name='us-east-1')
        self.output_bucket = output_bucket

    def generate_audio(self, content_id, text, voice_id='Joanna'):
        """Generate audio for a piece of content."""
        # Clean the text for speech
        clean_text = self._prepare_for_speech(text)

        # Split into manageable chunks
        chunks = split_text(clean_text, 2900)

        audio_parts = []
        for chunk in chunks:
            response = self.polly.synthesize_speech(
                Text=chunk,
                OutputFormat='mp3',
                VoiceId=voice_id,
                Engine='neural'
            )
            if 'AudioStream' in response:
                with closing(response['AudioStream']) as stream:
                    audio_parts.append(stream.read())

        # Combine and upload to S3
        combined_audio = b''.join(audio_parts)
        s3_key = f'audio/{content_id}.mp3'

        self.s3.put_object(
            Bucket=self.output_bucket,
            Key=s3_key,
            Body=combined_audio,
            ContentType='audio/mpeg'
        )

        print(f"Audio uploaded to s3://{self.output_bucket}/{s3_key}")
        return f's3://{self.output_bucket}/{s3_key}'

    def _prepare_for_speech(self, text):
        """Clean text for better speech synthesis."""
        import re

        # Remove markdown formatting
        text = re.sub(r'#{1,6}\s', '', text)  # Headers
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Bold
        text = re.sub(r'\*(.*?)\*', r'\1', text)  # Italic
        text = re.sub(r'`(.*?)`', r'\1', text)  # Inline code
        text = re.sub(r'```[\s\S]*?```', 'Code block omitted.', text)  # Code blocks
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # Links
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)  # Images

        # Clean up whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)

        return text.strip()

# Usage
pipeline = AudioContentPipeline('my-audio-bucket')
pipeline.generate_audio('blog-post-123', article_text, voice_id='Matthew')
```

## Speech Marks for Synchronization

Polly can generate speech marks that tell you exactly when each word, sentence, or SSML tag is spoken. This is essential for building synchronized experiences like karaoke-style text highlighting or lip-syncing animations.

```python
def get_speech_marks(text, voice_id='Joanna'):
    """Get timing information for each word in the speech."""
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat='json',  # JSON format for speech marks
        VoiceId=voice_id,
        Engine='neural',
        SpeechMarkTypes=['word', 'sentence']
    )

    marks = []
    if 'AudioStream' in response:
        with closing(response['AudioStream']) as stream:
            content = stream.read().decode('utf-8')
            for line in content.strip().split('\n'):
                marks.append(json.loads(line))

    for mark in marks[:10]:
        print(f"  {mark['type']:10s} at {mark['time']:6d}ms: {mark.get('value', '')}")

    return marks

import json
marks = get_speech_marks("Welcome to our platform. Monitor your services in real time.")
```

Amazon Polly is easy to get started with but has enough depth for sophisticated audio applications. The neural voices are good enough for production use in most contexts, and the SSML support gives you the fine-grained control needed for professional audio content. For converting speech back to text, check out our guide on [Amazon Transcribe for speech-to-text](https://oneuptime.com/blog/post/2026-02-12-amazon-transcribe-speech-to-text/view).

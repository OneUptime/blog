# How to Implement Audio Transcription and Analysis with Gemini Multimodal on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Audio Transcription, Multimodal AI

Description: Build audio transcription and analysis workflows using Gemini's multimodal capabilities on Vertex AI to process speech, extract insights, and generate structured outputs.

---

Audio processing has traditionally required stitching together multiple services - a speech-to-text API for transcription, a separate NLP service for understanding, and maybe another for sentiment analysis. Gemini's multimodal capabilities on Vertex AI change this by handling audio directly. You can pass an audio file to Gemini and ask it to transcribe, summarize, extract action items, detect speakers, analyze sentiment, and more - all in a single API call.

This post walks through building practical audio processing workflows using Gemini on Vertex AI, from basic transcription to complex analysis pipelines.

## Basic Audio Transcription

Let's start with the fundamentals. Gemini can transcribe audio files stored in Cloud Storage:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

def transcribe_audio(project_id, audio_gcs_uri, audio_mime_type="audio/mp3"):
    """Transcribe an audio file using Gemini"""
    vertexai.init(project=project_id, location="us-central1")
    model = GenerativeModel("gemini-1.5-pro")

    # Load the audio from GCS
    audio_part = Part.from_uri(audio_gcs_uri, mime_type=audio_mime_type)

    # Request transcription
    response = model.generate_content(
        [
            audio_part,
            "Transcribe this audio recording accurately. "
            "Include speaker changes if you can detect them, "
            "using 'Speaker 1:', 'Speaker 2:', etc. "
            "Include timestamps at natural paragraph breaks "
            "in the format [MM:SS]. "
            "Maintain the original language of the recording."
        ],
        generation_config={
            "temperature": 0.1,  # Low temperature for accuracy
            "max_output_tokens": 8000,
        },
    )

    return response.text
```

## Meeting Analysis Pipeline

The real power shows when you go beyond transcription. Here's a pipeline that processes meeting recordings:

```python
import json
import vertexai
from vertexai.generative_models import GenerativeModel, Part

class MeetingAnalyzer:
    def __init__(self, project_id, location="us-central1"):
        vertexai.init(project=project_id, location=location)
        self.model = GenerativeModel("gemini-1.5-pro")

    def analyze_meeting(self, audio_gcs_uri, mime_type="audio/mp3"):
        """Run a full analysis pipeline on a meeting recording"""
        audio_part = Part.from_uri(audio_gcs_uri, mime_type=mime_type)

        # Step 1: Get detailed transcription with speaker labels
        transcript = self._transcribe(audio_part)

        # Step 2: Extract meeting metadata
        metadata = self._extract_metadata(audio_part, transcript)

        # Step 3: Generate action items
        actions = self._extract_action_items(audio_part, transcript)

        # Step 4: Analyze sentiment and tone
        sentiment = self._analyze_sentiment(audio_part, transcript)

        # Step 5: Generate summary
        summary = self._generate_summary(audio_part, transcript)

        return {
            "transcript": transcript,
            "metadata": metadata,
            "action_items": actions,
            "sentiment": sentiment,
            "summary": summary,
        }

    def _transcribe(self, audio_part):
        """Get a detailed transcription with speaker identification"""
        response = self.model.generate_content(
            [
                audio_part,
                "Provide a complete transcription of this meeting. "
                "Label each speaker consistently (Speaker 1, Speaker 2, etc.). "
                "Include timestamps every 30 seconds in [MM:SS] format. "
                "Capture filler words minimally - focus on clarity."
            ],
            generation_config={"temperature": 0.1, "max_output_tokens": 8000},
        )
        return response.text

    def _extract_metadata(self, audio_part, transcript):
        """Extract meeting metadata like participants, topics, and duration"""
        response = self.model.generate_content(
            [
                audio_part,
                f"Based on this meeting recording and transcript, extract:\n"
                f"1. Number of participants\n"
                f"2. Main topics discussed (as a list)\n"
                f"3. Estimated duration\n"
                f"4. Meeting type (standup, planning, review, brainstorm, etc.)\n"
                f"5. Any names mentioned\n\n"
                f"Transcript for reference:\n{transcript[:2000]}\n\n"
                f"Output as JSON with fields: participant_count, topics, "
                f"duration_estimate, meeting_type, names_mentioned."
            ],
            generation_config={"temperature": 0.2, "max_output_tokens": 1000},
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            return {"raw": response.text}

    def _extract_action_items(self, audio_part, transcript):
        """Extract action items and decisions from the meeting"""
        response = self.model.generate_content(
            [
                audio_part,
                f"From this meeting, extract:\n\n"
                f"1. ACTION ITEMS: Tasks that someone agreed to do. "
                f"Include who is responsible and any deadline mentioned.\n"
                f"2. DECISIONS: Concrete decisions that were made.\n"
                f"3. OPEN QUESTIONS: Issues raised but not resolved.\n\n"
                f"Transcript:\n{transcript[:3000]}\n\n"
                f"Output as JSON with fields: "
                f"action_items (array of {{task, owner, deadline}}), "
                f"decisions (array of strings), "
                f"open_questions (array of strings)."
            ],
            generation_config={"temperature": 0.2, "max_output_tokens": 2000},
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            return {"raw": response.text}

    def _analyze_sentiment(self, audio_part, transcript):
        """Analyze the emotional tone and engagement level"""
        response = self.model.generate_content(
            [
                audio_part,
                "Analyze the tone and sentiment of this meeting. Consider both "
                "what is said and how it's said (energy level, enthusiasm, tension). "
                "Provide:\n"
                "1. Overall sentiment (positive, neutral, negative)\n"
                "2. Energy level (high, medium, low)\n"
                "3. Any moments of notable tension or excitement\n"
                "4. Engagement assessment - was everyone participating?\n\n"
                "Output as JSON with fields: overall_sentiment, energy_level, "
                "notable_moments (array), engagement_assessment."
            ],
            generation_config={"temperature": 0.3, "max_output_tokens": 1000},
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            return {"raw": response.text}

    def _generate_summary(self, audio_part, transcript):
        """Generate a concise meeting summary"""
        response = self.model.generate_content(
            [
                audio_part,
                f"Write a concise meeting summary (150-250 words) that covers:\n"
                f"- What was discussed\n"
                f"- Key decisions made\n"
                f"- What happens next\n\n"
                f"Write it in a professional tone suitable for sharing with "
                f"team members who missed the meeting.\n\n"
                f"Transcript for reference:\n{transcript[:3000]}"
            ],
            generation_config={"temperature": 0.3, "max_output_tokens": 500},
        )
        return response.text
```

## Processing Customer Support Calls

Another practical use case - analyzing customer support interactions:

```python
def analyze_support_call(project_id, audio_uri):
    """Analyze a customer support call for quality and insights"""
    vertexai.init(project=project_id, location="us-central1")
    model = GenerativeModel("gemini-1.5-pro")

    audio_part = Part.from_uri(audio_uri, mime_type="audio/mp3")

    response = model.generate_content(
        [
            audio_part,
            """Analyze this customer support call and provide:

1. CALL SUMMARY: Brief description of the issue and resolution
2. CUSTOMER SENTIMENT: Track how the customer's mood changed during the call
3. AGENT PERFORMANCE:
   - Did the agent greet properly?
   - Was the agent empathetic?
   - Did they resolve the issue?
   - Did they offer follow-up?
4. ISSUE CATEGORY: Classify the issue (billing, technical, product question, etc.)
5. RESOLUTION STATUS: Resolved, escalated, or unresolved
6. QUALITY SCORE: Rate 1-10 on each: professionalism, problem-solving, communication
7. IMPROVEMENT SUGGESTIONS: Specific areas where the agent could improve

Output as JSON with the above fields."""
        ],
        generation_config={"temperature": 0.2, "max_output_tokens": 2000},
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {"raw_analysis": response.text}
```

## Batch Processing Pipeline

For processing many audio files, use Cloud Functions with a GCS trigger:

```python
from google.cloud import storage
from google.cloud import bigquery
import json

def process_audio_upload(event, context):
    """Triggered when an audio file is uploaded to GCS"""
    bucket_name = event["bucket"]
    file_name = event["name"]

    # Only process audio files
    audio_extensions = ('.mp3', '.wav', '.flac', '.m4a', '.ogg')
    if not file_name.lower().endswith(audio_extensions):
        return

    audio_uri = f"gs://{bucket_name}/{file_name}"

    # Determine the mime type
    mime_map = {
        '.mp3': 'audio/mp3',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
    }
    ext = '.' + file_name.rsplit('.', 1)[1].lower()
    mime_type = mime_map.get(ext, 'audio/mp3')

    # Determine processing type from the bucket path
    if "meetings/" in file_name:
        analyzer = MeetingAnalyzer("your-project-id")
        results = analyzer.analyze_meeting(audio_uri, mime_type)
    elif "support/" in file_name:
        results = analyze_support_call("your-project-id", audio_uri)
    else:
        # Default: just transcribe
        results = {"transcript": transcribe_audio("your-project-id", audio_uri, mime_type)}

    # Store results in BigQuery
    store_results(audio_uri, file_name, results)

def store_results(audio_uri, file_name, results):
    """Store analysis results in BigQuery"""
    client = bigquery.Client()
    table_id = "your-project.audio_analysis.results"

    row = {
        "audio_uri": audio_uri,
        "file_name": file_name,
        "processed_at": datetime.utcnow().isoformat(),
        "results_json": json.dumps(results),
        "transcript": results.get("transcript", ""),
        "summary": results.get("summary", ""),
    }

    errors = client.insert_rows_json(table_id, [row])
    if errors:
        print(f"BigQuery errors: {errors}")
```

## Deploying the Pipeline

```bash
# Deploy the batch processing function
gcloud functions deploy process-audio \
    --runtime python311 \
    --trigger-bucket your-audio-uploads-bucket \
    --timeout 540 \
    --memory 2GB \
    --service-account audio-processor@YOUR_PROJECT.iam.gserviceaccount.com

# Create BigQuery table for results
bq mk --table audio_analysis.results \
    audio_uri:STRING,file_name:STRING,processed_at:TIMESTAMP,\
    results_json:STRING,transcript:STRING,summary:STRING
```

## Wrapping Up

Gemini's multimodal audio capabilities simplify what used to require multiple specialized services into a single API. For meeting recordings, you get transcription, summarization, action items, and sentiment analysis in one pass. For support calls, you get quality scoring and issue classification alongside the transcript. The key advantage over traditional speech-to-text plus NLP pipelines is that Gemini understands context across the entire audio, so it can pick up on things like sarcasm, implied commitments, and emotional shifts that would require complex post-processing with separate services. Start with a specific use case - meeting notes are a common first choice - validate the output quality with your team, and expand to other audio types from there.

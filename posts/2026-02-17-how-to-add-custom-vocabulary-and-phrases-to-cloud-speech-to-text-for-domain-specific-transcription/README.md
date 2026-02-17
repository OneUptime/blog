# How to Add Custom Vocabulary and Phrases to Cloud Speech-to-Text for Domain-Specific Transcription

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Speech-to-Text, Custom Vocabulary, Speech Adaptation, Transcription

Description: Learn how to improve Google Cloud Speech-to-Text accuracy for domain-specific terminology by adding custom vocabulary, phrases, and speech adaptation hints.

---

Out of the box, Speech-to-Text does a good job with everyday conversational English. But when your audio contains specialized terminology - medical terms, product names, industry jargon, or uncommon proper nouns - the default model struggles. It will transcribe "Kubernetes" as "Kuber net ease" or your product name "DataBrix" as "data bricks."

Speech adaptation solves this by letting you provide hints about words and phrases the API should expect. You can boost the recognition of specific terms, add custom words that are not in the standard vocabulary, and even provide class-based hints for things like addresses and phone numbers.

## Types of Speech Adaptation

Cloud Speech-to-Text offers several adaptation mechanisms:

**Phrase Hints**: A list of words or phrases that the model should favor during recognition. Think of it as telling the model "you are likely to hear these words."

**Speech Adaptation with Custom Classes**: Predefined classes for common patterns like numbers, addresses, and dates, plus the ability to define your own custom classes.

**Model Adaptation (Custom Model)**: Training a custom model variant with your specific domain data. This is the most powerful but requires more setup.

For most use cases, phrase hints and custom classes get you 90% of the way there.

## Using Phrase Hints

The simplest way to improve accuracy for specific terms:

```python
from google.cloud import speech

def transcribe_with_hints(audio_path, phrases):
    """Transcribe audio with phrase hints to improve domain-specific accuracy."""
    client = speech.SpeechClient()

    with open(audio_path, "rb") as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)

    # Create a speech context with phrase hints
    speech_context = speech.SpeechContext(
        phrases=phrases,
        boost=15.0,  # How much to boost these phrases (0 to 20)
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        speech_contexts=[speech_context],
        model="latest_long",
    )

    response = client.recognize(config=config, audio=audio)

    for result in response.results:
        print(f"Transcript: {result.alternatives[0].transcript}")
        print(f"Confidence: {result.alternatives[0].confidence:.3f}")

    return response

# Add domain-specific terms as phrase hints
medical_terms = [
    "acetaminophen",
    "ibuprofen",
    "metformin",
    "hypertension",
    "tachycardia",
    "electrocardiogram",
    "CBC with differential",
    "BMP",
    "troponin levels",
]

transcribe_with_hints("doctor_notes.wav", medical_terms)
```

## Boost Values and Their Effect

The boost parameter controls how strongly the API favors your hinted phrases. Here is how different values behave:

```python
from google.cloud import speech

def compare_boost_levels(audio_path, phrases):
    """Compare transcription results at different boost levels."""
    client = speech.SpeechClient()

    with open(audio_path, "rb") as f:
        content = f.read()

    audio = speech.RecognitionAudio(content=content)
    boost_levels = [0, 5, 10, 15, 20]

    for boost in boost_levels:
        speech_context = speech.SpeechContext(
            phrases=phrases,
            boost=float(boost),
        )

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_automatic_punctuation=True,
            speech_contexts=[speech_context],
        )

        response = client.recognize(config=config, audio=audio)

        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript + " "

        print(f"Boost {boost:2d}: {transcript.strip()}")

# Compare how different boost levels affect recognition of "OneUptime"
compare_boost_levels("support_call.wav", ["OneUptime", "uptime monitoring"])
```

A boost of 0 means no boost at all (just awareness of the phrase). A boost of 20 is the maximum and will strongly favor those phrases. For most cases, a boost between 10 and 15 works well. Going too high can cause false positives where the model hears your hinted phrase even when something else was said.

## Using Multiple Speech Contexts

You can provide multiple speech contexts with different boost levels for different categories of terms:

```python
from google.cloud import speech

def transcribe_multi_context(audio_path):
    """Use multiple speech contexts with different boost levels."""
    client = speech.SpeechClient()

    with open(audio_path, "rb") as f:
        content = f.read()

    audio = speech.RecognitionAudio(content=content)

    # High boost for product and company names
    product_context = speech.SpeechContext(
        phrases=[
            "OneUptime",
            "DataBrix",
            "CloudWatch",
            "Prometheus",
            "Grafana",
        ],
        boost=18.0,
    )

    # Medium boost for technical terms
    technical_context = speech.SpeechContext(
        phrases=[
            "Kubernetes",
            "containerization",
            "microservices",
            "load balancer",
            "reverse proxy",
            "CI/CD pipeline",
            "infrastructure as code",
        ],
        boost=12.0,
    )

    # Lower boost for common industry terms
    industry_context = speech.SpeechContext(
        phrases=[
            "SLA",
            "uptime",
            "downtime",
            "incident response",
            "mean time to recovery",
            "MTTR",
            "observability",
        ],
        boost=8.0,
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        speech_contexts=[product_context, technical_context, industry_context],
        model="latest_long",
    )

    response = client.recognize(config=config, audio=audio)

    for result in response.results:
        print(result.alternatives[0].transcript)

    return response
```

## Using Built-in Custom Classes

Speech-to-Text provides built-in classes for common patterns. These help the model recognize structured data like numbers, addresses, and currency amounts:

```python
from google.cloud import speech

def transcribe_with_classes(audio_path):
    """Use built-in custom classes for structured data recognition."""
    client = speech.SpeechClient()

    with open(audio_path, "rb") as f:
        content = f.read()

    audio = speech.RecognitionAudio(content=content)

    # Use built-in token classes in phrase hints
    # $ADDRESSNUM - street numbers
    # $FULLPHONENUM - phone numbers
    # $MONEY - currency amounts
    # $OPERAND - numeric values
    speech_context = speech.SpeechContext(
        phrases=[
            "$FULLPHONENUM",    # Recognize phone numbers
            "$MONEY",           # Recognize currency amounts
            "$ADDRESSNUM",      # Recognize street addresses
            # Mix custom phrases with built-in classes
            "account number",
            "order number",
        ],
        boost=15.0,
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
        speech_contexts=[speech_context],
    )

    response = client.recognize(config=config, audio=audio)

    for result in response.results:
        print(result.alternatives[0].transcript)

    return response

# Good for transcribing customer service calls with addresses and phone numbers
transcribe_with_classes("customer_call.wav")
```

## Creating a Domain-Specific Phrase List

For real applications, you want to maintain a structured phrase list. Here is a pattern for managing domain vocabulary:

```python
import json

class DomainVocabulary:
    """Manage domain-specific vocabulary for speech recognition."""

    def __init__(self, vocab_file=None):
        self.categories = {}
        if vocab_file:
            self.load(vocab_file)

    def add_category(self, name, phrases, boost=12.0):
        """Add a category of phrases."""
        self.categories[name] = {
            "phrases": phrases,
            "boost": boost,
        }

    def get_speech_contexts(self):
        """Generate SpeechContext objects for all categories."""
        from google.cloud import speech

        contexts = []
        for name, data in self.categories.items():
            context = speech.SpeechContext(
                phrases=data["phrases"],
                boost=data["boost"],
            )
            contexts.append(context)

        return contexts

    def save(self, file_path):
        """Save the vocabulary to a JSON file."""
        with open(file_path, "w") as f:
            json.dump(self.categories, f, indent=2)

    def load(self, file_path):
        """Load vocabulary from a JSON file."""
        with open(file_path, "r") as f:
            self.categories = json.load(f)

# Build a vocabulary for a DevOps monitoring company
vocab = DomainVocabulary()

vocab.add_category("products", [
    "OneUptime", "PagerDuty", "Datadog", "New Relic",
    "Splunk", "Dynatrace", "AppDynamics",
], boost=18.0)

vocab.add_category("metrics", [
    "p99 latency", "p95 latency", "error rate",
    "throughput", "saturation", "request duration",
    "CPU utilization", "memory usage",
], boost=12.0)

vocab.add_category("protocols", [
    "HTTP", "HTTPS", "gRPC", "WebSocket",
    "TCP", "UDP", "TLS", "mTLS",
], boost=10.0)

# Save for reuse
vocab.save("devops_vocabulary.json")

# Use in transcription
speech_contexts = vocab.get_speech_contexts()
```

## Adapting for Long Audio with Async API

Phrase hints work the same way with the async API for long recordings:

```python
from google.cloud import speech

def transcribe_long_with_adaptation(gcs_uri, phrases, boost=15.0):
    """Transcribe long audio with speech adaptation."""
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(uri=gcs_uri)

    speech_context = speech.SpeechContext(
        phrases=phrases,
        boost=boost,
    )

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.FLAC,
        sample_rate_hertz=44100,
        language_code="en-US",
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True,
        speech_contexts=[speech_context],
        model="latest_long",
    )

    operation = client.long_running_recognize(config=config, audio=audio)

    print("Transcribing with custom vocabulary...")
    response = operation.result(timeout=3600)

    transcript = []
    for result in response.results:
        transcript.append(result.alternatives[0].transcript)

    return " ".join(transcript)
```

## Limits and Best Practices

Keep these constraints in mind:

- You can provide up to 5,000 phrase hints per request.
- Each phrase can be up to 100 characters long.
- You can have up to 10 speech contexts per request.
- Phrase hints work best for words and short phrases, not full sentences.
- Start with a moderate boost (10-12) and increase only if needed.
- Too many hints or too high a boost can actually decrease accuracy for words not in your list.
- Test with real audio from your domain to tune the boost values.

## Wrapping Up

Custom vocabulary and speech adaptation are essential for getting good transcription accuracy in specialized domains. The phrase hint system is simple to use and makes a huge difference for product names, technical terms, and domain jargon. Start with your most important terms, tune the boost values against real audio, and expand your vocabulary as you identify more terms the default model misses.

For keeping track of your transcription service health and monitoring the accuracy of your speech processing pipeline, [OneUptime](https://oneuptime.com) provides monitoring tools that help you stay on top of API performance.

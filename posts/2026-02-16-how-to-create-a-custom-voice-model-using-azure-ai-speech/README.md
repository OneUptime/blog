# How to Create a Custom Voice Model Using Azure AI Speech

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure AI Speech, Custom Voice, Text-to-Speech, Neural Voice, Voice Cloning, Audio Synthesis, Azure AI

Description: Create a custom neural voice model using Azure AI Speech to generate speech that matches your brand identity or specific voice requirements.

---

The pre-built voices in Azure Speech Services are high quality, but sometimes you need something specific. Maybe your product has a recognizable voice actor, your brand has a specific vocal identity, or you need a voice that matches your company's regional accent. Custom Neural Voice lets you train a text-to-speech model that sounds like a specific person, producing natural, expressive speech in that voice.

This is not a simple voice filter on top of a generic model. Azure actually trains a new neural network on the voice recordings you provide, learning the specific characteristics, intonation patterns, and speaking style of the voice talent. The result is a synthetic voice that is nearly indistinguishable from the original speaker.

## Important: Ethical Requirements

Before diving into the technical setup, you need to know that Microsoft takes custom voice creation seriously from an ethical standpoint. You must:

1. **Obtain explicit consent** from the voice talent whose voice you are cloning
2. **Submit a use case application** to Microsoft explaining how you will use the custom voice
3. **Provide a consent statement** recorded by the voice talent
4. **Agree to responsible AI guidelines** including restrictions on deceptive use

This review process ensures that custom voices are not used for fraud, impersonation, or other harmful purposes. Plan for this approval to take a few business days.

## Prerequisites

- An Azure Speech Services resource (S0 tier required for custom voice)
- Approval from Microsoft for custom neural voice access
- High-quality audio recordings from your voice talent (see requirements below)
- Corresponding transcripts for all recordings
- Python 3.9+ with the Azure Speech SDK

## Step 1: Prepare Voice Training Data

The quality of your custom voice depends heavily on the quality of your training data. Here are the requirements:

**Recording specifications:**
- Format: WAV, 16-bit, 24 kHz or higher sample rate
- Mono channel (single channel)
- Recording environment: professional studio or very quiet room
- Consistent microphone distance and volume throughout
- No background noise, reverb, or echo

**Content requirements:**
- Minimum 300 utterances for a basic voice (more is better)
- 2000+ utterances recommended for production quality
- Each utterance should be 4-15 seconds long
- Include diverse sentence structures, questions, exclamations, and statements
- Cover all the phonemes in your target language

**Transcript format:**
Create a text file where each line has the audio file name and the spoken text, separated by a pipe character:

```
recording_001.wav|Welcome to OneUptime monitoring. Your systems are in good hands.
recording_002.wav|An incident has been detected on the payment service.
recording_003.wav|All monitors are currently reporting healthy status.
recording_004.wav|Would you like me to create an alert for this metric threshold?
recording_005.wav|The database response time has exceeded the configured limit.
```

## Step 2: Upload Training Data to Speech Studio

Open Azure Speech Studio (https://speech.microsoft.com) and navigate to the Custom Voice section.

Create a new project and upload your training data:

1. Create a new voice project
2. Go to "Training data" and click "Upload data"
3. Upload your audio files and transcript
4. The system will validate the data and flag any issues

Common validation issues include:
- Audio/transcript mismatches (the spoken words do not match the transcript)
- Audio files that are too short or too long
- Recordings with excessive background noise
- Volume levels that are too low or have clipping

You can also upload data programmatically using the Speech Services REST API:

```python
# upload_data.py - Upload training data via the REST API
import requests
import os

endpoint = "https://eastus.api.cognitive.microsoft.com"
key = "your-speech-key"

headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json"
}

# Create a training dataset
dataset_payload = {
    "displayName": "Brand Voice Training Data v1",
    "description": "2000 utterances recorded by voice talent",
    "kind": "AudioAndScript",
    "projectId": "your-project-id",
    "locale": "en-US"
}

# Start the dataset creation
response = requests.post(
    f"{endpoint}/texttospeech/datasets",
    headers=headers,
    json=dataset_payload,
    params={"api-version": "2024-04-01"}
)

dataset_id = response.json()["id"]
print(f"Dataset created with ID: {dataset_id}")

# Upload the ZIP file containing audio and transcript
# Package your audio files and transcript into a single ZIP
with open("training_data.zip", "rb") as f:
    upload_headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/zip"
    }
    upload_response = requests.post(
        f"{endpoint}/texttospeech/datasets/{dataset_id}/upload",
        headers=upload_headers,
        data=f,
        params={"api-version": "2024-04-01"}
    )
    print(f"Upload status: {upload_response.status_code}")
```

## Step 3: Train the Custom Voice Model

After your data passes validation, start the training process. Custom Neural Voice training typically takes 20-40 hours depending on the amount of training data.

In Speech Studio:
1. Go to "Train model" in your project
2. Select your uploaded training dataset
3. Choose the neural voice training recipe (CNV Lite for quick testing, CNV Pro for production)
4. Start the training

The difference between CNV Lite and CNV Pro:

| Feature | CNV Lite | CNV Pro |
|---------|----------|---------|
| Training data needed | 300+ utterances | 2000+ utterances |
| Training time | 2-4 hours | 20-40 hours |
| Voice quality | Good | Excellent |
| Expressiveness | Basic | Advanced |
| Best for | Prototyping | Production |

## Step 4: Test the Trained Model

Once training completes, test the voice in Speech Studio's testing tool. Enter different text samples and listen to the generated audio. Pay attention to:

- Does it sound like the voice talent?
- Are there any pronunciation issues with specific words?
- Does the intonation sound natural?
- How does it handle numbers, abbreviations, and unusual words?

If specific words are mispronounced, you can add custom pronunciation rules using a pronunciation lexicon.

## Step 5: Deploy the Custom Voice

Deploy the trained model to create an endpoint that your applications can use:

```python
# deploy_voice.py - Deploy the custom voice model
import requests

endpoint = "https://eastus.api.cognitive.microsoft.com"
key = "your-speech-key"

headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json"
}

# Create a deployment (endpoint) for the trained model
deployment_payload = {
    "displayName": "BrandVoice-Production",
    "description": "Production deployment of brand voice",
    "modelId": "your-trained-model-id"
}

response = requests.post(
    f"{endpoint}/texttospeech/endpoints",
    headers=headers,
    json=deployment_payload,
    params={"api-version": "2024-04-01"}
)

endpoint_id = response.json()["id"]
print(f"Deployment created: {endpoint_id}")
```

## Step 6: Use the Custom Voice in Your Application

With the model deployed, use it just like any other Azure text-to-speech voice. The key difference is that you reference your custom voice name (the endpoint ID) instead of a built-in voice name.

```python
# synthesize.py - Generate speech using the custom voice
import azure.cognitiveservices.speech as speechsdk

def speak_with_custom_voice(text: str):
    """Generate speech using the custom neural voice."""

    # Configure the speech synthesizer
    speech_config = speechsdk.SpeechConfig(
        subscription="your-speech-key",
        region="eastus"
    )

    # Set the custom voice endpoint
    # Replace with your deployed endpoint ID
    speech_config.endpoint_id = "your-endpoint-id"
    speech_config.speech_synthesis_voice_name = "BrandVoice"

    # Output to the default speaker
    audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)

    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config,
        audio_config=audio_config
    )

    # Synthesize the text
    result = synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"Successfully synthesized: '{text}'")
    elif result.reason == speechsdk.ResultReason.Canceled:
        details = result.cancellation_details
        print(f"Synthesis canceled: {details.reason}")
        if details.error_details:
            print(f"Error: {details.error_details}")

# Generate speech with the custom voice
speak_with_custom_voice("Welcome to OneUptime. All your systems are healthy.")
speak_with_custom_voice("Alert: the response time for your API has exceeded 500 milliseconds.")
```

## Step 7: Control Expression with SSML

For more control over how the custom voice speaks, use SSML (Speech Synthesis Markup Language):

```python
# ssml_synthesis.py - Use SSML for expressive custom voice synthesis
def speak_with_expression(text: str, style: str = "general"):
    """Use SSML to control speaking style and expression."""

    ssml = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
           xmlns:mstts="http://www.w3.org/2001/mstts"
           xml:lang="en-US">
        <voice name="BrandVoice">
            <mstts:express-as style="{style}">
                <prosody rate="0%"  pitch="0%">
                    {text}
                </prosody>
            </mstts:express-as>
        </voice>
    </speak>
    """

    # Configure and synthesize
    speech_config = speechsdk.SpeechConfig(
        subscription="your-speech-key",
        region="eastus"
    )
    speech_config.endpoint_id = "your-endpoint-id"

    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    result = synthesizer.speak_ssml_async(ssml).get()

    return result

# Different expressions for different contexts
speak_with_expression("Great news! All incidents have been resolved.", style="cheerful")
speak_with_expression("Warning: critical alert detected on the payment system.", style="serious")
```

## Cost Considerations

Custom Neural Voice pricing has several components:

- **Training**: Charged per compute hour used during training
- **Hosting**: Charged per hour that the endpoint is deployed (even when not in use)
- **Synthesis**: Charged per million characters synthesized

For cost optimization, deploy the model only when needed, or use a single endpoint shared across applications. If you have predictable workloads, pre-generate audio files during off-peak hours and cache them rather than synthesizing on every request.

## Summary

Custom Neural Voice in Azure AI Speech lets you create a unique, branded voice experience for your applications. The process requires quality recordings from a voice talent, Microsoft's ethical review approval, data preparation and validation, model training, and deployment. The result is a synthetic voice that captures the specific characteristics of the original speaker, usable through the same Speech SDK you would use with built-in voices. While the setup investment is significant, the payoff is a distinctive audio identity that sets your product apart.

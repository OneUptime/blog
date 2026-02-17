# How to Create a Text-to-Speech Application with SSML in Azure Speech Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Speech Services, Text-to-Speech, SSML, Voice Synthesis, Audio, Python, Neural Voice

Description: Build a text-to-speech application using SSML with Azure Speech Services to control pronunciation, pacing, emphasis, and voice selection.

---

Plain text-to-speech gets you 80% of the way there. The neural voices in Azure Speech Services sound remarkably natural even without any markup. But when you need precise control - pausing at the right moments, emphasizing specific words, switching voices mid-sentence, or handling unusual pronunciations - you need SSML (Speech Synthesis Markup Language).

SSML is an XML-based language that gives you fine-grained control over how the speech synthesizer renders text into audio. It is the difference between a robotic "please hold while we transfer your call" and a natural-sounding, well-paced version that actually sounds like a real person speaking.

## What SSML Can Control

SSML lets you control virtually every aspect of speech synthesis:

- **Voice selection**: Choose from hundreds of neural voices in 100+ languages
- **Prosody**: Adjust rate (speed), pitch, and volume
- **Emphasis**: Stress specific words
- **Pauses**: Insert breaks of precise durations
- **Pronunciation**: Override default pronunciation with phonemes (IPA)
- **Audio insertion**: Mix pre-recorded audio clips with synthesized speech
- **Speaking styles**: Switch between cheerful, sad, angry, and other styles (for supported voices)
- **Multiple languages**: Mix languages within the same output

## Prerequisites

- An Azure Speech Services resource
- Python 3.9+ with the Azure Speech SDK
- An audio output device (speakers or headphones for testing)

```bash
pip install azure-cognitiveservices-speech
```

## Step 1: Basic SSML Synthesis

Start with a simple SSML document that selects a voice and synthesizes text:

```python
# basic_ssml.py - Simple SSML text-to-speech synthesis
import azure.cognitiveservices.speech as speechsdk

# Configure the speech service
speech_config = speechsdk.SpeechConfig(
    subscription="your-speech-key",
    region="eastus"
)

# Create a synthesizer that outputs to the default speaker
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)

# Basic SSML document
ssml = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">
    <voice name="en-US-JennyNeural">
        Welcome to OneUptime monitoring.
        All your systems are currently healthy.
    </voice>
</speak>
"""

# Synthesize the SSML
result = synthesizer.speak_ssml_async(ssml).get()

if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print("Speech synthesized successfully")
elif result.reason == speechsdk.ResultReason.Canceled:
    details = result.cancellation_details
    print(f"Synthesis canceled: {details.reason}")
    if details.error_details:
        print(f"Error: {details.error_details}")
```

## Step 2: Control Prosody (Speed, Pitch, Volume)

Prosody controls let you adjust how the voice sounds:

```python
# prosody.py - Demonstrate prosody controls in SSML
ssml_prosody = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xml:lang="en-US">
    <voice name="en-US-GuyNeural">

        <!-- Normal speech -->
        <prosody rate="0%" pitch="0%" volume="medium">
            This is the default speaking rate and pitch.
        </prosody>

        <break time="500ms"/>

        <!-- Slower and lower pitch for emphasis -->
        <prosody rate="-20%" pitch="-10%">
            This is slower and lower, suitable for important announcements.
        </prosody>

        <break time="500ms"/>

        <!-- Faster for less critical information -->
        <prosody rate="+25%" pitch="+5%">
            This is faster for less critical content that users can skim through.
        </prosody>

        <break time="500ms"/>

        <!-- Whisper-like quiet speech -->
        <prosody volume="x-soft" rate="-10%">
            This is very quiet, like a whisper.
        </prosody>

    </voice>
</speak>
"""

result = synthesizer.speak_ssml_async(ssml_prosody).get()
```

Prosody values can be specified as:
- **Rate**: Percentage (+50%, -30%) or keywords (x-slow, slow, medium, fast, x-fast)
- **Pitch**: Percentage (+10%, -20%) or keywords (x-low, low, medium, high, x-high)
- **Volume**: Percentage or keywords (silent, x-soft, soft, medium, loud, x-loud)

## Step 3: Add Pauses and Emphasis

Strategic pauses and emphasis make speech sound more natural:

```python
# emphasis_and_pauses.py - Use breaks and emphasis in SSML
ssml_emphasis = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xml:lang="en-US">
    <voice name="en-US-JennyNeural">

        Alert!
        <break time="750ms"/>

        Server <emphasis level="strong">prod-db-01</emphasis> is experiencing
        <emphasis level="moderate">critical</emphasis> CPU utilization.

        <break time="500ms"/>

        Current usage is at <say-as interpret-as="cardinal">97</say-as> percent.

        <break time="300ms"/>

        This has been ongoing for the last
        <say-as interpret-as="cardinal">15</say-as> minutes.

        <break time="1s"/>

        Recommended action: scale up the database instance or investigate
        long-running queries.

    </voice>
</speak>
"""

result = synthesizer.speak_ssml_async(ssml_emphasis).get()
```

## Step 4: Handle Special Content with say-as

The `say-as` element tells the synthesizer how to interpret specific content:

```python
# say_as.py - Handle dates, numbers, and special content correctly
ssml_say_as = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xml:lang="en-US">
    <voice name="en-US-AriaNeural">

        <!-- Date interpretation -->
        The incident was reported on
        <say-as interpret-as="date" format="mdy">02/16/2026</say-as>.

        <break time="300ms"/>

        <!-- Time interpretation -->
        It was first detected at
        <say-as interpret-as="time" format="hms12">3:45:00 PM</say-as>.

        <break time="300ms"/>

        <!-- Phone number -->
        For urgent support, call
        <say-as interpret-as="telephone" format="1">(555) 123-4567</say-as>.

        <break time="300ms"/>

        <!-- Spell out an acronym -->
        The <say-as interpret-as="characters">CPU</say-as> utilization on server
        <say-as interpret-as="characters">DB</say-as> one reached
        <say-as interpret-as="cardinal">97</say-as> percent.

        <break time="300ms"/>

        <!-- Ordinal numbers -->
        This is the <say-as interpret-as="ordinal">3</say-as> incident this week.

        <break time="300ms"/>

        <!-- IP address spoken as digits -->
        The affected server IP is
        <say-as interpret-as="address">10.0.1.45</say-as>.

    </voice>
</speak>
"""

result = synthesizer.speak_ssml_async(ssml_say_as).get()
```

## Step 5: Custom Pronunciation with Phonemes

When the default pronunciation is wrong (common with technical terms, product names, or foreign words), use phonemes:

```python
# phonemes.py - Override pronunciation using IPA phonemes
ssml_phonemes = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xml:lang="en-US">
    <voice name="en-US-GuyNeural">

        <!-- Default pronunciation might be wrong for technical terms -->
        <!-- Use IPA (International Phonetic Alphabet) for precise pronunciation -->

        Welcome to
        <phoneme alphabet="ipa" ph="wan.ap.taim">OneUptime</phoneme>
        monitoring.

        <break time="300ms"/>

        The <phoneme alphabet="ipa" ph="en.dZi.en.eks">Nginx</phoneme>
        server is responding normally.

        <break time="300ms"/>

        <!-- You can also use the Microsoft SAPI alphabet -->
        Your <phoneme alphabet="x-microsoft-ups" ph="S AX R . V ER">server</phoneme>
        is online.

    </voice>
</speak>
"""

result = synthesizer.speak_ssml_async(ssml_phonemes).get()
```

## Step 6: Multiple Voices and Speaking Styles

Mix voices and emotional styles within the same SSML document:

```python
# multi_voice.py - Use multiple voices and speaking styles
ssml_multi = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">

    <!-- Narrator voice introduces the topic -->
    <voice name="en-US-GuyNeural">
        <mstts:express-as style="newscast-formal">
            System status report for February sixteenth, twenty twenty-six.
        </mstts:express-as>
    </voice>

    <break time="500ms"/>

    <!-- Cheerful voice for good news -->
    <voice name="en-US-JennyNeural">
        <mstts:express-as style="cheerful">
            Great news! All production systems have been running without
            any incidents for the past seven days.
        </mstts:express-as>
    </voice>

    <break time="500ms"/>

    <!-- Serious tone for the alert section -->
    <voice name="en-US-AriaNeural">
        <mstts:express-as style="serious">
            However, there is one item that requires attention.
            The staging environment database is approaching its storage limit.
            Please review and archive old data before the end of the week.
        </mstts:express-as>
    </voice>

    <break time="500ms"/>

    <!-- Back to the narrator for the wrap-up -->
    <voice name="en-US-GuyNeural">
        <mstts:express-as style="newscast-formal">
            That concludes today's status report. The next update will be
            at <say-as interpret-as="time">9:00 AM</say-as> tomorrow.
        </mstts:express-as>
    </voice>

</speak>
"""

result = synthesizer.speak_ssml_async(ssml_multi).get()
```

## Step 7: Save Output to Audio Files

For pre-generated audio (IVR systems, podcasts, notifications), save to a file:

```python
# save_audio.py - Synthesize SSML and save to audio files
import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(
    subscription="your-speech-key",
    region="eastus"
)

# Set the output format to high-quality audio
speech_config.set_speech_synthesis_output_format(
    speechsdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3
)

# Configure output to a file instead of speakers
audio_config = speechsdk.audio.AudioOutputConfig(filename="alert-notification.mp3")

synthesizer = speechsdk.SpeechSynthesizer(
    speech_config=speech_config,
    audio_config=audio_config
)

ssml = """
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">
    <voice name="en-US-AriaNeural">
        <mstts:express-as style="serious">
            <prosody rate="-5%">
                Attention. A critical alert has been triggered.
                <break time="500ms"/>
                Please check your monitoring dashboard for details.
            </prosody>
        </mstts:express-as>
    </voice>
</speak>
"""

result = synthesizer.speak_ssml_async(ssml).get()

if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
    print("Audio saved to alert-notification.mp3")
```

## Step 8: Build a Dynamic SSML Generator

For applications that generate speech dynamically, build an SSML template system:

```python
# ssml_builder.py - Programmatically build SSML documents
class SSMLBuilder:
    """Build SSML documents programmatically for dynamic speech generation."""

    def __init__(self, lang="en-US"):
        self.lang = lang
        self.elements = []

    def add_voice(self, voice_name: str, text: str, style: str = None,
                  rate: str = "0%", pitch: str = "0%"):
        """Add a voice segment to the SSML document."""
        voice_content = text
        if style:
            voice_content = (
                f'<mstts:express-as style="{style}">'
                f'<prosody rate="{rate}" pitch="{pitch}">'
                f'{text}'
                f'</prosody>'
                f'</mstts:express-as>'
            )
        else:
            voice_content = (
                f'<prosody rate="{rate}" pitch="{pitch}">'
                f'{text}'
                f'</prosody>'
            )
        self.elements.append(f'<voice name="{voice_name}">{voice_content}</voice>')
        return self

    def add_break(self, duration_ms: int = 500):
        """Add a pause between segments."""
        self.elements.append(f'<break time="{duration_ms}ms"/>')
        return self

    def build(self) -> str:
        """Generate the complete SSML document."""
        content = "\n    ".join(self.elements)
        return (
            f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"'
            f' xmlns:mstts="http://www.w3.org/2001/mstts"'
            f' xml:lang="{self.lang}">\n'
            f'    {content}\n'
            f'</speak>'
        )

# Usage example: Generate a status report dynamically
builder = SSMLBuilder()
builder.add_voice("en-US-GuyNeural", "System status report.", style="newscast-formal")
builder.add_break(500)
builder.add_voice("en-US-JennyNeural", "All 12 monitors are healthy.", style="cheerful")
builder.add_break(300)
builder.add_voice("en-US-AriaNeural", "Average response time is 142 milliseconds.", style="serious")

ssml_output = builder.build()
print(ssml_output)
```

## Summary

SSML transforms text-to-speech from a one-size-fits-all experience into a fully customizable audio production tool. With Azure Speech Services, you get access to hundreds of neural voices, expressive speaking styles, and the full power of SSML for controlling every aspect of the output. Whether you are building IVR menus, accessibility features, podcasts, or notification systems, SSML gives you the control to make synthesized speech sound exactly how you want it. Start with basic voice selection and breaks, then layer in prosody, emphasis, and phonemes as needed.

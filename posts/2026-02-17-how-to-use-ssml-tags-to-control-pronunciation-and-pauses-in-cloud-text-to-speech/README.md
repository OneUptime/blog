# How to Use SSML Tags to Control Pronunciation and Pauses in Cloud Text-to-Speech

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Text-to-Speech, SSML, Speech Synthesis, Audio Control

Description: Master SSML markup to control pronunciation, pauses, emphasis, and speaking style in Google Cloud Text-to-Speech for professional-quality audio output.

---

Plain text synthesis gets you reasonably good speech output, but it falls short when you need precise control over how things are pronounced. Acronyms get read letter by letter when you want them spoken as words. Numbers get inconsistent treatment. Pauses happen in the wrong places. And there is no way to add emphasis or change the speaking style mid-sentence.

SSML (Speech Synthesis Markup Language) solves all of these problems. It is an XML-based markup language that gives you fine-grained control over every aspect of the synthesized speech. Google Cloud Text-to-Speech supports SSML natively, and once you learn the key tags, the quality of your audio output jumps significantly.

## Basic SSML Structure

Every SSML document is wrapped in a `<speak>` tag:

```python
from google.cloud import texttospeech

def synthesize_ssml(ssml_text, output_path="output.mp3"):
    """Synthesize speech from SSML markup."""
    client = texttospeech.TextToSpeechClient()

    # Use SynthesisInput with ssml parameter instead of text
    synthesis_input = texttospeech.SynthesisInput(ssml=ssml_text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Neural2-D",
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )

    with open(output_path, "wb") as out:
        out.write(response.audio_content)

    print(f"Audio saved to: {output_path}")

# Basic SSML example
ssml = """
<speak>
    Hello, and welcome to our platform.
    <break time="500ms"/>
    Let me walk you through the key features.
</speak>
"""

synthesize_ssml(ssml, "welcome.mp3")
```

## Adding Pauses with break

The `<break>` tag lets you insert pauses of specific durations:

```python
# Different pause durations for different purposes
ssml_with_pauses = """
<speak>
    Step one: Open the settings panel.
    <break time="1s"/>
    Step two: Click on notifications.
    <break time="1s"/>
    Step three: Toggle the alert switch to on.
    <break time="2s"/>
    That's it. You're all set.
</speak>
"""

synthesize_ssml(ssml_with_pauses, "instructions.mp3")
```

You can specify pause duration in milliseconds (`500ms`) or seconds (`1s`, `2s`). You can also use strength values:

```python
ssml_pause_strengths = """
<speak>
    No pause between these words.
    <break strength="none"/>Continues immediately.
    <break strength="x-weak"/>Very slight pause.
    <break strength="weak"/>Short pause.
    <break strength="medium"/>Medium pause.
    <break strength="strong"/>Longer pause.
    <break strength="x-strong"/>Longest pause.
</speak>
"""
```

## Controlling Pronunciation with say-as

The `<say-as>` tag tells the engine how to interpret and pronounce specific content:

```python
# Control how different types of content are spoken
ssml_say_as = """
<speak>
    Your order number is <say-as interpret-as="characters">ABC123</say-as>.
    <break time="500ms"/>

    The total is <say-as interpret-as="currency" language="en-US">$42.50</say-as>.
    <break time="500ms"/>

    Please call us at <say-as interpret-as="telephone" format="1">8005551234</say-as>.
    <break time="500ms"/>

    Your appointment is on <say-as interpret-as="date" format="mdy">01/15/2026</say-as>.
    <break time="500ms"/>

    The time is <say-as interpret-as="time" format="hms12">2:30pm</say-as>.
    <break time="500ms"/>

    Version <say-as interpret-as="ordinal">3</say-as> is now available.
    <break time="500ms"/>

    We have processed <say-as interpret-as="cardinal">1042</say-as> requests today.
</speak>
"""

synthesize_ssml(ssml_say_as, "formatted_speech.mp3")
```

The interpret-as options include:
- `characters`: Spell out letter by letter
- `cardinal`: Read as a number ("one thousand forty-two")
- `ordinal`: Read as an ordinal ("third")
- `currency`: Read as money ("forty-two dollars and fifty cents")
- `telephone`: Read as a phone number
- `date`: Read as a date
- `time`: Read as a time
- `fraction`: Read as a fraction

## Adding Emphasis

The `<emphasis>` tag changes how strongly a word or phrase is stressed:

```python
ssml_emphasis = """
<speak>
    This feature is <emphasis level="strong">critically important</emphasis>
    for production environments.
    <break time="300ms"/>

    You should <emphasis level="moderate">always</emphasis> enable monitoring
    before deploying.
    <break time="300ms"/>

    The change is <emphasis level="reduced">relatively minor</emphasis>
    and should not affect performance.
</speak>
"""

synthesize_ssml(ssml_emphasis, "emphasis_demo.mp3")
```

Emphasis levels are: `strong`, `moderate`, and `reduced`.

## Controlling Prosody (Speed, Pitch, Volume)

The `<prosody>` tag lets you change speaking rate, pitch, and volume for specific sections:

```python
ssml_prosody = """
<speak>
    <prosody rate="slow" pitch="-2st">
        Important safety notice.
    </prosody>
    <break time="500ms"/>

    <prosody rate="medium">
        All users should update their passwords before the end of the month.
    </prosody>
    <break time="300ms"/>

    <prosody rate="fast" pitch="+2st" volume="loud">
        Act now to take advantage of our limited time offer!
    </prosody>
    <break time="500ms"/>

    <prosody rate="x-slow" volume="soft">
        Thank you for your patience during this maintenance window.
    </prosody>
</speak>
"""

synthesize_ssml(ssml_prosody, "prosody_demo.mp3")
```

Rate options: `x-slow`, `slow`, `medium`, `fast`, `x-fast`, or a percentage like `80%` or `120%`.
Pitch options: `x-low`, `low`, `medium`, `high`, `x-high`, or semitones like `+2st` or `-3st`.
Volume options: `silent`, `x-soft`, `soft`, `medium`, `loud`, `x-loud`, or dB like `+6dB`.

## Using sub for Abbreviation Expansion

The `<sub>` tag replaces text with a spoken alternative:

```python
ssml_substitution = """
<speak>
    The <sub alias="World Health Organization">WHO</sub> released new guidelines.
    <break time="300ms"/>

    Please update your <sub alias="Continuous Integration, Continuous Deployment">CI/CD</sub> pipeline.
    <break time="300ms"/>

    The server uses <sub alias="Transport Layer Security">TLS</sub> version
    <sub alias="one point three">1.3</sub> for encryption.
    <break time="300ms"/>

    Contact us at <sub alias="info at oneuptime dot com">info@oneuptime.com</sub>.
</speak>
"""

synthesize_ssml(ssml_substitution, "abbreviations.mp3")
```

## Building a Notification System with SSML

Here is a practical example that generates audio notifications with appropriate pacing and emphasis:

```python
from google.cloud import texttospeech

def generate_notification_audio(notification_type, message, details=None):
    """Generate an audio notification with appropriate SSML styling."""
    client = texttospeech.TextToSpeechClient()

    # Build SSML based on notification type
    if notification_type == "critical":
        ssml = f"""
        <speak>
            <prosody rate="95%" pitch="-1st">
                <emphasis level="strong">Critical alert.</emphasis>
                <break time="500ms"/>
                {message}
            </prosody>
            {f'<break time="800ms"/><prosody rate="90%">{details}</prosody>' if details else ''}
        </speak>
        """
    elif notification_type == "warning":
        ssml = f"""
        <speak>
            <prosody rate="medium">
                Warning.
                <break time="300ms"/>
                {message}
            </prosody>
            {f'<break time="500ms"/>{details}' if details else ''}
        </speak>
        """
    elif notification_type == "info":
        ssml = f"""
        <speak>
            <prosody rate="medium" pitch="+1st">
                {message}
            </prosody>
            {f'<break time="300ms"/>{details}' if details else ''}
        </speak>
        """
    else:
        ssml = f"<speak>{message}</speak>"

    synthesis_input = texttospeech.SynthesisInput(ssml=ssml)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Neural2-D",
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )

    output_path = f"notification_{notification_type}.mp3"
    with open(output_path, "wb") as out:
        out.write(response.audio_content)

    return output_path

# Generate different notification types
generate_notification_audio(
    "critical",
    "Database connection pool exhausted on production server.",
    "Current usage is at 100%. Immediate action required."
)

generate_notification_audio(
    "warning",
    "CPU usage on web server 3 has exceeded 85%.",
    "Consider scaling up or investigating the cause."
)

generate_notification_audio(
    "info",
    "Deployment to staging completed successfully.",
    "All 42 tests passed. Ready for production review."
)
```

## Combining Multiple SSML Tags

The real power of SSML comes from combining tags. Here is a complete example:

```python
ssml_combined = """
<speak>
    <prosody rate="95%">
        Good morning. This is your daily system status report for
        <say-as interpret-as="date" format="mdy">02/17/2026</say-as>.
    </prosody>

    <break time="800ms"/>

    <prosody rate="medium">
        All <say-as interpret-as="cardinal">3</say-as> production servers
        are operating normally.
        <break time="300ms"/>
        Average response time is
        <say-as interpret-as="cardinal">142</say-as> milliseconds,
        which is within acceptable range.
    </prosody>

    <break time="500ms"/>

    <emphasis level="moderate">However</emphasis>,
    <break time="200ms"/>
    disk usage on server
    <say-as interpret-as="characters">DB2</say-as>
    has reached <say-as interpret-as="cardinal">87</say-as> percent.

    <break time="300ms"/>

    <prosody rate="slow" pitch="-1st">
        Please schedule a cleanup before it reaches critical levels.
    </prosody>

    <break time="800ms"/>

    <prosody pitch="+1st">
        That concludes today's report. Have a productive day.
    </prosody>
</speak>
"""

synthesize_ssml(ssml_combined, "daily_report.mp3")
```

## SSML Best Practices

A few things I have learned from working with SSML:

- Test your SSML with the actual voice you plan to use. Different voices respond differently to the same markup.
- Do not over-use emphasis tags. If everything is emphasized, nothing stands out.
- Use breaks liberally between sections and after important information. Listeners need processing time.
- Keep prosody changes moderate. Extreme speed or pitch changes sound unnatural.
- Validate your SSML before sending it to the API. Malformed XML will cause errors.
- The maximum SSML input length is 5000 characters per request. For longer content, split it into multiple requests.

## Wrapping Up

SSML transforms Cloud Text-to-Speech from a basic text reader into a professional audio production tool. The ability to control pauses, pronunciation, emphasis, and pacing means you can create audio that sounds polished and intentional rather than robotic. Start with breaks and say-as tags for the biggest improvements, then layer in prosody and emphasis for fine-tuning.

For monitoring the health of your speech synthesis services and ensuring audio generation stays responsive, [OneUptime](https://oneuptime.com) provides the uptime monitoring tools you need for production reliability.

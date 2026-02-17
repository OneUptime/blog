# How to Implement Real-Time Streaming Speech Recognition with Cloud Speech-to-Text

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Speech-to-Text, Streaming Recognition, Real-Time Audio, Speech API

Description: Learn how to build real-time streaming speech recognition using Google Cloud Speech-to-Text API for live transcription and voice-driven applications.

---

Real-time speech recognition is a different beast from batch transcription. Instead of processing a complete audio file, you need to capture audio from a microphone or stream, send it to the API in chunks, and display results as they come in. This is what powers live captions, voice assistants, real-time meeting transcription, and voice-controlled interfaces.

Google Cloud Speech-to-Text supports streaming recognition through a bidirectional gRPC stream. You send audio data in and receive transcription results back, often before the speaker has even finished their sentence. Let me show you how to build this.

## How Streaming Recognition Works

The streaming API uses a bidirectional gRPC connection:

1. You open a stream to the Speech-to-Text API
2. You send audio chunks continuously as they are captured
3. The API sends back results in two forms:
   - **Interim results**: Partial transcriptions that update as the speaker continues (like watching autocomplete)
   - **Final results**: Complete transcriptions of finished utterances

This dual-result system means your UI can show text appearing in real time while still providing accurate final transcriptions.

## Prerequisites

Install the required packages:

```bash
# Install the Speech-to-Text client and audio capture library
pip install google-cloud-speech pyaudio

# On macOS, you may need to install portaudio first
# brew install portaudio

# On Ubuntu/Debian
# sudo apt install python3-pyaudio portaudio19-dev
```

## Basic Streaming Transcription from Microphone

Here is a complete example that captures audio from your microphone and transcribes it in real time:

```python
from google.cloud import speech
import pyaudio
import queue
import sys

# Audio recording parameters
RATE = 16000        # Sample rate in Hz
CHUNK = 1600        # Number of frames per buffer (100ms at 16kHz)
CHANNELS = 1        # Mono audio

class MicrophoneStream:
    """Opens a microphone stream as a generator yielding audio chunks."""

    def __init__(self, rate=RATE, chunk=CHUNK):
        self.rate = rate
        self.chunk = chunk
        self.buff = queue.Queue()
        self.closed = True

    def __enter__(self):
        # Initialize PyAudio and open the microphone stream
        self.audio_interface = pyaudio.PyAudio()
        self.audio_stream = self.audio_interface.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk,
            stream_callback=self._fill_buffer,
        )
        self.closed = False
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Clean up the audio stream
        self.audio_stream.stop_stream()
        self.audio_stream.close()
        self.closed = True
        self.buff.put(None)
        self.audio_interface.terminate()

    def _fill_buffer(self, in_data, frame_count, time_info, status_flags):
        """Callback that continuously collects audio data into the buffer."""
        self.buff.put(in_data)
        return None, pyaudio.paContinue

    def generator(self):
        """Generate audio chunks from the microphone."""
        while not self.closed:
            chunk = self.buff.get()
            if chunk is None:
                return

            data = [chunk]

            # Grab any additional buffered chunks
            while True:
                try:
                    chunk = self.buff.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break

            yield b"".join(data)


def stream_transcribe(language_code="en-US"):
    """Perform real-time streaming speech recognition from the microphone."""
    client = speech.SpeechClient()

    # Configure the recognition settings
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code=language_code,
        enable_automatic_punctuation=True,
        model="latest_long",
    )

    streaming_config = speech.StreamingRecognitionConfig(
        config=config,
        interim_results=True,  # Get partial results as they come in
    )

    print("Listening... (press Ctrl+C to stop)\n")

    with MicrophoneStream() as stream:
        audio_generator = stream.generator()

        # Create the stream of requests
        requests = (
            speech.StreamingRecognizeRequest(audio_content=content)
            for content in audio_generator
        )

        # Start the streaming recognition
        responses = client.streaming_recognize(
            config=streaming_config,
            requests=requests,
        )

        # Process the responses
        for response in responses:
            if not response.results:
                continue

            result = response.results[0]
            if not result.alternatives:
                continue

            transcript = result.alternatives[0].transcript

            if result.is_final:
                # Final result - print with confidence score
                confidence = result.alternatives[0].confidence
                print(f"Final:   {transcript} [{confidence:.2f}]")
            else:
                # Interim result - overwrite the current line
                sys.stdout.write(f"\rInterim: {transcript}")
                sys.stdout.flush()

# Run the streaming transcription
stream_transcribe("en-US")
```

## Handling the 5-Minute Stream Limit

Streaming recognition has a limit of approximately 5 minutes per stream. For longer sessions, you need to automatically restart the stream. Here is how to handle that:

```python
from google.cloud import speech
import time

class ContinuousStreamTranscriber:
    """Handles automatic stream restart for long transcription sessions."""

    def __init__(self, language_code="en-US"):
        self.client = speech.SpeechClient()
        self.language_code = language_code
        self.is_running = False

        # Track results across stream restarts
        self.all_transcripts = []

    def get_config(self):
        """Create the streaming recognition configuration."""
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=RATE,
            language_code=self.language_code,
            enable_automatic_punctuation=True,
            model="latest_long",
        )

        return speech.StreamingRecognitionConfig(
            config=config,
            interim_results=True,
        )

    def transcribe_continuous(self, duration_minutes=60):
        """Run continuous transcription, restarting streams as needed."""
        self.is_running = True
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)

        print(f"Starting continuous transcription for {duration_minutes} minutes")

        while self.is_running and time.time() < end_time:
            try:
                self._run_single_stream()
            except Exception as e:
                error_msg = str(e)
                if "exceeded maximum allowed stream duration" in error_msg.lower():
                    print("\nStream limit reached, restarting...")
                    continue
                else:
                    print(f"\nStream error: {error_msg}")
                    time.sleep(1)
                    continue

        print(f"\nTranscription complete. Total segments: {len(self.all_transcripts)}")
        return self.all_transcripts

    def _run_single_stream(self):
        """Run a single streaming recognition session."""
        streaming_config = self.get_config()

        with MicrophoneStream() as stream:
            audio_generator = stream.generator()

            requests = (
                speech.StreamingRecognizeRequest(audio_content=chunk)
                for chunk in audio_generator
            )

            responses = self.client.streaming_recognize(
                config=streaming_config,
                requests=requests,
            )

            for response in responses:
                if not response.results:
                    continue

                result = response.results[0]
                if not result.alternatives:
                    continue

                transcript = result.alternatives[0].transcript

                if result.is_final:
                    self.all_transcripts.append({
                        "text": transcript,
                        "confidence": result.alternatives[0].confidence,
                        "timestamp": time.time(),
                    })
                    print(f"\n[Final] {transcript}")

    def stop(self):
        """Stop the continuous transcription."""
        self.is_running = False

# Run continuous transcription
transcriber = ContinuousStreamTranscriber("en-US")
results = transcriber.transcribe_continuous(duration_minutes=30)
```

## Adding Voice Activity Detection

You can configure the API to handle pauses and silence better with voice activity detection settings:

```python
def get_streaming_config_with_vad(language_code="en-US"):
    """Create config with voice activity detection settings."""
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code=language_code,
        enable_automatic_punctuation=True,
        model="latest_long",
    )

    # Configure streaming-specific settings
    streaming_config = speech.StreamingRecognitionConfig(
        config=config,
        interim_results=True,
        # Stop listening after this much silence at the end of audio
        single_utterance=False,  # Set True for single-command recognition
    )

    return streaming_config
```

## Streaming from Audio Files (for Testing)

When developing, it is useful to test with audio files instead of a live microphone:

```python
from google.cloud import speech
import time

def stream_from_file(audio_path, language_code="en-US"):
    """Stream an audio file to Speech-to-Text as if it were live."""
    client = speech.SpeechClient()

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code=language_code,
        enable_automatic_punctuation=True,
    )

    streaming_config = speech.StreamingRecognitionConfig(
        config=config,
        interim_results=True,
    )

    def audio_file_generator():
        """Read audio file in chunks to simulate streaming."""
        with open(audio_path, "rb") as audio_file:
            while True:
                # Read 3200 bytes at a time (100ms of 16kHz 16-bit mono audio)
                data = audio_file.read(3200)
                if not data:
                    break

                yield speech.StreamingRecognizeRequest(audio_content=data)

                # Sleep to simulate real-time audio
                time.sleep(0.1)

    responses = client.streaming_recognize(
        config=streaming_config,
        requests=audio_file_generator(),
    )

    for response in responses:
        for result in response.results:
            if result.is_final:
                print(f"Final: {result.alternatives[0].transcript}")

stream_from_file("test_audio.wav")
```

## Performance Tips

A few things I have learned from building streaming speech applications:

- Use 16kHz sample rate with LINEAR16 encoding for the best balance of quality and performance.
- Keep audio chunks around 100ms each. Too small and you waste network overhead; too large and you add latency.
- Process interim results for UI display but only save final results to your database.
- Handle network interruptions gracefully by restarting the stream automatically.
- If you do not need interim results, disable them to reduce bandwidth.

## Wrapping Up

Streaming speech recognition opens up interactive voice experiences that batch transcription cannot provide. The real-time feedback from interim results makes applications feel responsive and natural. The main challenges are handling the 5-minute stream limit for long sessions and managing the microphone audio capture cleanly, but both are straightforward to solve.

For monitoring the uptime and latency of your real-time transcription services, [OneUptime](https://oneuptime.com) can track API response times and alert you when streaming endpoints show degraded performance.

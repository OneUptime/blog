# Validation Summary: How to Run Coqui TTS in Docker for Text-to-Speech

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Coqui TTS / coqui-tts
- XTTS v2
- Docker
- Docker Compose
- NVIDIA GPU device reservations in Compose
- FastAPI
- Python
- Whisper ASR Webservice

## Sources Consulted
- Coqui TTS Docker images documentation: https://coqui-tts.readthedocs.io/en/latest/docker_images.html
- Coqui TTS demo server documentation: https://coqui-tts.readthedocs.io/en/latest/server.html
- Coqui TTS voice cloning documentation: https://coqui-tts.readthedocs.io/en/latest/cloning.html
- Coqui TTS XTTS documentation: https://coqui-tts.readthedocs.io/en/latest/models/xtts.html
- Coqui TTS Python/API and installation documentation on PyPI: https://pypi.org/project/coqui-tts/
- Coqui TTS released model metadata: https://raw.githubusercontent.com/idiap/coqui-ai-TTS/dev/TTS/.models.json
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Whisper ASR Webservice Docker documentation: https://github.com/ahmetoner/whisper-asr-webservice

## Issues Found
- The Docker server examples used the old `ghcr.io/coqui-ai/tts` image and passed `--server` to the image command. Current Coqui TTS Docker documentation uses the maintained `ghcr.io/idiap/coqui-tts-cpu` / `ghcr.io/idiap/coqui-tts` images and starts the demo server with `tts-server` inside the container. Updated the Docker run and Compose examples accordingly.
- The XTTS GPU Compose example did not pass the documented CUDA flag to the server startup. Updated the command to run `tts-server ... --use_cuda`.
- The voice cloning curl example sent JSON to `/api/tts`, but the documented demo server endpoint accepts request parameters for `text`, `language_id`, and `speaker_wav`. Changed it to a parameterized curl request with `--data-urlencode`.
- The custom Dockerfile installed the old `TTS` package name. Updated it to install PyTorch dependencies plus the maintained `coqui-tts` package.
- The custom FastAPI example passed `language` and `speed` unconditionally to `tts_to_file`, which fails for the default single-language VITS model. Added a helper that only passes `language` for multilingual models and `speed` for XTTS models.
- The custom FastAPI voice clone route did not handle non-cloning models clearly. Added a 400 response when the loaded model does not support voice cloning.
- The Whisper ASR Compose service omitted the documented `ASR_ENGINE=openai_whisper` setting. Added it to match the service documentation.
- Several model-size values in the model table were inaccurate for the current released assets. Updated the column to `Approx. Size` and corrected the listed LJSpeech model sizes.

## Review Notes
The Coqui TTS ecosystem has shifted from the original unmaintained `coqui-ai/TTS` package and images to the maintained `idiap/coqui-ai-TTS` fork and `coqui-tts` PyPI package. Docker Compose `version: "3.8"` is now obsolete but still accepted for backward compatibility, so it was left unchanged because it is not a functional error.

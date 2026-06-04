# Validation Summary: How to Run Whisper (Speech-to-Text) in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- NVIDIA GPU support for Docker
- OpenAI Whisper
- Whisper ASR Webservice
- FastAPI
- Uvicorn
- Python requests
- faster-whisper
- CTranslate2
- FFmpeg

## Sources Consulted
- OpenAI Whisper GitHub README: https://github.com/openai/whisper
- OpenAI Whisper tokenizer source: https://github.com/openai/whisper/blob/main/whisper/tokenizer.py
- OpenAI Speech to text documentation: https://developers.openai.com/api/docs/guides/speech-to-text
- Whisper ASR Webservice GitHub README: https://github.com/ahmetoner/whisper-asr-webservice
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- faster-whisper GitHub README: https://github.com/SYSTRAN/faster-whisper
- Speaches/faster-whisper-server configuration documentation: https://speaches.ai/configuration/

## Issues Found
- The introduction claimed Whisper handles transcription and translation across 97 languages. Current OpenAI materials describe broad multilingual support, while the open-source tokenizer defaults to 99 language tokens and OpenAI API docs list only languages meeting their quality threshold. Changed the wording to "many languages" to avoid an inaccurate hard count.
- The model table used outdated relative speed values and omitted the current `turbo` model. Updated the table to match the current OpenAI Whisper README values for required VRAM and relative speed, and added `turbo`.
- The quick-start `docker run` example did not publish port 9000 and passed `--model` / `--port` arguments after the image name. The Whisper ASR Webservice documentation configures this image with `ASR_MODEL` and `ASR_ENGINE` environment variables and `-p 9000:9000`. Updated the command accordingly.
- The GPU Compose example labeled `ASR_ENGINE` as the compute device setting and omitted `ASR_DEVICE=cuda`. Updated the comment and added the documented device environment variable.
- The summary claimed GPU acceleration keeps transcription fast enough for real-time use cases. Whisper throughput depends heavily on model, hardware, audio, and implementation, so this was softened to "many use cases."

## Review Notes
The custom FastAPI examples are syntactically valid and use current FastAPI multipart upload patterns. They are intentionally minimal and do not include production concerns such as request size limits, authentication, concurrent model access tuning, or error handling for failed transcription responses.

# Validation Summary: How to Run AI Recipes with Podman AI Lab

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman AI Lab
- AI Lab recipes
- Podman pods and containers
- Streamlit-based AI applications
- llama-cpp-python model serving
- Retrieval-Augmented Generation (RAG)
- ChromaDB / vector databases

## Sources Consulted
- Podman AI Lab extension page: https://podman-desktop.io/extensions/ai-lab
- Podman AI Lab blog and recipe workflow: https://podman-desktop.io/blog/podman-ai-lab-create-ai-app-with-llm-running-locally
- Podman AI Lab extension source repository: https://github.com/containers/podman-desktop-extension-ai-lab
- AI Lab recipes source repository: https://github.com/containers/ai-lab-recipes
- Podman `machine inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman `machine set` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman `ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `pod ps` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman `stats` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `pod stats` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-stats.1.html

## Issues Found
- The post used `AI Lab > Recipes` as the navigation path. Updated it to `AI Apps > Recipe Catalog`, matching current Podman AI Lab UI/source references.
- The model verification path used `/var/lib/containers/ai-lab/models/`. Updated it to `/home/user/ai-lab/models/`, which is the Podman machine model upload path used by the AI Lab extension.
- Several commands filtered containers with non-existent `ai-lab-recipe`, `ai-lab-recipe-server`, and `ai-lab-recipe-frontend` labels. Updated commands to use AI Lab pod labels such as `ai-lab-recipe-id` and then inspect containers by pod.
- The post used `podman stats --filter`, but official `podman stats` does not support `--filter`. Updated the resource command to use `podman pod stats --no-stream`.
- Stop/remove examples used container operations for recipe cleanup. Updated them to `podman pod stop` and `podman pod rm`, because AI Lab recipes are launched as pods.
- The RAG verification command used container labels and an invalid pod format placeholder. Updated it to `podman pod ps --filter "label=ai-lab-recipe-id=rag"` with `{{.Name}}`.
- The RAG upload instructions said Markdown files were supported. The current RAG Streamlit app accepts `.txt` and `.pdf`, so the instructions now say PDF or TXT.
- The recipe path `recipes/chatbot` was outdated. Updated it to `recipes/natural_language_processing/chatbot`.
- The customization section described a flat recipe layout. Updated it to mention `ai-lab.yaml`, `app/Containerfile`, `app/*.py`, and `app/requirements.txt`.
- The manual model server command used an incorrect image, CLI argument, port, and model path. Updated it to the current `quay.io/ai-lab/llamacpp_python:latest` image with `MODEL_PATH`, `HOST`, and `PORT` environment variables.
- The frontend endpoint example used port `8080`. Updated it to `8001`, matching the llama-cpp-python recipe model server default.

## Review Notes
The local review environment did not have `podman` installed, so CLI behavior was verified against official Podman documentation and current upstream Podman AI Lab / AI Lab recipes source. Podman Desktop may assign random host ports for apps started from the UI; the post now points readers to the AI App Details "Open AI App" button for that case.

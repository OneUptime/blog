# Validation Summary: How to Use AI Playgrounds in Podman AI Lab

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman AI Lab
- AI Lab Playground environments
- AI Lab model services / inference servers
- OpenAI-compatible chat completion APIs
- Bash, curl, and Python JSON parsing

## Sources Consulted
- Podman Desktop documentation: Creating a playground: https://podman-desktop.io/docs/ai-lab/create-playground
- Podman Desktop documentation: Downloading a model: https://podman-desktop.io/docs/ai-lab/download-model
- Podman Desktop documentation: Installing Podman AI Lab: https://podman-desktop.io/docs/ai-lab/installing
- Podman Desktop tutorial: Running an AI application: https://podman-desktop.io/tutorial/running-an-ai-application
- Podman AI Lab extension repository and source: https://github.com/containers/podman-desktop-extension-ai-lab
- Podman documentation: podman-machine-inspect: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman documentation: podman-info: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman documentation: podman-ps: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html

## Issues Found
- The model verification command used a hard-coded Podman machine path (`/var/lib/containers/ai-lab/models/`) that does not match the current AI Lab storage model. Replaced it with the supported UI verification path: AI Lab > Catalog > Downloaded.
- The version check used `podman info --format '{{.Version.Version}}'`. Updated it to the documented `podman version --format '{{.Client.Version}}'` form.
- The Playground creation steps omitted the current inference runtime selection and implied the model is selected inside an existing Playground. Updated the steps to match the current new Playground form.
- The API example searched for the wrong label (`ai-lab`) and assumed host port `8080`. Updated it to use AI Lab's `ai-lab-inference-server` label and read the service's `api` label, which supports runtime-specific base paths such as `/v1` and `/v3`.
- The troubleshooting commands used the wrong label and `--latest`, which is not supported by the remote Podman client used on macOS and Windows. Updated the commands to filter by `ai-lab-inference-server` and select the first matching container without `--latest`.
- The post claimed that Playground conversations can be exported from the UI. The current AI Lab source exposes a delete action for conversations but no built-in export action. Reworded that section to focus on reviewing conversations in the UI.
- Adjusted the machine memory unit from `MB` to `MiB` to match Podman machine resource semantics more closely.

## Review Notes
The post is technically relevant and contains implementation details, so it was reviewed as a code/tutorial post. The local review environment did not have the `podman` CLI installed, so CLI behavior was verified against official Podman documentation and the current Podman AI Lab source rather than local command execution.

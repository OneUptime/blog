# Validation Summary: How to Download AI Models with Podman AI Lab

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman Desktop
- Podman AI Lab
- Podman CLI and Podman machine
- GGUF model files and quantization
- Hugging Face model downloads

## Sources Consulted
- Podman Desktop AI Lab documentation: https://podman-desktop.io/docs/ai-lab
- Podman Desktop downloading a model documentation: https://podman-desktop.io/docs/ai-lab/download-model
- Podman AI Lab extension README: https://github.com/containers/podman-desktop-extension-ai-lab
- Podman AI Lab extension source catalog: https://github.com/containers/podman-desktop-extension-ai-lab/blob/main/packages/backend/src/assets/ai.json
- Podman AI Lab configuration and model manager source: https://github.com/containers/podman-desktop-extension-ai-lab/tree/main/packages/backend/src
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html

## Issues Found
- The post used **AI Lab > Models** as the catalog location. Official docs identify the model list as **AI Lab > Catalog**, so the UI instructions were updated.
- The post used the non-existent or unsupported model path `/var/lib/containers/ai-lab/models/`. Current AI Lab stores URL-downloaded models under the extension's configured `models.path`, defaulting to the Podman Desktop extension storage directory. Commands were updated to use `~/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab/models` on Linux, with a note for macOS and Windows.
- The post used the incorrect container label `ai-lab-model`. Current AI Lab inference server containers use `ai-lab-inference-server`, so the `podman ps` and restart examples were corrected.
- The model examples were outdated and listed models that are not in the current curated catalog. They were replaced with current catalog examples such as Granite 4.0, Qwen3, Gemma 3n, and Granite code models.
- The custom model workflow claimed that copying a GGUF file into a Podman machine path would make it appear in AI Lab. Current AI Lab imports local models through the Import Model workflow and records them in the user catalog, so the example now downloads to a local folder and instructs the reader to import it through the UI.
- The troubleshooting commands cleared `.part` files in the wrong location and restarted containers with the wrong label. They now clear AI Lab URL downloader `.tmp` files and restart inference server containers selected by the current label.
- The quantization explanation said "lower quantization" and "higher quantization," which is ambiguous. It was changed to "fewer quantization bits" and "more quantization bits."

## Review Notes
Podman was not installed in the review workspace, so CLI validation used official Podman command documentation instead of local `--help` output. Some AI Lab storage behavior is implementation-specific and may vary by operating system or by a user-configured Models path.

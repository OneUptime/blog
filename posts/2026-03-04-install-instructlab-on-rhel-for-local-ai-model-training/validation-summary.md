# Validation Summary: How to Install InstructLab on RHEL for Local AI Model Training

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Python 3.11
- InstructLab CLI
- InstructLab taxonomy and knowledge `qna.yaml`
- Local LLM model download, serving, data generation, and training

## Sources Consulted
- InstructLab CLI command reference: https://instructlab.readthedocs.io/latest/ilab.html
- InstructLab Linux NVIDIA installation guide: https://docs.instructlab.ai/getting-started/linux_nvidia/
- InstructLab initialization guide: https://docs.instructlab.ai/getting-started/initilize_ilab/
- InstructLab downloading models guide: https://docs.instructlab.ai/getting-started/download_models/
- InstructLab serving and chatting guide: https://docs.instructlab.ai/getting-started/serve_and_chat/
- InstructLab creating new knowledge or skills guide: https://docs.instructlab.ai/adding-data-to-model/creating_new_knowledge_or_skills/
- InstructLab knowledge overview: https://docs.instructlab.ai/taxonomy/knowledge/
- InstructLab knowledge contribution details: https://docs.instructlab.ai/taxonomy/upstream/knowledge_contribution_details/
- Red Hat Enterprise Linux 9 Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages
- Hugging Face model repository for `instructlab/granite-7b-lab-GGUF`: https://huggingface.co/instructlab/granite-7b-lab-GGUF

## Issues Found
- The prerequisites said "RHEL 9 with Python 3.11+" even though Red Hat documents Python 3.11 availability for RHEL 9.2 and later. Updated this to "RHEL 9.2 or later with Python 3.11."
- The virtual environment command omitted `--upgrade-deps`, which is used in the official InstructLab Linux quickstart. Updated the command accordingly.
- The install command used bare `pip`; changed it to `python -m pip install instructlab` so it clearly targets the active virtual environment.
- The initialization section listed `~/.local/share/instructlab/config.yaml` as the config file path. Current InstructLab CLI documentation uses `~/.config/instructlab/config.yaml`, while taxonomy/data remain under `~/.local/share/instructlab/`.
- The model download comment called the default model Granite, but current CLI documentation defaults to `instructlab/merlinite-7b-lab-GGUF`. Updated the comment to "default model" and kept Granite as an explicit model download example.
- The `qna.yaml` example had only one `seed_examples` entry and an abbreviated commit hash. Official knowledge contribution guidance requires at least five seed example sets, three Q&A pairs per context, a `.git` repository URL, and a full commit SHA. Expanded the example and corrected the repository and commit placeholders.
- The original DNF explanation said DNF replaced YUM and claimed faster dependency resolution. This was not necessary for the taxonomy example and was more version/history-specific than the post needed, so it was replaced with directly verifiable RHEL 9 package-manager wording.
- The CPU training example used only `--device cpu`. Official InstructLab training examples include `--pipeline full --device cpu --data-path <generated jsonl>`, so the CPU example was updated.
- The fine-tuned model serving and chat commands pointed at the checkpoints directory rather than a model file/path. Updated both examples to use a `<new-model-path>` placeholder matching the documented `--model-path` and `--model` usage.
- The taxonomy validation section used `ilab taxonomy validate`, which is not present in the current CLI command reference. Replaced it with `ilab taxonomy diff --taxonomy-base=empty`, which official documentation describes for validating the full taxonomy.

## Review Notes
The post remains a high-level local workflow. For production RHEL systems with NVIDIA GPUs, future revisions could add the full CUDA-specific InstructLab installation path and vLLM guidance, but that would be an expansion rather than a correction to this CPU-capable tutorial.

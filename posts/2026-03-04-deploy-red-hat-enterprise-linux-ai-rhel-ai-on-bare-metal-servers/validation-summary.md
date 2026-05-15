# Validation Summary: How to Deploy Red Hat Enterprise Linux AI (RHEL AI) on Bare-Metal Servers

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux AI
- InstructLab (`ilab`)
- IBM Granite models
- Bare-metal Linux installation
- NVIDIA GPU tooling
- systemd user services
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux AI 1.2 Installing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.2/html-single/installing/index
- Red Hat Enterprise Linux AI 1.2 Building your RHEL AI environment: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.2/html-single/building_your_rhel_ai_environment/index
- Red Hat Enterprise Linux AI 1.2 Getting Started / hardware requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.2/pdf/getting_started/Red_Hat_Enterprise_Linux_AI-1.2-Getting_Started-en-US.pdf
- Red Hat Enterprise Linux AI 1.5 Hardware Requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.5/html-single/hardware_requirements/index
- Red Hat Enterprise Linux AI 1.5 CLI Reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.5/html-single/cli_reference/index
- Red Hat Enterprise Linux AI 1.5 Building and maintaining your environment: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.5/html-single/building_and_maintaining_your_environment/building_and_maintaining_your_environment
- Red Hat Enterprise Linux AI 1.5 Creating skills and knowledge YAML files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.5/html-single/creating_skills_and_knowledge_yaml_files/index
- Red Hat Enterprise Linux AI 1.5 Generating a custom LLM using RHEL AI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/1.5/html/generating_a_custom_llm_using_rhel_ai/train_and_eval
- Red Hat Enterprise Linux AI 3.3 Getting Started: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/3.3/html-single/getting_started/index

## Issues Found
- The opening description did not identify that the commands are for the InstructLab-based RHEL AI 1.x workflow. I added that version-context caveat because current RHEL AI 3.x documentation emphasizes Red Hat AI Inference Server and a different serving workflow.
- The post implied Granite models are included and ready to serve immediately after installation. Red Hat documents that the image includes InstructLab tooling and that Granite LLMs are downloaded from the Red Hat RHEL AI registry, so I changed the wording and added an `ilab model download` step before serving.
- The download section mentioned Red Hat Image Builder for a custom image. The RHEL AI installation docs describe RHEL GUI and Kickstart methods with embedded or custom bootc container images, so I corrected that note.
- The prerequisites understated storage requirements with "At least 200 GB disk space." Red Hat documentation recommends at least 120 GB for `/` and 1 TB of additional RHEL AI data storage in `/home`, so I corrected the requirement.
- The GPU prerequisite was too broad for customization and too narrow for inference-serving details. I clarified supported NVIDIA inference-serving GPUs and noted that the full customization workflow needs multi-GPU systems.
- The curl example used a generic `"model": "granite"` value, while Red Hat's documented RHEL AI 1.x workflow tests serving with `ilab model chat` and requires the chat model to match the served model. I replaced the curl test with `ilab model chat`.
- The taxonomy customization section omitted validation of `qna.yaml`. I added `ilab taxonomy diff`, which Red Hat documents as the validation command for taxonomy and YAML format.
- The training command used bare `ilab model train`, but Red Hat's RHEL AI customization workflow documents LAB multi-phase training with explicit phase data files. I updated the command to use `--strategy lab-multiphase` and the generated dataset placeholders.
- The customized serving command pointed at the checkpoints directory rather than the best-performing checkpoint path. I changed it to `ilab model serve --model-path <path-to-best-performed-checkpoint>`.
- The systemd service name `rhel-ai-serve` is not the documented InstructLab serving service. I replaced it with the documented user service pattern using `$HOME/.config/systemd/user/ilab-serve.service`, `systemctl --user`, and `journalctl --user-unit`.

## Review Notes
The post is now technically consistent with the RHEL AI 1.x InstructLab workflow it demonstrates. A future larger rewrite could cover the newer RHEL AI 3.x Red Hat AI Inference Server Quadlet workflow, but that would be a different tutorial rather than a narrow correctness fix.

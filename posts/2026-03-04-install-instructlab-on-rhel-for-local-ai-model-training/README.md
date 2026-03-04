# How to Install InstructLab on RHEL for Local AI Model Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, InstructLab, AI, Machine Learning, LLM

Description: Install and configure InstructLab on RHEL to fine-tune large language models locally using synthetic data generation and taxonomy-driven training.

---

InstructLab is an open-source project that lets you contribute knowledge and skills to large language models (LLMs) without needing massive training infrastructure. It uses a taxonomy-driven approach to generate synthetic training data and fine-tune models locally on RHEL.

## Prerequisites

- RHEL 9 with Python 3.11+
- At least 16 GB RAM (more for larger models)
- A GPU with CUDA support is recommended but not required for CPU-only training

## Install InstructLab

```bash
# Install Python 3.11 and development tools
sudo dnf install -y python3.11 python3.11-devel python3.11-pip gcc gcc-c++ make

# Create a virtual environment
python3.11 -m venv ~/instructlab-venv
source ~/instructlab-venv/bin/activate

# Install InstructLab
pip install instructlab

# Verify the installation
ilab --version
```

## Initialize the Project

```bash
# Initialize the InstructLab project directory
ilab config init

# This creates:
# ~/.local/share/instructlab/config.yaml
# ~/.local/share/instructlab/taxonomy/
```

## Download a Base Model

```bash
# Download the default Granite model
ilab model download

# Or download a specific model
ilab model download --repository instructlab/granite-7b-lab-GGUF \
    --filename granite-7b-lab-Q4_K_M.gguf

# List downloaded models
ilab model list
```

## Serve the Model Locally

```bash
# Start the model server
ilab model serve

# In another terminal, test with a chat session
ilab model chat
```

## Add Knowledge to the Taxonomy

Create a knowledge contribution in the taxonomy:

```bash
# Navigate to the taxonomy directory
cd ~/.local/share/instructlab/taxonomy

# Create a knowledge directory
mkdir -p knowledge/technology/rhel

# Create a qna.yaml file with questions and answers
cat > knowledge/technology/rhel/qna.yaml << 'EOF'
created_by: nawazdhandala
version: 3
domain: technology
seed_examples:
  - context: |
      Red Hat Enterprise Linux uses DNF as its package manager.
      DNF replaces YUM and provides faster dependency resolution.
    questions_and_answers:
      - question: What package manager does RHEL use?
        answer: RHEL uses DNF as its package manager, which replaced YUM.
      - question: What advantage does DNF have over YUM?
        answer: DNF provides faster dependency resolution compared to YUM.
      - question: How do you install a package on RHEL?
        answer: Use the command sudo dnf install package-name to install packages on RHEL.
document_outline: Overview of RHEL package management with DNF
document:
  repo: https://github.com/your-repo/rhel-docs
  commit: abc123
  patterns:
    - "*.md"
EOF
```

## Generate Synthetic Training Data

```bash
# Generate training data from the taxonomy
ilab data generate

# This creates synthetic question-answer pairs based on your taxonomy contributions
# Output is saved to ~/.local/share/instructlab/datasets/
```

## Train the Model

```bash
# Run training on the generated data
ilab model train

# For CPU-only training (slower but works without GPU)
ilab model train --device cpu

# This creates a fine-tuned model checkpoint
```

## Test the Fine-Tuned Model

```bash
# Serve the trained model
ilab model serve --model-path ~/.local/share/instructlab/checkpoints/

# Chat with the fine-tuned model
ilab model chat --model ~/.local/share/instructlab/checkpoints/
```

## Validate the Taxonomy

```bash
# Check that your taxonomy changes are valid
ilab taxonomy diff

# Validate the YAML format
ilab taxonomy validate
```

InstructLab on RHEL provides a practical workflow for customizing LLMs with domain-specific knowledge without needing cloud-scale GPU infrastructure.

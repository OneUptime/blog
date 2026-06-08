# Validation Summary: How to Create Custom Modelfiles in Ollama

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ollama (CLI and Modelfile syntax)
- Llama 3.2 base model
- LoRA (Low-Rank Adaptation) adapters
- Go template syntax (for Modelfile TEMPLATE instruction)
- Python (subprocess-based testing script)
- Bash (build scripts)

## Sources Consulted
- Ollama Modelfile reference: https://github.com/ollama/ollama/blob/main/docs/modelfile.md
- Ollama template documentation: https://github.com/ollama/ollama/blob/main/docs/template.md
- Ollama CLI reference: https://github.com/ollama/ollama/blob/main/docs/cli.md
- Ollama model library (llama3.2 tags): https://ollama.com/library/llama3.2
- Ollama source: `cmd/cmd.go` and `parser/parser.go` in the ollama/ollama main branch

## Issues Found
1. **llama3.2 model size was misstated as 8B.** The comment "Based on the capable llama3.2 model with 8B parameters" was incorrect — llama3.2 ships as 1B and 3B only (default tag is 3B). Changed to "Based on the capable llama3.2 model (3B parameters by default)". The 8B variant belongs to llama3.1, not llama3.2.
2. **ADAPTER format outdated.** The comment said "Adapters are typically in safetensors or GGML format." Ollama's current Modelfile documentation supports safetensors and GGUF for the ADAPTER instruction; GGML is the deprecated predecessor of GGUF. Changed "GGML" to "GGUF".
3. **`.First` listed as a template variable.** Ollama's template documentation does not list `.First` as a template variable — the documented variables are `.System`, `.Prompt`, `.Response`, `.Suffix`, `.Messages`, `.Role`, and `.Tools`. Replaced `.First` (Boolean: first message?) with `.Suffix` (Fill-in-middle suffix text) in the mermaid diagram so the listed variables are all valid.
4. **Troubleshooting tip referenced a nonexistent llama3.2 8B variant.** The comment "FROM llama3.2:3b  # Instead of 8B or larger" was misleading since no 8B llama3.2 exists. Changed to "FROM llama3.2:1b  # Instead of 3B or larger" so the example uses a real, smaller variant.

## Review Notes
- The `mirostat`, `mirostat_tau`, and `mirostat_eta` parameters are still parsed by Ollama (legacy code in `parser/parser.go`) and the defaults shown in the post (0, 5.0, 0.1) match llama.cpp tradition, but they are no longer listed in the current Modelfile docs. Left in place since the values are still functional and accurately documented within the post.
- The post does not state Ollama's default `num_ctx` (which is 2048); the examples use 4096/8192. Not incorrect since the post explicitly sets `num_ctx` in each Modelfile example, but readers should be aware the default is lower.
- All CLI commands (`ollama create -f`, `ollama show --modelfile`, `ollama show --license`, `ollama cp`, `ollama rm`, `ollama run --verbose`) verified against `cmd/cmd.go` and confirmed valid.
- All Modelfile instructions used (FROM, SYSTEM, PARAMETER, TEMPLATE, MESSAGE, ADAPTER) are valid current syntax.
- Documented parameter defaults (temperature 0.8, top_k 40, top_p 0.9, repeat_penalty 1.1, num_predict -1) match Ollama's current Modelfile reference.
- The Python testing script uses standard `subprocess` patterns and is syntactically and behaviorally sound.

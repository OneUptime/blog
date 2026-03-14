# Parsing Cilium Bugtool Zsh Completion Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Zsh, Parsing, Scripting

Description: Extract subcommands, flags, and descriptions from cilium-bugtool zsh completion scripts for automated documentation and tooling.

---

## Introduction

Zsh provides one of the most powerful completion systems among Unix shells, with support for descriptions, grouping, and context-aware suggestions. The `cilium-bugtool completion zsh` command generates a completion script that takes advantage of these features.




Zsh completion scripts contain rich metadata about commands, flags, and their descriptions in a structured format. Parsing this data enables automated documentation generation and CLI validation testing.

This guide covers parsing techniques specific to zsh completion output.

## Prerequisites

- Zsh shell (v5.0+)
- `cilium-bugtool` binary available or access to a Cilium pod
- Understanding of zsh fpath and compinit (for troubleshooting)

## Capturing Completion Output




\`\`\`bash
# Capture the completion output
cilium-bugtool completion zsh > /tmp/bugtool-zsh-completion.zsh
wc -l /tmp/bugtool-zsh-completion.zsh
\`\`\`

### Extracting Subcommands

\`\`\`bash
# Extract commands with descriptions
grep -oP "'[a-z][-a-z]*\[.*?\]" /tmp/bugtool-zsh-completion.zsh |   sed "s/'//g;s/\[/: /;s/\]//" | sort -u
\`\`\`

### Extracting Flags

\`\`\`bash
# Extract flags with descriptions
grep -oP "'--[a-z][-a-z0-9]*\[.*?\]" /tmp/bugtool-zsh-completion.zsh |   sed "s/'//g;s/\[/: /;s/\]//" | sort -u
\`\`\`

### Python Parser

\`\`\`python
#!/usr/bin/env python3
"""Parse cilium-bugtool zsh completion output."""
import re, json, sys

def parse_zsh_completion(filepath):
    with open(filepath) as f:
        content = f.read()
    commands = [{'name': m.group(1), 'description': m.group(2)}
        for m in re.finditer(r"'([a-z][-a-z]*)\[([^\]]*)\]", content)]
    flags = [{'flag': m.group(1), 'description': m.group(2)}
        for m in re.finditer(r"'(--[a-z][-a-z0-9]*)\[([^\]]*)\]", content)]
    return {'commands': commands, 'flags': flags}

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bugtool-zsh-completion.zsh'
    print(json.dumps(parse_zsh_completion(path), indent=2))
\`\`\`

## Verification

```bash
# Verify parsing
python3 parse_zsh_completion.py /tmp/bugtool-zsh-completion.zsh | jq '.commands | length'
python3 parse_zsh_completion.py /tmp/bugtool-zsh-completion.zsh | jq '.flags | length'
```

## Troubleshooting

- **"_cilium-bugtool: function definition file not found"**: File must be named `_cilium-bugtool` with underscore prefix and be in fpath.
- **Stale completions after upgrade**: Run `rm -f ~/.zcompdump*` and restart zsh.
- **Slow shell startup**: Use `compinit -C` to skip security checks on the dump file.
- **Oh My Zsh interference**: Place completions in `$ZSH_CUSTOM/plugins/` or ensure fpath is set before Oh My Zsh loads.

## Conclusion




Parsing zsh completion scripts provides machine-readable access to the cilium-bugtool command structure, enabling automated documentation and CLI coverage testing.

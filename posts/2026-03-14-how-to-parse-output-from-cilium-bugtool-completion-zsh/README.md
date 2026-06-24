# Parsing Cilium Bugtool Zsh Completion Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Zsh, Parsing, Scripting

Description: Extract subcommands, flags, and descriptions from cilium-bugtool zsh completion scripts for automated documentation and tooling.

---

## Introduction

Zsh provides one of the most powerful completion systems among Unix shells, with support for descriptions, grouping, and context-aware suggestions. The `cilium-bugtool completion zsh` command generates a completion script that takes advantage of these features.




The generated zsh script uses Cobra's dynamic completion protocol: it calls `cilium-bugtool __complete` and converts tab-separated descriptions into the format zsh's `_describe` helper expects. Querying that completion protocol gives access to commands, flags, and their descriptions for automated documentation generation and CLI validation testing.

This guide covers parsing techniques specific to zsh completion output.

## Prerequisites

- Zsh shell (v5.0+)
- `cilium-bugtool` binary available or access to a Cilium pod
- Understanding of zsh fpath and compinit (for troubleshooting)

## Capturing Completion Output




```bash
## Capture the completion output
cilium-bugtool completion zsh > /tmp/bugtool-zsh-completion.zsh
wc -l /tmp/bugtool-zsh-completion.zsh

## Capture the dynamic completion candidates used by the zsh script
cilium-bugtool __complete "" > /tmp/bugtool-zsh-root-completions.txt 2>/dev/null
cilium-bugtool __complete -- > /tmp/bugtool-zsh-flag-completions.txt 2>/dev/null
```

### Extracting Subcommands

```bash
## Extract commands with descriptions
awk -F '\t' '$1 !~ /^--/ && $1 !~ /^:/ { print $1 ": " $2 }' /tmp/bugtool-zsh-root-completions.txt | sort -u
```

### Extracting Flags

```bash
## Extract flags with descriptions
awk -F '\t' '$1 ~ /^--/ { print $1 ": " $2 }' /tmp/bugtool-zsh-flag-completions.txt | sort -u
```

### Python Parser

```python
#!/usr/bin/env python3
"""Parse cilium-bugtool zsh completion output."""
import json, subprocess

def complete(*args):
    output = subprocess.check_output(
        ['cilium-bugtool', '__complete', *args],
        stderr=subprocess.DEVNULL,
        text=True,
    )
    rows = []
    for line in output.splitlines():
        if not line or line.startswith(':'):
            continue
        value, _, description = line.partition('\t')
        rows.append((value, description))
    return rows

def parse_zsh_completion():
    root = complete('')
    flag_rows = complete('--')
    commands = [{'name': value, 'description': description}
        for value, description in root if not value.startswith('--')]
    flags = [{'flag': value, 'description': description}
        for value, description in flag_rows if value.startswith('--')]
    return {'commands': commands, 'flags': flags}

if __name__ == '__main__':
    print(json.dumps(parse_zsh_completion(), indent=2))
```

## Verification

```bash
# Verify parsing

python3 parse_zsh_completion.py | jq '.commands | length'
python3 parse_zsh_completion.py | jq '.flags | length'
```

## Troubleshooting

- **"_cilium-bugtool: function definition file not found"**: File must be named `_cilium-bugtool` with underscore prefix and be in fpath.
- **Stale completions after upgrade**: Run `rm -f ~/.zcompdump*` and restart zsh.
- **Slow shell startup**: Use `compinit -C` to skip security checks on the dump file.
- **Oh My Zsh interference**: Place completions in `$ZSH_CUSTOM/plugins/` or ensure fpath is set before Oh My Zsh loads.

## Conclusion




Querying zsh completion data provides machine-readable access to the cilium-bugtool command structure, enabling automated documentation and CLI coverage testing.

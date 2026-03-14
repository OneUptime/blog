# Parsing Cilium Bugtool PowerShell Completion Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, PowerShell, Parsing, Scripting

Description: Extract command and parameter definitions from cilium-bugtool PowerShell completion scripts for documentation and tooling.

---

## Introduction

PowerShell provides a sophisticated tab-completion system through Register-ArgumentCompleter that works on Windows, macOS, and Linux. The `cilium-bugtool completion powershell` command generates a PowerShell script that registers argument completers for all cilium-bugtool commands and parameters.




PowerShell completion scripts use Register-ArgumentCompleter with scriptblock-based completers. Parsing these scripts reveals the full command tree and parameter definitions in a format suitable for documentation generation.

This guide covers parsing techniques for cilium-bugtool PowerShell completion output.

## Prerequisites

- PowerShell 5.1+ (Windows) or PowerShell 7+ (cross-platform)
- `cilium-bugtool` binary available
- `kubectl` access to a Cilium cluster

## Capturing Completion Output




\`\`\`powershell
# Generate and save the completion script
cilium-bugtool completion powershell > C:\temp\bugtool-completion.ps1
\`\`\`

### Extracting Commands with PowerShell

\`\`\`powershell
\$content = Get-Content C:\temp\bugtool-completion.ps1 -Raw

# Extract Register-ArgumentCompleter blocks
\$pattern = "Register-ArgumentCompleter.*?-CommandName\s+'([^']+)'"
[regex]::Matches(\$content, \$pattern) | ForEach-Object {
    \$_.Groups[1].Value
} | Sort-Object -Unique
\`\`\`

### Python-Based Parser

\`\`\`python
#!/usr/bin/env python3
"""Parse cilium-bugtool PowerShell completion output."""

import re
import json
import sys

def parse_powershell_completion(filepath):
    with open(filepath) as f:
        content = f.read()

    # Extract command names
    commands = list(set(re.findall(
        r"'([a-z][-a-z]*)'.*CompletionText", content)))

    # Extract parameter names
    params = list(set(re.findall(r"'(--[a-z][-a-z0-9]*)'", content)))

    # Extract descriptions
    descriptions = re.findall(
        r"'([^']+)'.*'([^']+)'.*CompletionText", content)

    return {
        'commands': sorted(commands),
        'parameters': sorted(params),
        'completions_with_descriptions': [
            {'text': d[0], 'description': d[1]}
            for d in descriptions[:20]
        ]
    }

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'bugtool-completion.ps1'
    result = parse_powershell_completion(path)
    print(json.dumps(result, indent=2))
\`\`\`

## Verification

```powershell
# Verify parsing
python3 parse_ps_completion.py bugtool-completion.ps1 | python3 -m json.tool | head -20
```

## Troubleshooting

- **Execution policy blocks script**: Use `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- **Profile does not load**: Check `$PROFILE` path exists and is not blocked by antivirus.
- **Completions do not appear after Tab**: Ensure the binary is in PATH and Register-ArgumentCompleter ran without errors.
- **Cross-platform issues**: PowerShell 7 works on Linux/macOS but paths differ. Use `$HOME` instead of Windows-specific paths.

## Conclusion




Parsing PowerShell completion output extracts the CLI structure in a format useful for documentation and tooling. The Register-ArgumentCompleter pattern provides clear mappings between commands, parameters, and descriptions.

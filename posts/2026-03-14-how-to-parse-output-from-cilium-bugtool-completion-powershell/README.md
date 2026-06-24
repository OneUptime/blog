# Parsing Cilium Bugtool PowerShell Completion Output

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, PowerShell, Parsing, Scripting

Description: Extract command and parameter definitions from cilium-bugtool PowerShell completion scripts for documentation and tooling.

---

## Introduction

PowerShell provides a sophisticated tab-completion system through Register-ArgumentCompleter that works on Windows, macOS, and Linux. The `cilium-bugtool completion powershell` command generates a PowerShell script that registers an argument completer for cilium-bugtool.




PowerShell completion scripts use Register-ArgumentCompleter with scriptblock-based completers. The generated Cobra completion script registers a native completer and calls `cilium-bugtool __complete` or `cilium-bugtool __completeNoDesc` at completion time, so parsing the saved script reveals the completer registration and runtime completion command rather than the full command tree.

This guide covers parsing techniques for cilium-bugtool PowerShell completion output.

## Prerequisites

- PowerShell 5.1+ (Windows) or PowerShell 7+ (cross-platform)
- `cilium-bugtool` binary available
- `kubectl` access to a Cilium cluster if you need to run cilium-bugtool from a Cilium pod

## Capturing Completion Output




```powershell
## Generate and save the completion script
cilium-bugtool completion powershell > C:\temp\bugtool-completion.ps1
```

### Extracting Commands with PowerShell

```powershell
$content = Get-Content C:\temp\bugtool-completion.ps1 -Raw

## Extract Register-ArgumentCompleter blocks
$pattern = "(?s)Register-ArgumentCompleter.*?-CommandName\s+'([^']+)'"
[regex]::Matches($content, $pattern) | ForEach-Object {
    $_.Groups[1].Value
} | Sort-Object -Unique
```

### Python-Based Parser

```python
#!/usr/bin/env python3
"""Parse cilium-bugtool PowerShell completion output."""

import re
import json
import sys

def parse_powershell_completion(filepath):
    with open(filepath) as f:
        content = f.read()

    # Extract registered native command names
    commands = list(set(re.findall(
        r"Register-ArgumentCompleter\s+-CommandName\s+'([^']+)'",
        content,
        re.DOTALL,
    )))

    # Extract the hidden Cobra completion request command used at runtime
    completion_requests = list(set(re.findall(
        r'\$RequestComp="\$Program\s+(__complete(?:NoDesc)?)\s+\$Arguments"',
        content,
    )))

    return {
        'commands': sorted(commands),
        'completion_request_commands': sorted(completion_requests),
    }

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'bugtool-completion.ps1'
    result = parse_powershell_completion(path)
    print(json.dumps(result, indent=2))
```

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




Parsing PowerShell completion output extracts the completer registration in a format useful for documentation and tooling. The Register-ArgumentCompleter pattern identifies the native command and the scriptblock that requests command and parameter completions dynamically.

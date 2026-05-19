# Validation Summary: How to Customize Your Bash Prompt (PS1) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bash
- Ubuntu shell configuration
- ANSI terminal escape sequences
- Git prompt integration
- Git branch/status commands

## Sources Consulted
- GNU Bash Reference Manual, Controlling the Prompt: https://www.gnu.org/software/bash/manual/bash.html#Controlling-the-Prompt
- GNU Bash Reference Manual, Bash Variables: https://www.gnu.org/software/bash/manual/bash.html#Bash-Variables
- bash(1) manual page: https://man7.org/linux/man-pages/man1/bash.1.html
- Git git-prompt.sh source: https://raw.githubusercontent.com/git/git/master/contrib/completion/git-prompt.sh
- Local Bash manual and installed versions: GNU Bash 5.2.21, Git 2.43.0
- Local Ubuntu/Debian Git package paths: /usr/lib/git-core/git-sh-prompt and /etc/bash_completion.d/git-prompt

## Issues Found
- The first exit-code prompt example used command substitution to echo prompt non-printing markers such as `\[` and `\]`. Bash decodes prompt backslash escapes before command substitution, and the Bash manual warns that escaped prompt portions inside command substitution can have unwanted side effects. Changed the example so `PROMPT_COMMAND` captures `$?` and assigns a complete `PS1` containing the color markers directly.
- The post pointed readers to `/usr/share/git-core/contrib/completion/git-prompt.sh` as the Git prompt script path. Current Ubuntu/Debian Git packaging commonly provides the prompt helper as `/usr/lib/git-core/git-sh-prompt`, with `/etc/bash_completion.d/git-prompt` sourcing it. Updated the main Git prompt example to use `/usr/lib/git-core/git-sh-prompt` and kept the older `/usr/share/git-core/contrib/completion/git-prompt.sh` path as a fallback in the complete configuration.

## Review Notes
The remaining Bash prompt escape sequences, `PROMPT_COMMAND` usage, PS2/PS3/PS4 explanations, Git branch commands, and `__git_ps1` status indicator variables are consistent with the Bash manual and Git prompt helper documentation. The post does not pin an Ubuntu release, so the Git prompt path should be treated as package-layout dependent.

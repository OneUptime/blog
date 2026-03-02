# How to Customize Your Bash Prompt (PS1) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Shell, Linux, Productivity

Description: Learn how to customize your Bash PS1 prompt on Ubuntu with colors, dynamic information like Git branch and exit codes, and practical configuration examples.

---

The Bash prompt is something you look at hundreds of times a day. Customizing it to show exactly what you need - and nothing you do not - makes a genuine difference in day-to-day efficiency. The `PS1` variable controls what your prompt looks like.

## Understanding PS1

`PS1` (Prompt String 1) is the variable Bash evaluates to draw the prompt before each command. Check what yours is currently set to:

```bash
echo $PS1
```

A typical default on Ubuntu looks something like:

```bash
\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$
```

That outputs something like: `user@hostname:~/Projects$`

## Escape Sequences for Prompt Elements

Bash recognizes these backslash-escaped sequences inside PS1:

```
\u    - current username
\h    - hostname (short, up to first dot)
\H    - full hostname
\w    - current working directory (~ for home)
\W    - basename of current directory only
\$    - $ for normal users, # for root
\d    - date (e.g., Mon Mar 01)
\t    - current time (24-hour, HH:MM:SS)
\T    - current time (12-hour, HH:MM:SS)
\@    - current time (12-hour, am/pm)
\n    - newline
\!    - history number of this command
\#    - command number of this command
```

## Adding Colors

Colors use ANSI escape codes. The format is:

```bash
\[\033[CODEm\]   # start color
\[\033[00m\]     # reset to default
```

Common color codes:

```
30 - Black       90 - Bright Black (dark gray)
31 - Red         91 - Bright Red
32 - Green       92 - Bright Green
33 - Yellow      93 - Bright Yellow
34 - Blue        94 - Bright Blue
35 - Magenta     95 - Bright Magenta
36 - Cyan        96 - Bright Cyan
37 - White       97 - Bright White

1  - Bold
0  - Reset
```

The `\[` and `\]` around escape codes are critical - they tell Bash the enclosed characters are non-printing (zero width), which prevents line wrapping and cursor positioning bugs.

## Basic Color Prompt Example

```bash
# Set in terminal to test (temporary)
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Breakdown:
# \[\033[01;32m\]  - bold green color on
# \u@\h            - user@hostname
# \[\033[00m\]     - color reset
# :                - literal colon
# \[\033[01;34m\]  - bold blue color on
# \w               - current directory
# \[\033[00m\]     - color reset
# \$               - $ or #
# (space)          - space after prompt
```

## Making Changes Permanent

Add the PS1 assignment to `~/.bashrc`:

```bash
# Open .bashrc
nano ~/.bashrc

# Find the existing PS1 line and replace it, or add at end
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Reload
source ~/.bashrc
```

## Showing the Exit Code of the Last Command

Knowing whether the last command succeeded is valuable. Display the exit status using `$?`:

```bash
# Show exit code in prompt - must capture $? before PS1 expansion happens
# Use PROMPT_COMMAND for this approach
PROMPT_COMMAND='EXIT=$?; echo -n ""'
PS1='$(if [ $EXIT -eq 0 ]; then echo "\[\033[32m\]✓"; else echo "\[\033[31m\]✗ $EXIT"; fi)\[\033[00m\] \[\033[01;34m\]\w\[\033[00m\]\$ '
```

Or using a function approach which is cleaner:

```bash
# Add to ~/.bashrc

# Function to generate the prompt
__build_ps1() {
    local exit_code=$?
    local reset='\[\033[00m\]'
    local green='\[\033[01;32m\]'
    local red='\[\033[01;31m\]'
    local blue='\[\033[01;34m\]'
    local yellow='\[\033[01;33m\]'

    # Exit code indicator
    local status_part
    if [ $exit_code -eq 0 ]; then
        status_part="${green}[OK]${reset}"
    else
        status_part="${red}[${exit_code}]${reset}"
    fi

    PS1="${status_part} ${blue}\w${reset}\$ "
}

PROMPT_COMMAND=__build_ps1
```

## Showing the Git Branch

Displaying the current Git branch in the prompt is one of the most requested customizations:

```bash
# Add this function to ~/.bashrc
__git_branch() {
    local branch
    branch=$(git symbolic-ref --short HEAD 2>/dev/null) || \
    branch=$(git rev-parse --short HEAD 2>/dev/null) || \
    return
    echo " (${branch})"
}

# Use it in PS1
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[01;33m\]$(__git_branch)\[\033[00m\]\$ '
```

Many Ubuntu systems have `__git_ps1` available if you source the git completions:

```bash
# Check if git-prompt.sh is available
ls /usr/share/git-core/contrib/completion/git-prompt.sh

# Source it in ~/.bashrc
source /usr/share/git-core/contrib/completion/git-prompt.sh

# Configure git status indicators in prompt
GIT_PS1_SHOWDIRTYSTATE=1      # * for unstaged, + for staged changes
GIT_PS1_SHOWUNTRACKEDFILES=1  # % for untracked files
GIT_PS1_SHOWUPSTREAM="auto"   # < behind, > ahead, <> diverged

# Use __git_ps1 in your PS1
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[01;33m\]$(__git_ps1 " (%s)")\[\033[00m\]\$ '
```

## Multi-Line Prompts

When you work in deep directories, a single-line prompt can use most of your screen width. A two-line prompt solves this:

```bash
# Two-line prompt: info on first line, $ on second
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\n\$ '
```

## Showing Time in the Prompt

```bash
# Add 24-hour time before the directory
PS1='\[\033[01;33m\][\t]\[\033[00m\] \[\033[01;34m\]\w\[\033[00m\]\$ '
# Output: [14:23:05] ~/Projects$
```

## A Complete, Practical PS1 Configuration

Here is a full configuration that shows username, host, directory, git branch, and exit code:

```bash
# Add to ~/.bashrc

# Source git prompt if available
if [ -f /usr/share/git-core/contrib/completion/git-prompt.sh ]; then
    source /usr/share/git-core/contrib/completion/git-prompt.sh
    GIT_PS1_SHOWDIRTYSTATE=1
    GIT_PS1_SHOWUNTRACKEDFILES=1
fi

__prompt_command() {
    local exit=$?

    # Colors
    local reset='\[\033[00m\]'
    local bold_green='\[\033[01;32m\]'
    local bold_blue='\[\033[01;34m\]'
    local bold_yellow='\[\033[01;33m\]'
    local bold_red='\[\033[01;31m\]'

    # Exit status indicator
    local status_color
    if [ $exit -eq 0 ]; then
        status_color="$bold_green"
    else
        status_color="$bold_red"
    fi

    # Git branch
    local git_part=""
    if command -v __git_ps1 &>/dev/null; then
        git_part="${bold_yellow}$(__git_ps1 " (%s)")${reset}"
    fi

    PS1="${bold_green}\u@\h${reset}:${bold_blue}\w${reset}${git_part} ${status_color}\$${reset} "
}

PROMPT_COMMAND=__prompt_command
```

## PS2, PS3, PS4

The other prompt variables:

```bash
# PS2: continuation prompt (when a command spans multiple lines)
PS2='> '

# PS3: prompt used by 'select' loops in scripts
PS3='Choose: '

# PS4: shown when using 'set -x' for debugging
PS4='+ '
```

## Tips

- Always wrap color codes in `\[` and `\]` to avoid cursor positioning issues
- Test changes in the current session before writing to `~/.bashrc`
- Keep prompts readable - too much information becomes noise
- Use `PROMPT_COMMAND` for anything that needs to run code (like capturing exit codes)
- Heavy prompt functions (like complex git operations) can slow down fast typists on large repos - keep them lightweight

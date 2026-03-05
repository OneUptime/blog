# How to Configure Flux CD Shell Autocompletion for Zsh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Zsh, Shell, Autocompletion, Productivity

Description: Set up Flux CD CLI autocompletion in Zsh for faster command entry and an improved terminal workflow.

---

Zsh is the default shell on macOS since Catalina and is widely used on Linux systems. Its powerful completion system goes beyond basic Tab completion, offering descriptions, grouping, and menu-style selection. Configuring Flux CD autocompletion for Zsh gives you instant access to every Flux subcommand, flag, and option right from your terminal. This guide covers the full setup process.

## Prerequisites

Before configuring autocompletion, make sure you have:

- The Flux CLI installed (verify with `flux --version`)
- Zsh as your active shell (verify with `echo $SHELL`)
- A `.zshrc` file in your home directory

Check your Zsh version.

```bash
# Verify Zsh version
zsh --version
```

Zsh 5.0 or later is required for reliable completion support.

## Step 1: Ensure the Zsh Completion System Is Initialized

Zsh has a built-in completion system that must be initialized with `compinit`. Most Zsh configurations already include this, but verify it is present in your `.zshrc`.

```bash
# Check if compinit is called in your .zshrc
grep -c 'compinit' ~/.zshrc
```

If the result is `0`, add the initialization to your `.zshrc`.

```bash
# Add Zsh completion system initialization
cat >> ~/.zshrc << 'EOF'
autoload -Uz compinit
compinit
EOF
```

If you use a framework like Oh My Zsh, Prezto, or Zinit, `compinit` is typically handled for you automatically.

## Step 2: Add the Flux Completion Script

The Flux CLI can generate a Zsh-specific completion script. There are several ways to install it.

### Option A: Source in .zshrc (Simplest)

The quickest approach is to source the completion output directly in your `.zshrc`.

```bash
# Add Flux autocompletion to .zshrc
echo 'command -v flux >/dev/null && . <(flux completion zsh)' >> ~/.zshrc
```

This generates the completion script each time a new shell starts and sources it immediately. The `command -v flux` guard ensures no errors if the Flux CLI is not installed.

### Option B: Write to fpath Directory (Recommended for Performance)

For faster shell startup, generate the completion script once and place it in a directory that Zsh scans for completion functions.

```bash
# Create a directory for custom completions if it does not exist
mkdir -p ~/.zsh/completions

# Generate the Flux completion script
flux completion zsh > ~/.zsh/completions/_flux
```

Then add the directory to your `fpath` in `.zshrc`. This must come before `compinit`.

```bash
# Add custom completions directory to fpath (add to .zshrc BEFORE compinit)
cat >> ~/.zshrc << 'EOF'
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit
compinit
EOF
```

If you already have `compinit` in your `.zshrc`, just add the `fpath` line before it rather than duplicating the initialization.

### Option C: Oh My Zsh Users

If you use Oh My Zsh, place the completion file in the custom completions directory.

```bash
# Generate completion for Oh My Zsh
flux completion zsh > "${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/flux/_flux"
```

You may need to create the `flux` plugin directory first.

```bash
# Create the flux plugin directory for Oh My Zsh
mkdir -p "${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/flux"

# Generate the completion script
flux completion zsh > "${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/flux/_flux"
```

Then add `flux` to your plugins list in `.zshrc`.

```bash
# In .zshrc, add flux to the plugins array
plugins=(git flux)
```

## Step 3: Reload Your Shell

Apply the changes by reloading your Zsh configuration.

```bash
# Reload .zshrc
source ~/.zshrc
```

If you placed the completion in an `fpath` directory, you may need to rebuild the completion cache.

```bash
# Remove the completion cache and reload
rm -f ~/.zcompdump*
source ~/.zshrc
```

## Step 4: Test the Autocompletion

Verify that autocompletion is working correctly.

```bash
# Type flux and press Tab to see all available subcommands
flux <Tab>
```

You should see a categorized list of commands. Zsh completions often include descriptions alongside each option.

Test deeper completion levels.

```bash
# Complete subcommands
flux create <Tab>
# Shows: source  kustomization  helmrelease  alert  receiver  etc.

# Complete source types
flux create source <Tab>
# Shows: git  helm  bucket  oci

# Complete flags
flux bootstrap github --<Tab>
# Shows: --owner  --repository  --branch  --path  --personal  etc.
```

## Zsh Completion Features

Zsh offers several advanced completion features that work with the Flux completion script.

### Menu-Style Completion

Enable menu-style completion to cycle through options with Tab.

```bash
# Add to .zshrc for menu-style completion
zstyle ':completion:*' menu select
```

This turns the completion list into an interactive menu where you can use arrow keys to select an option.

### Case-Insensitive Completion

Allow case-insensitive matching for commands and flags.

```bash
# Add to .zshrc for case-insensitive completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'
```

### Colored Completion Output

Add colors to completion output for better readability.

```bash
# Add to .zshrc for colored completions
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
```

## Setting Up an Alias with Completion

If you use an alias for the `flux` command, Zsh needs to be told to use the same completion.

```bash
# Add to .zshrc: alias with completion
alias f='flux'
compdef f=flux
```

This registers the `flux` completion function for the alias `f`, so `f <Tab>` works identically to `flux <Tab>`.

## Complete .zshrc Example

Here is a complete snippet you can add to your `.zshrc` for Flux CLI autocompletion with useful Zsh settings.

```bash
# Flux CD CLI autocompletion setup
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit
compinit

# Menu-style completion with highlighting
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'

# Flux alias with completion
alias f='flux'
compdef f=flux
```

## Troubleshooting

**Completion shows no results:** Verify the completion script exists and is valid. Run `flux completion zsh` manually to check for errors. If using `fpath`, ensure the file is named `_flux` (with the underscore prefix).

**"command not found: compdef" error:** The `compinit` function has not been called. Add `autoload -Uz compinit && compinit` to your `.zshrc` before any `compdef` calls.

**Stale completions after upgrading Flux:** If you generated the completion script to a file, regenerate it after updating the Flux CLI.

```bash
# Regenerate the completion script after a Flux update
flux completion zsh > ~/.zsh/completions/_flux
rm -f ~/.zcompdump*
source ~/.zshrc
```

**Slow shell startup:** Sourcing completions via process substitution (`. <(flux completion zsh)`) runs the `flux` binary on every shell start. Use the `fpath` method instead for faster startup.

**Oh My Zsh conflicts:** If Oh My Zsh loads its own completion system, ensure your custom completion file is in the correct plugin directory and that the plugin is enabled in the `plugins` array.

## Conclusion

You now have Flux CD autocompletion fully configured for Zsh. The completion system provides instant access to all Flux subcommands, flags, and resource types, significantly reducing the time you spend typing and looking up command syntax. Combined with Zsh features like menu selection and case-insensitive matching, your Flux CLI workflow becomes considerably more efficient.

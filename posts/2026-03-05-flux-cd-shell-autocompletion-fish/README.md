# How to Configure Flux CD Shell Autocompletion for Fish

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Fish, Shell, Autocompletion, Productivity

Description: Configure Flux CD CLI autocompletion in the Fish shell for an enhanced command-line experience with contextual suggestions.

---

Fish (Friendly Interactive Shell) is known for its excellent out-of-the-box experience, including syntax highlighting, inline suggestions, and powerful tab completion. Adding Flux CD autocompletion to Fish integrates the Flux CLI seamlessly into this environment, providing context-aware suggestions for commands, subcommands, and flags. This guide covers the complete setup process.

## Prerequisites

Before you begin, ensure you have:

- Fish shell installed (verify with `fish --version`)
- The Flux CLI installed (verify with `flux --version`)
- Fish 3.0 or later

If you do not have Fish installed, you can install it on most systems.

```bash
# Install Fish on Ubuntu/Debian
sudo apt-get install -y fish

# Install Fish on Fedora
sudo dnf install -y fish

# Install Fish on macOS via Homebrew
brew install fish
```

## Understanding Fish Completions

Fish handles completions differently from Bash and Zsh. Instead of a centralized framework, Fish uses individual completion files placed in specific directories. Each file defines completions for a single command. The Flux CLI generates a Fish-specific completion script that follows these conventions.

Fish looks for completion files in the following directories:

- `~/.config/fish/completions/` for user-level completions
- `/usr/share/fish/vendor_completions.d/` for system-wide completions
- The directories listed in `$fish_complete_path`

## Step 1: Generate the Flux Completion Script

The Flux CLI has a built-in command to generate Fish-compatible completions.

```bash
# Preview the Fish completion script
flux completion fish
```

This outputs the completion definitions to stdout. You need to save this output to the appropriate directory.

## Step 2: Install the Completion Script

### Option A: User-Level Installation (Recommended)

Save the completion script to your personal Fish completions directory.

```bash
# Create the completions directory if it does not exist
mkdir -p ~/.config/fish/completions

# Generate and save the Flux completion script
flux completion fish > ~/.config/fish/completions/flux.fish
```

Fish automatically loads completion files from this directory. No additional configuration is needed.

### Option B: System-Wide Installation

For all users on the system, save the script to the system completions directory.

```bash
# Install Flux completions system-wide (requires sudo)
sudo flux completion fish > /usr/share/fish/vendor_completions.d/flux.fish
```

### Option C: Source in config.fish

Alternatively, you can source the completions directly in your Fish configuration file.

```bash
# Add to ~/.config/fish/config.fish
echo 'flux completion fish | source' >> ~/.config/fish/config.fish
```

This runs the `flux completion fish` command each time Fish starts, which adds a small delay but ensures the completions are always up to date.

## Step 3: Verify the Autocompletion

Fish loads completion files automatically, so no shell reload is needed if you used Option A or B. For Option C, start a new Fish session.

Test the completion by typing `flux` and pressing Tab.

```bash
# Type flux and press Tab to see available commands
flux <Tab>
```

You should see a list of Flux subcommands with descriptions, such as:

```text
bootstrap   Install or upgrade Flux on a cluster
check       Check the cluster and Flux prerequisites
create      Create or update Flux resources
delete      Delete Flux resources
export      Export Flux resources in YAML format
get         Display Flux resources
logs        Display controller logs
reconcile   Reconcile Flux resources
resume      Resume Flux resources
suspend     Suspend Flux resources
uninstall   Remove Flux components
```

Test subcommand completion.

```bash
# Complete create subcommands
flux create <Tab>
# Shows: source  kustomization  helmrelease  alert  receiver  etc.

# Complete source types
flux create source <Tab>
# Shows: git  helm  bucket  oci

# Complete flags for a specific command
flux bootstrap github --<Tab>
# Shows all available flags with descriptions
```

## Fish-Specific Completion Features

Fish provides several completion features that enhance the Flux CLI experience.

### Inline Autosuggestions

Fish shows inline suggestions in gray text as you type, based on your command history. If you have previously run a Flux command, Fish will suggest it.

```bash
# As you type, Fish shows suggestions from history
flux reconcile kustomization flux-system --with-source
#                                        ^^^^^^^^^^^^^^
#                   This part appears as a gray suggestion based on history
```

Press the right arrow key to accept the suggestion.

### Completion Descriptions

Fish displays descriptions alongside each completion option. The Flux completion script includes descriptions for all commands and flags, making it easy to find the right option without consulting documentation.

### Fuzzy Matching

Fish supports substring matching in completions. If you type part of a command name, Fish will match it even if it is not a prefix.

```bash
# Typing "rec" and pressing Tab will match "reconcile"
flux rec<Tab>
# Completes to: flux reconcile
```

## Setting Up an Abbreviation

Fish supports abbreviations, which are similar to aliases but expand inline as you type. Set up a short abbreviation for the flux command.

```bash
# Create an abbreviation for flux
abbr --add f flux
```

When you type `f` and press Space, Fish automatically expands it to `flux`. Completions work with the expanded command.

To make the abbreviation persistent, it is saved automatically by Fish. You can also add it to your `config.fish`.

```bash
# Add abbreviation to config.fish
echo 'abbr --add f flux' >> ~/.config/fish/config.fish
```

## Updating Completions After a Flux Upgrade

When you update the Flux CLI, regenerate the completion script to include any new commands or flags.

```bash
# Regenerate completions after upgrading Flux
flux completion fish > ~/.config/fish/completions/flux.fish
```

Fish picks up the updated file immediately without requiring a restart.

## Example Workflow with Autocompletion

Here is how autocompletion improves a typical Flux workflow.

```bash
# Step 1: Check cluster prerequisites
flux ch<Tab>        # Completes to: flux check
flux check --p<Tab> # Completes to: flux check --pre

# Step 2: Bootstrap Flux
flux bo<Tab>           # Completes to: flux bootstrap
flux bootstrap gi<Tab> # Completes to: flux bootstrap github
flux bootstrap github --ow<Tab> # Completes to: --owner

# Step 3: Check status
flux g<Tab>            # Completes to: flux get
flux get a<Tab>        # Completes to: flux get all

# Step 4: Reconcile
flux re<Tab>           # Shows: reconcile  resume
flux reconcile k<Tab>  # Completes to: flux reconcile kustomization
```

## Troubleshooting

**Completions do not appear:** Verify the completion file exists in the correct location.

```bash
# Check for the completion file
ls ~/.config/fish/completions/flux.fish
```

If the file does not exist, regenerate it with `flux completion fish > ~/.config/fish/completions/flux.fish`.

**Old completions showing:** Fish caches completions. Clear the cache by removing and regenerating the file.

```bash
# Remove and regenerate completions
rm ~/.config/fish/completions/flux.fish
flux completion fish > ~/.config/fish/completions/flux.fish
```

**Flux command not found in Fish:** If you installed Flux while using a different shell, the binary path may not be in Fish's PATH. Add it to your `config.fish`.

```bash
# Add /usr/local/bin to Fish PATH if needed
fish_add_path /usr/local/bin
```

**Slow completion generation:** If using the `source` method in `config.fish`, the shell startup is slightly slower because it runs `flux completion fish` each time. Switch to the file-based method (Option A) for faster startup.

## Removing Completions

To remove Flux completions from Fish, delete the completion file.

```bash
# Remove user-level completions
rm ~/.config/fish/completions/flux.fish

# Remove system-wide completions if applicable
sudo rm /usr/share/fish/vendor_completions.d/flux.fish
```

## Conclusion

You now have Flux CD autocompletion configured for the Fish shell. Fish's native features like inline suggestions, descriptions, and fuzzy matching combine with the Flux completion script to create a highly productive CLI experience. Every Flux command, subcommand, and flag is accessible with a Tab press, and the descriptive output helps you navigate the CLI without switching to documentation. Remember to regenerate the completion file whenever you upgrade the Flux CLI.

# How to Set Up Terraform Shell Autocomplete in Bash and Zsh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Shell, Autocomplete, Bash, Zsh, Productivity, DevOps

Description: Enable Terraform tab completion in Bash and Zsh shells to speed up your workflow with automatic command and subcommand suggestions.

---

Tab completion is one of those small things that saves you a surprising amount of time over the course of a day. Instead of typing out `terraform plan` or `terraform workspace select`, you just type `terraform pl<TAB>` and the shell fills in the rest. Terraform has built-in support for generating autocomplete scripts for both Bash and Zsh, and setting it up takes about thirty seconds.

## The Quick Way

Terraform includes a built-in command that installs autocomplete for you:

```bash
# Install Terraform autocomplete (works for both Bash and Zsh)
terraform -install-autocomplete
```

This command detects your shell and appends the necessary configuration to your profile file (`~/.bashrc` for Bash or `~/.zshrc` for Zsh). After running it, reload your shell:

```bash
# Reload Bash
source ~/.bashrc

# Or reload Zsh
source ~/.zshrc
```

That is it. Try typing `terraform ` and pressing Tab to see the available commands.

If the automatic install does not work for your setup, or if you want to understand what is happening under the hood, keep reading for the manual approach.

## Setting Up Autocomplete in Bash

### Step 1 - Check bash-completion Is Installed

Terraform's autocomplete relies on the `bash-completion` package. Check if it is installed:

```bash
# Check if bash-completion is available
type _init_completion 2>/dev/null && echo "bash-completion is installed" || echo "bash-completion is NOT installed"
```

If it is not installed:

```bash
# On Ubuntu/Debian
sudo apt-get install -y bash-completion

# On CentOS/RHEL
sudo dnf install -y bash-completion

# On macOS with Homebrew
brew install bash-completion@2
```

For macOS, you also need to source bash-completion in your profile. Add this to `~/.bash_profile`:

```bash
# Enable bash-completion on macOS
[[ -r "/opt/homebrew/etc/profile.d/bash_completion.sh" ]] && . "/opt/homebrew/etc/profile.d/bash_completion.sh"
```

### Step 2 - Add the Terraform Completion Script

Add the following to your `~/.bashrc`:

```bash
# Enable Terraform autocomplete
complete -C /usr/local/bin/terraform terraform
```

If your Terraform binary is in a different location (check with `which terraform`), adjust the path accordingly:

```bash
# For Homebrew on Apple Silicon
complete -C /opt/homebrew/bin/terraform terraform

# For tfenv
complete -C ~/.tfenv/versions/1.7.5/terraform terraform
```

### Step 3 - Reload and Test

```bash
# Reload the shell configuration
source ~/.bashrc

# Test autocomplete - type "terraform " and press Tab
terraform <TAB>
```

You should see a list of available commands like `apply`, `destroy`, `fmt`, `init`, `plan`, and so on.

## Setting Up Autocomplete in Zsh

Zsh is the default shell on macOS and is popular on Linux too. The setup is similar but with a few Zsh-specific details.

### Step 1 - Ensure compinit Is Loaded

Most Zsh configurations already load `compinit`, but verify by checking your `~/.zshrc`:

```bash
# Check if compinit is loaded
grep compinit ~/.zshrc
```

If it is not there, add it:

```bash
# Add to ~/.zshrc
autoload -Uz compinit && compinit
```

### Step 2 - Add the Terraform Completion

Add this to your `~/.zshrc`:

```bash
# Enable Terraform autocomplete in Zsh
autoload -U +X bashcompinit && bashcompinit
complete -C /usr/local/bin/terraform terraform
```

The `bashcompinit` function enables Bash-style completion in Zsh, which is what Terraform's completion system uses.

Again, adjust the path if your binary is elsewhere:

```bash
# For Homebrew on Apple Silicon
autoload -U +X bashcompinit && bashcompinit
complete -C /opt/homebrew/bin/terraform terraform
```

### Step 3 - Reload and Test

```bash
# Reload Zsh configuration
source ~/.zshrc

# Test - type "terraform " and press Tab
terraform <TAB>
```

## What Terraform Autocomplete Gives You

Once set up, pressing Tab after `terraform` will complete:

### Top-Level Commands

```
terraform <TAB>
# Shows: apply, console, destroy, fmt, get, graph, import, init,
#        login, logout, output, plan, providers, refresh, show,
#        state, taint, test, untaint, validate, version, workspace
```

### Subcommands

```
terraform state <TAB>
# Shows: list, mv, pull, push, replace-provider, rm, show

terraform workspace <TAB>
# Shows: delete, list, new, select, show
```

### Flags

```
terraform plan -<TAB>
# Shows: -compact-warnings, -destroy, -detailed-exitcode,
#        -input, -json, -lock, -lock-timeout, -no-color,
#        -out, -parallelism, -refresh-only, -replace, -target, -var, -var-file
```

This is incredibly handy for flags you do not use often. Instead of checking the documentation every time, just press Tab.

## Troubleshooting

### Autocomplete Does Not Work After Setup

First, make sure you reloaded your shell:

```bash
# Start a fresh shell session instead of sourcing
exec $SHELL
```

Sometimes `source ~/.bashrc` does not fully reinitialize the completion system. Starting a fresh shell session with `exec $SHELL` is more reliable.

### "complete: command not found" in Zsh

This means `bashcompinit` is not loaded. Make sure you have both lines in your `.zshrc`:

```bash
autoload -U +X bashcompinit && bashcompinit
complete -C /usr/local/bin/terraform terraform
```

The order matters. `bashcompinit` must be loaded before the `complete` command.

### Wrong Binary Path

If autocomplete is not working, double-check the path to your Terraform binary:

```bash
# Find the actual path to terraform
which terraform

# Make sure the path in your completion line matches
grep "complete.*terraform" ~/.bashrc ~/.zshrc
```

### Autocomplete Works for Commands but Not Flags

This is usually a Terraform version issue. Older Terraform versions had less comprehensive autocomplete support. Make sure you are running a recent version:

```bash
terraform -version
```

### Multiple Terraform Binaries

If you use tfenv or another version manager, the binary path might change when you switch versions. A more robust approach is to use `$(which terraform)`:

```bash
# Dynamic path resolution (add to ~/.bashrc or ~/.zshrc)
complete -C "$(which terraform)" terraform
```

Note: This resolves the path once when the shell starts. If you switch Terraform versions mid-session, you may need to reload your shell.

## Oh My Zsh Users

If you use Oh My Zsh, there is a Terraform plugin that adds autocomplete plus some useful aliases:

```bash
# Add terraform to your Oh My Zsh plugins list in ~/.zshrc
plugins=(... terraform)
```

This plugin provides:

- Autocomplete for Terraform commands
- `tf` alias for `terraform`
- `tfa` alias for `terraform apply`
- `tfd` alias for `terraform destroy`
- `tff` alias for `terraform fmt`
- `tfi` alias for `terraform init`
- `tfp` alias for `terraform plan`
- `tfv` alias for `terraform validate`

If you are using Oh My Zsh, this is the easiest approach.

## Fish Shell Users

While this post focuses on Bash and Zsh, I will briefly mention Fish shell. Terraform does not natively support Fish completions, but the community has created completion scripts. You can find them on GitHub:

```fish
# Fish users can create a completion file at
# ~/.config/fish/completions/terraform.fish
```

The Fish community maintains Terraform completions that you can install from the Fish plugin ecosystem.

## Adding Custom Aliases with Completion

You can extend autocomplete to your Terraform aliases:

```bash
# Define aliases (add to ~/.bashrc or ~/.zshrc)
alias tf='terraform'
alias tfi='terraform init'
alias tfp='terraform plan'
alias tfa='terraform apply'

# Make autocomplete work with the 'tf' alias too
complete -C /usr/local/bin/terraform tf
```

Now `tf <TAB>` works just like `terraform <TAB>`.

## Conclusion

Setting up Terraform autocomplete takes minimal effort but pays off every day. Whether you use the built-in `terraform -install-autocomplete` command or configure it manually, the result is the same: faster command entry, fewer typos, and easy discovery of flags you might not have known existed. If you work with Terraform regularly, this is one of the first things to set up on any new machine.

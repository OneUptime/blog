# How to Install Anaconda/Miniconda on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, Data Science, Package Management

Description: A complete guide to installing Anaconda or Miniconda on Ubuntu, managing conda environments, and setting up Python for data science workflows.

---

Conda is the package and environment manager that ships with both Anaconda and Miniconda. Anaconda bundles a large collection of data science packages out of the box, while Miniconda is the minimal installer that gives you just conda itself and Python. For servers and developer machines where disk space matters, Miniconda is often the better choice. On workstations where convenience is the priority, Anaconda makes sense.

## Anaconda vs Miniconda

Before downloading anything, decide which distribution fits your needs:

- **Anaconda** - ships with 250+ pre-installed packages (NumPy, pandas, scikit-learn, Jupyter, etc.). The installer is around 800 MB.
- **Miniconda** - bare minimum: conda, Python, and a handful of dependencies. Installer is around 80 MB. You install only what you need.

For production servers or CI environments, Miniconda is almost always the right call. For local data science workstations, Anaconda saves time on initial setup.

## Downloading the Installer

Find the latest installers at the official conda documentation pages. Use `wget` or `curl` to download them directly to your server.

```bash
# Download Miniconda for Linux x86_64
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh

# Or download Anaconda (larger download)
wget https://repo.anaconda.com/archive/Anaconda3-2024.10-1-Linux-x86_64.sh -O ~/anaconda.sh
```

Verify the SHA-256 checksum against the value listed on the download page:

```bash
# Check the hash of your downloaded file
sha256sum ~/miniconda.sh
```

Compare the output against the hash published on the Miniconda download page. If they match, the file is intact.

## Running the Installer

```bash
# Make the installer executable and run it
bash ~/miniconda.sh

# For non-interactive installation (useful in scripts/CI)
bash ~/miniconda.sh -b -p $HOME/miniconda3
```

The `-b` flag runs in batch mode (accepts the license automatically) and `-p` sets the installation directory. Without these flags, the installer walks you through an interactive prompt.

After installation completes, initialize conda for your shell:

```bash
# Initialize conda for bash
$HOME/miniconda3/bin/conda init bash

# Then reload your shell configuration
source ~/.bashrc
```

For zsh users:

```bash
conda init zsh
source ~/.zshrc
```

## Verifying the Installation

```bash
# Check conda version
conda --version

# Verify Python version
python --version

# List available commands
conda info
```

## Managing Conda Environments

Environments are the core value proposition of conda. Each environment has its own Python version and packages, completely isolated from others.

```bash
# Create a new environment with a specific Python version
conda create --name myproject python=3.11

# Activate the environment
conda activate myproject

# Check which Python is active
which python
python --version

# Deactivate when done
conda deactivate
```

### Installing Packages

```bash
# Install packages from the default channel
conda install numpy pandas matplotlib

# Install from conda-forge (wider package selection)
conda install -c conda-forge scikit-learn

# Mix conda and pip - install pip packages inside a conda env
pip install some-package-not-in-conda
```

### Listing and Removing Environments

```bash
# List all environments
conda env list

# Remove an environment you no longer need
conda remove --name myproject --all
```

## Exporting and Reproducing Environments

One of the most useful features is exporting an environment definition so others (or your CI system) can reproduce it exactly.

```bash
# Export the active environment to a file
conda env export > environment.yml

# Create an environment from a file
conda env create -f environment.yml
```

A typical `environment.yml` looks like this:

```yaml
name: myproject
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.11
  - numpy=1.26.0
  - pandas=2.1.0
  - pip:
    - somepackage==1.0.0
```

The `pip:` section handles any packages not available in conda channels.

## Keeping Conda Updated

```bash
# Update conda itself
conda update conda

# Update all packages in the active environment
conda update --all

# Update a specific package
conda update numpy
```

## Configuring Conda Channels

Channels are package repositories. The default channel has most common packages, but `conda-forge` is a community-maintained channel with broader coverage and often more up-to-date versions.

```bash
# Add conda-forge to your channel list with higher priority
conda config --add channels conda-forge

# Set channel priority to strict (recommended)
conda config --set channel_priority strict

# View current configuration
conda config --show channels
```

## Disabling Auto-Activation of Base Environment

By default, conda activates the `base` environment when you open a shell. On servers where you only occasionally need conda, this can be annoying. Disable it:

```bash
conda config --set auto_activate_base false
```

After this, you manually activate environments only when needed with `conda activate envname`.

## Installing Miniconda System-Wide

For multi-user servers, you may want to install conda in a shared location:

```bash
# Install to /opt/miniconda3 (requires sudo for the path, but not for conda itself)
sudo bash ~/miniconda.sh -b -p /opt/miniconda3

# Initialize for a specific user
/opt/miniconda3/bin/conda init bash
```

Then add the shared conda to the PATH for all users by placing a file in `/etc/profile.d/`:

```bash
# /etc/profile.d/conda.sh
export PATH="/opt/miniconda3/bin:$PATH"
```

## Cleaning Up the Installer

Once conda is installed and working, remove the installer script:

```bash
rm ~/miniconda.sh
# or
rm ~/anaconda.sh
```

## Common Issues

**`conda` command not found after installation** - The installer modifies your `.bashrc` but you need to reload it: `source ~/.bashrc`. If you're using a non-interactive shell (like in a Docker build), source it explicitly or use the full path.

**Slow environment solves** - conda's default solver can be slow with large environments. Install and use `mamba`, a faster drop-in replacement:

```bash
conda install -n base -c conda-forge mamba
# Then use mamba wherever you'd use conda
mamba install numpy pandas
mamba env create -f environment.yml
```

**SSL errors when installing packages** - Often caused by corporate proxies or outdated certificates. Try:

```bash
conda config --set ssl_verify false
# Re-enable after resolving the underlying certificate issue
```

Conda and its environment management make Python dependency hell largely a thing of the past on Ubuntu systems. Start with Miniconda, add packages as you need them, and export environment files to keep your setups reproducible.

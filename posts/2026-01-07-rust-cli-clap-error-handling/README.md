# How to Build a CLI Tool in Rust with Clap and Proper Error Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, CLI, clap, Error Handling, Command Line, anyhow, thiserror

Description: Learn how to build professional CLI tools in Rust using Clap for argument parsing and proper error handling patterns. This guide covers subcommands, validation, configuration, and exit codes.

---

> Command-line tools are Rust's sweet spot. The language's performance, safety, and single-binary distribution make it perfect for CLI applications. This guide shows you how to build tools that are both powerful and user-friendly.

We'll use Clap for argument parsing (the de facto standard) and establish error handling patterns that provide clear feedback to users.

---

## Project Setup

```toml
[package]
name = "mytool"
version = "0.1.0"
edition = "2021"

[dependencies]
# CLI argument parsing
clap = { version = "4", features = ["derive", "env"] }

# Error handling
anyhow = "1"
thiserror = "1"

# Configuration
serde = { version = "1", features = ["derive"] }
toml = "0.8"

# Colored output
colored = "2"

# Async runtime (if needed)
tokio = { version = "1", features = ["full"], optional = true }

[features]
default = []
async = ["tokio"]
```

---

## Basic CLI Structure with Clap

```rust
// src/main.rs
// CLI application with Clap derive API

use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;

/// MyTool - A sample CLI application
#[derive(Parser)]
#[command(name = "mytool")]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    /// Enable verbose output
    #[arg(short, long, global = true)]
    verbose: bool,

    /// Configuration file path
    #[arg(short, long, global = true, env = "MYTOOL_CONFIG")]
    config: Option<PathBuf>,

    /// Output format
    #[arg(short, long, default_value = "text", global = true)]
    format: OutputFormat,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new project
    Init {
        /// Project name
        #[arg(short, long)]
        name: String,

        /// Project directory (defaults to current directory)
        #[arg(short, long)]
        path: Option<PathBuf>,

        /// Use template
        #[arg(short, long, default_value = "default")]
        template: String,
    },

    /// Build the project
    Build {
        /// Build in release mode
        #[arg(short, long)]
        release: bool,

        /// Target directory
        #[arg(short, long)]
        target: Option<PathBuf>,
    },

    /// Run tests
    Test {
        /// Test filter pattern
        #[arg(short, long)]
        filter: Option<String>,

        /// Run only integration tests
        #[arg(long)]
        integration: bool,
    },

    /// Deploy to environment
    Deploy {
        /// Target environment
        #[arg(value_enum)]
        environment: Environment,

        /// Skip confirmation
        #[arg(short, long)]
        yes: bool,
    },

    /// Configuration commands
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },
}

#[derive(Subcommand)]
enum ConfigAction {
    /// Show current configuration
    Show,
    /// Set a configuration value
    Set {
        /// Configuration key
        key: String,
        /// Configuration value
        value: String,
    },
    /// Get a configuration value
    Get {
        /// Configuration key
        key: String,
    },
}

#[derive(ValueEnum, Clone, Debug)]
enum Environment {
    Development,
    Staging,
    Production,
}

#[derive(ValueEnum, Clone, Debug)]
enum OutputFormat {
    Text,
    Json,
    Yaml,
}

fn main() {
    let cli = Cli::parse();

    // Initialize logging based on verbosity
    if cli.verbose {
        eprintln!("Verbose mode enabled");
    }

    // Run the application
    if let Err(e) = run(cli) {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn run(cli: Cli) -> anyhow::Result<()> {
    match cli.command {
        Commands::Init { name, path, template } => {
            cmd_init(&name, path, &template, cli.verbose)
        }
        Commands::Build { release, target } => {
            cmd_build(release, target, cli.verbose)
        }
        Commands::Test { filter, integration } => {
            cmd_test(filter, integration)
        }
        Commands::Deploy { environment, yes } => {
            cmd_deploy(environment, yes, cli.verbose)
        }
        Commands::Config { action } => {
            cmd_config(action)
        }
    }
}
```

---

## Error Handling

Use `thiserror` for library errors and `anyhow` for application errors.

```rust
// src/error.rs
// Error types for the CLI

use thiserror::Error;
use std::path::PathBuf;

/// Domain-specific errors
#[derive(Error, Debug)]
pub enum CliError {
    #[error("Project '{0}' already exists")]
    ProjectExists(String),

    #[error("Template '{0}' not found")]
    TemplateNotFound(String),

    #[error("Configuration file not found: {0}")]
    ConfigNotFound(PathBuf),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Build failed: {0}")]
    BuildFailed(String),

    #[error("Deployment to {environment} failed: {reason}")]
    DeploymentFailed {
        environment: String,
        reason: String,
    },

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

// In handlers, use anyhow for convenient error chaining
use anyhow::{Context, Result, bail};

fn cmd_init(name: &str, path: Option<PathBuf>, template: &str, verbose: bool) -> Result<()> {
    let project_path = path.unwrap_or_else(|| PathBuf::from("."));
    let target_dir = project_path.join(name);

    // Check if directory exists
    if target_dir.exists() {
        return Err(CliError::ProjectExists(name.to_string()).into());
    }

    // Create directory with context for better error messages
    std::fs::create_dir_all(&target_dir)
        .with_context(|| format!("Failed to create directory: {}", target_dir.display()))?;

    if verbose {
        eprintln!("Created directory: {}", target_dir.display());
    }

    // Copy template files
    copy_template(template, &target_dir)
        .with_context(|| format!("Failed to initialize from template '{}'", template))?;

    println!("Initialized project '{}' at {}", name, target_dir.display());
    Ok(())
}

fn copy_template(template: &str, target: &PathBuf) -> Result<()> {
    // Template logic here
    if template == "invalid" {
        bail!(CliError::TemplateNotFound(template.to_string()));
    }
    Ok(())
}
```

---

## Configuration File Support

```rust
// src/config.rs
// Configuration management

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    pub project: ProjectConfig,
    pub build: BuildConfig,
    pub deploy: DeployConfig,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ProjectConfig {
    pub name: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct BuildConfig {
    pub target_dir: Option<PathBuf>,
    pub features: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct DeployConfig {
    pub default_environment: Option<String>,
    pub confirm: bool,
}

impl Config {
    /// Load configuration from file
    pub fn load(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read config file: {}", path.display()))?;

        toml::from_str(&content)
            .with_context(|| format!("Failed to parse config file: {}", path.display()))
    }

    /// Load from default locations
    pub fn load_default() -> Result<Self> {
        let candidates = [
            PathBuf::from("mytool.toml"),
            PathBuf::from(".mytool.toml"),
            dirs::config_dir()
                .map(|d| d.join("mytool/config.toml"))
                .unwrap_or_default(),
        ];

        for path in candidates {
            if path.exists() {
                return Self::load(&path);
            }
        }

        Ok(Self::default())
    }

    /// Save configuration to file
    pub fn save(&self, path: &PathBuf) -> Result<()> {
        let content = toml::to_string_pretty(self)
            .context("Failed to serialize configuration")?;

        std::fs::write(path, content)
            .with_context(|| format!("Failed to write config file: {}", path.display()))
    }
}
```

---

## Interactive Prompts

```rust
// src/prompt.rs
// Interactive user prompts

use std::io::{self, Write};
use anyhow::Result;

/// Prompt for yes/no confirmation
pub fn confirm(message: &str, default: bool) -> Result<bool> {
    let suffix = if default { "[Y/n]" } else { "[y/N]" };

    print!("{} {} ", message, suffix);
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    let input = input.trim().to_lowercase();

    Ok(match input.as_str() {
        "y" | "yes" => true,
        "n" | "no" => false,
        "" => default,
        _ => default,
    })
}

/// Prompt for text input
pub fn prompt(message: &str, default: Option<&str>) -> Result<String> {
    match default {
        Some(d) => print!("{} [{}]: ", message, d),
        None => print!("{}: ", message),
    }
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    let input = input.trim();
    if input.is_empty() {
        Ok(default.unwrap_or("").to_string())
    } else {
        Ok(input.to_string())
    }
}

/// Select from options
pub fn select(message: &str, options: &[&str], default: usize) -> Result<usize> {
    println!("{}:", message);
    for (i, opt) in options.iter().enumerate() {
        let marker = if i == default { ">" } else { " " };
        println!("{} {}. {}", marker, i + 1, opt);
    }

    print!("Enter choice [{}]: ", default + 1);
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    let input = input.trim();
    if input.is_empty() {
        return Ok(default);
    }

    input.parse::<usize>()
        .map(|n| n.saturating_sub(1))
        .map_err(|_| anyhow::anyhow!("Invalid selection"))
}
```

---

## Command Implementations

```rust
// src/commands.rs
// Command implementations

use crate::config::Config;
use crate::prompt;
use anyhow::{Context, Result, bail};
use colored::Colorize;
use std::path::PathBuf;

pub fn cmd_build(release: bool, target: Option<PathBuf>, verbose: bool) -> Result<()> {
    let mode = if release { "release" } else { "debug" };
    println!("{} Building in {} mode...", "→".blue(), mode);

    // Simulate build process
    let steps = ["Compiling", "Linking", "Optimizing"];

    for step in steps {
        if verbose {
            println!("  {} {}", "•".green(), step);
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }

    println!("{} Build complete!", "✓".green());
    Ok(())
}

pub fn cmd_test(filter: Option<String>, integration: bool) -> Result<()> {
    let test_type = if integration { "integration" } else { "unit" };
    println!("{} Running {} tests...", "→".blue(), test_type);

    if let Some(f) = &filter {
        println!("  Filter: {}", f);
    }

    // Simulate test execution
    println!("{} All tests passed!", "✓".green());
    Ok(())
}

pub fn cmd_deploy(environment: Environment, skip_confirm: bool, verbose: bool) -> Result<()> {
    let env_name = format!("{:?}", environment).to_lowercase();

    // Confirm for production
    if matches!(environment, Environment::Production) && !skip_confirm {
        println!("{} You are about to deploy to {}", "⚠".yellow(), "PRODUCTION".red().bold());

        if !prompt::confirm("Are you sure you want to continue?", false)? {
            println!("Deployment cancelled.");
            return Ok(());
        }
    }

    println!("{} Deploying to {}...", "→".blue(), env_name);

    // Simulate deployment
    let steps = ["Preparing", "Uploading", "Verifying"];
    for step in steps {
        if verbose {
            println!("  {} {}", "•".green(), step);
        }
        std::thread::sleep(std::time::Duration::from_millis(300));
    }

    println!("{} Deployed successfully to {}", "✓".green(), env_name);
    Ok(())
}

pub fn cmd_config(action: ConfigAction) -> Result<()> {
    let config = Config::load_default()?;

    match action {
        ConfigAction::Show => {
            let toml = toml::to_string_pretty(&config)?;
            println!("{}", toml);
        }
        ConfigAction::Get { key } => {
            // Simple key access (would need proper implementation)
            println!("Config key '{}' value lookup", key);
        }
        ConfigAction::Set { key, value } => {
            println!("Setting {} = {}", key, value);
            // Would save to config file
        }
    }

    Ok(())
}
```

---

## Exit Codes

```rust
// src/exit.rs
// Standardized exit codes

pub mod exit_code {
    pub const SUCCESS: i32 = 0;
    pub const GENERAL_ERROR: i32 = 1;
    pub const USAGE_ERROR: i32 = 2;
    pub const CONFIG_ERROR: i32 = 3;
    pub const IO_ERROR: i32 = 4;
    pub const PERMISSION_ERROR: i32 = 5;
    pub const NETWORK_ERROR: i32 = 6;
}

// In main.rs
fn main() {
    let cli = Cli::parse();

    let exit_code = match run(cli) {
        Ok(()) => exit_code::SUCCESS,
        Err(e) => {
            eprintln!("{}: {}", "error".red().bold(), e);

            // Print cause chain in verbose mode
            for cause in e.chain().skip(1) {
                eprintln!("  {}: {}", "caused by".yellow(), cause);
            }

            determine_exit_code(&e)
        }
    };

    std::process::exit(exit_code);
}

fn determine_exit_code(error: &anyhow::Error) -> i32 {
    // Check for specific error types
    if error.downcast_ref::<std::io::Error>().is_some() {
        return exit_code::IO_ERROR;
    }

    if error.downcast_ref::<CliError>().is_some() {
        return exit_code::GENERAL_ERROR;
    }

    exit_code::GENERAL_ERROR
}
```

---

## Testing CLI Applications

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use assert_cmd::Command;
    use predicates::prelude::*;

    #[test]
    fn test_help() {
        let mut cmd = Command::cargo_bin("mytool").unwrap();
        cmd.arg("--help")
            .assert()
            .success()
            .stdout(predicate::str::contains("MyTool"));
    }

    #[test]
    fn test_version() {
        let mut cmd = Command::cargo_bin("mytool").unwrap();
        cmd.arg("--version")
            .assert()
            .success();
    }

    #[test]
    fn test_init_requires_name() {
        let mut cmd = Command::cargo_bin("mytool").unwrap();
        cmd.args(["init"])
            .assert()
            .failure()
            .stderr(predicate::str::contains("--name"));
    }
}
```

---

## Best Practices

1. **Use derive API** - Clap's derive macro is more maintainable than builder
2. **Provide defaults** - Use sensible defaults with environment variable fallbacks
3. **Structured errors** - Use `thiserror` for domain errors, `anyhow` for app errors
4. **Exit codes** - Return meaningful exit codes for scripting
5. **Colored output** - Use colors for better UX (respect NO_COLOR env var)
6. **Shell completions** - Generate completion scripts with `clap_complete`

---

*Building CLI tools for DevOps? [OneUptime](https://oneuptime.com) can monitor your deployment scripts and alert on failures.*

**Related Reading:**
- [How to Use Worker Threads in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-worker-threads-cpu-intensive/view)
- [How to Handle File I/O Efficiently in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-file-io-efficient/view)

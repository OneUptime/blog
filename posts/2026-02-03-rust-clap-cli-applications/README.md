# How to Build CLI Applications with Clap in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Clap, CLI, Command Line, Tools

Description: Learn how to build powerful command-line applications in Rust using Clap. This guide covers argument parsing, subcommands, validation, and creating user-friendly CLIs.

---

Command-line interfaces remain the backbone of developer tooling. From `git` to `docker` to `kubectl`, the tools we rely on daily are CLI applications. Rust has become a popular choice for building these tools because of its performance, safety guarantees, and excellent ecosystem.

Clap (Command Line Argument Parser) is the most widely used argument parsing library in Rust. It powers tools like `ripgrep`, `bat`, `fd`, and hundreds of other production CLIs. This guide walks you through building robust CLI applications with Clap, from basic argument parsing to advanced features like subcommands and shell completions.

## Why Clap?

Before diving in, here is why Clap stands out among CLI libraries:

| Feature | Clap | Other Libraries |
|---------|------|-----------------|
| Type safety | Full derive macro support | Often runtime-only |
| Help generation | Automatic and customizable | Manual or basic |
| Shell completions | Built-in generator | Separate libraries |
| Subcommands | First-class support | Limited or complex |
| Validation | Compile-time and runtime | Usually runtime only |
| Maintenance | Active development | Varies widely |

## Getting Started

### Installation

Create a new Rust project and add Clap to your dependencies:

```bash
# Create a new project
cargo new mycli
cd mycli

# Add clap with the derive feature for declarative argument definitions
cargo add clap --features derive
```

Your `Cargo.toml` should look like this:

```toml
[package]
name = "mycli"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.5", features = ["derive"] }
```

The `derive` feature enables the declarative macro-based API, which is the recommended approach for most applications.

### Your First CLI

Let us build a simple greeting application to understand the basics:

```rust
// src/main.rs
use clap::Parser;

// The Parser derive macro generates the argument parsing logic
// Doc comments become the help text shown to users
/// A simple greeting CLI that demonstrates basic Clap usage
#[derive(Parser)]
#[command(name = "greet")]
#[command(version = "1.0")]
#[command(about = "Greets a person with a customizable message")]
struct Cli {
    // Positional argument - required by default
    // The field name becomes the argument name in help text
    /// The name of the person to greet
    name: String,

    // Optional flag with short (-c) and long (--count) versions
    // The type Option<u8> makes it optional
    /// Number of times to repeat the greeting
    #[arg(short, long, default_value_t = 1)]
    count: u8,
}

fn main() {
    // Parse command line arguments into our struct
    // This handles errors and displays help automatically
    let cli = Cli::parse();

    // Use the parsed values
    for _ in 0..cli.count {
        println!("Hello, {}!", cli.name);
    }
}
```

Run your CLI:

```bash
# Basic usage with just the required argument
cargo run -- Alice
# Output: Hello, Alice!

# Use the count flag to repeat the greeting
cargo run -- Alice --count 3
# Output:
# Hello, Alice!
# Hello, Alice!
# Hello, Alice!

# Short flag version
cargo run -- Alice -c 2
# Output:
# Hello, Alice!
# Hello, Alice!

# View help text
cargo run -- --help
# Output:
# Greets a person with a customizable message
#
# Usage: greet [OPTIONS] <NAME>
#
# Arguments:
#   <NAME>  The name of the person to greet
#
# Options:
#   -c, --count <COUNT>  Number of times to repeat the greeting [default: 1]
#   -h, --help           Print help
#   -V, --version        Print version
```

## Understanding Arguments and Flags

Clap distinguishes between different types of command-line inputs:

### Positional Arguments

Positional arguments are identified by their position, not by a flag. They are typically required:

```rust
use clap::Parser;

#[derive(Parser)]
struct Cli {
    // First positional argument (required)
    /// Source file to process
    source: String,

    // Second positional argument (required)
    /// Destination path for output
    destination: String,

    // Optional positional argument using Option<T>
    /// Optional config file path
    config: Option<String>,
}
```

### Flags and Options

Flags are boolean switches. Options take values:

```rust
use clap::Parser;

#[derive(Parser)]
struct Cli {
    // Boolean flag - presence means true, absence means false
    // Using short and long gives both -v and --verbose
    /// Enable verbose output for debugging
    #[arg(short, long)]
    verbose: bool,

    // Option with value - takes an argument after the flag
    // The type determines what values are accepted
    /// Output file path
    #[arg(short, long)]
    output: Option<String>,

    // Option with default value
    // default_value_t is for types that implement Display
    /// Port number for the server
    #[arg(short, long, default_value_t = 8080)]
    port: u16,

    // Multiple values using Vec<T>
    // Can be specified multiple times: -f file1 -f file2
    /// Input files to process
    #[arg(short, long)]
    files: Vec<String>,
}
```

### Argument Attributes Reference

Here are the most commonly used argument attributes:

```rust
use clap::Parser;

#[derive(Parser)]
struct Cli {
    // Custom short flag letter
    #[arg(short = 'n')]
    name: String,

    // Custom long flag name
    #[arg(long = "output-path")]
    output: String,

    // Both short and long with custom names
    #[arg(short = 'd', long = "debug-mode")]
    debug: bool,

    // Environment variable fallback
    // Checks CLI first, then env var, then default
    #[arg(long, env = "MY_API_KEY")]
    api_key: Option<String>,

    // Hidden from help text but still functional
    #[arg(long, hide = true)]
    internal_flag: bool,

    // Required option (not optional despite being a flag)
    #[arg(long, required = true)]
    config: String,

    // Mutually exclusive with another argument
    #[arg(long, conflicts_with = "verbose")]
    quiet: bool,

    #[arg(long)]
    verbose: bool,

    // Requires another argument to be present
    #[arg(long, requires = "output")]
    compress: bool,

    #[arg(long)]
    output: Option<String>,
}
```

## Value Validation

Clap provides multiple ways to validate argument values, from compile-time type checking to custom runtime validators.

### Built-in Type Validation

Rust's type system provides the first layer of validation:

```rust
use clap::Parser;
use std::path::PathBuf;

#[derive(Parser)]
struct Cli {
    // Automatically validates that input is a valid number
    // Invalid input like "abc" produces a clear error message
    /// Port number (1-65535)
    #[arg(short, long)]
    port: u16,

    // PathBuf validates path syntax for the current OS
    /// Path to configuration file
    #[arg(short, long)]
    config: PathBuf,

    // IpAddr validates IP address format
    /// Server IP address
    #[arg(long)]
    bind: std::net::IpAddr,
}
```

### Value Ranges

Restrict numeric values to specific ranges:

```rust
use clap::Parser;

#[derive(Parser)]
struct Cli {
    // value_parser with range restricts acceptable values
    // Produces clear error if value is out of range
    /// Concurrency level (1-32 threads)
    #[arg(short, long, value_parser = clap::value_parser!(u8).range(1..=32))]
    threads: u8,

    // Percentages between 0 and 100
    /// Quality level as percentage
    #[arg(short, long, value_parser = clap::value_parser!(u8).range(0..=100))]
    quality: u8,
}
```

### Predefined Choices

Limit input to specific values using enums:

```rust
use clap::{Parser, ValueEnum};

// ValueEnum derives the necessary traits for CLI parsing
// Each variant becomes a valid choice (lowercase by default)
#[derive(Clone, ValueEnum)]
enum OutputFormat {
    Json,
    Yaml,
    Toml,
    // Custom name for this variant in CLI
    #[value(name = "plain")]
    PlainText,
}

#[derive(Clone, ValueEnum)]
enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Parser)]
struct Cli {
    // Enum values are automatically validated
    // Help text shows all valid options
    /// Output format for results
    #[arg(short, long, value_enum, default_value_t = OutputFormat::Json)]
    format: OutputFormat,

    /// Logging verbosity level
    #[arg(short, long, value_enum, default_value_t = LogLevel::Info)]
    log_level: LogLevel,
}

fn main() {
    let cli = Cli::parse();

    // Pattern matching on the enum
    match cli.format {
        OutputFormat::Json => println!("Outputting JSON"),
        OutputFormat::Yaml => println!("Outputting YAML"),
        OutputFormat::Toml => println!("Outputting TOML"),
        OutputFormat::PlainText => println!("Outputting plain text"),
    }
}
```

### Custom Validators

For complex validation logic, use custom value parsers:

```rust
use clap::Parser;
use std::path::PathBuf;

// Custom validator function returns Result<T, E>
// Ok(value) means validation passed, Err(message) displays the error
fn validate_file_exists(path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path);
    if path.exists() {
        Ok(path)
    } else {
        Err(format!("File does not exist: {}", path.display()))
    }
}

// Validator for port numbers in user range
fn validate_port(port: &str) -> Result<u16, String> {
    let port: u16 = port
        .parse()
        .map_err(|_| format!("'{}' is not a valid port number", port))?;

    if port < 1024 {
        Err(format!("Port {} requires root privileges, use 1024 or higher", port))
    } else {
        Ok(port)
    }
}

// Email validation with basic regex
fn validate_email(email: &str) -> Result<String, String> {
    if email.contains('@') && email.contains('.') {
        Ok(email.to_string())
    } else {
        Err(format!("'{}' is not a valid email address", email))
    }
}

#[derive(Parser)]
struct Cli {
    // Use custom validator with value_parser attribute
    /// Configuration file (must exist)
    #[arg(short, long, value_parser = validate_file_exists)]
    config: PathBuf,

    /// Server port (must be >= 1024)
    #[arg(short, long, value_parser = validate_port)]
    port: u16,

    /// Contact email address
    #[arg(short, long, value_parser = validate_email)]
    email: String,
}
```

## Subcommands

Most real-world CLIs use subcommands to organize functionality. Think `git commit`, `docker build`, or `cargo run`. Clap makes this pattern straightforward.

### Basic Subcommand Structure

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "myapp")]
#[command(about = "A multi-tool CLI application")]
struct Cli {
    // Global flags available to all subcommands
    /// Enable verbose output across all commands
    #[arg(short, long, global = true)]
    verbose: bool,

    // The subcommand enum
    #[command(subcommand)]
    command: Commands,
}

// Each variant becomes a subcommand
// Struct variants can have their own arguments
#[derive(Subcommand)]
enum Commands {
    /// Initialize a new project
    Init {
        /// Project name
        name: String,

        /// Use a template
        #[arg(short, long)]
        template: Option<String>,
    },

    /// Build the project
    Build {
        /// Build in release mode
        #[arg(short, long)]
        release: bool,

        /// Target architecture
        #[arg(short, long, default_value = "native")]
        target: String,
    },

    /// Run the project
    Run {
        /// Arguments to pass to the program
        #[arg(trailing_var_arg = true)]
        args: Vec<String>,
    },

    /// Clean build artifacts
    Clean,
}

fn main() {
    let cli = Cli::parse();

    // Global verbose flag is accessible here
    if cli.verbose {
        println!("Verbose mode enabled");
    }

    // Match on the subcommand
    match cli.command {
        Commands::Init { name, template } => {
            println!("Initializing project: {}", name);
            if let Some(tmpl) = template {
                println!("Using template: {}", tmpl);
            }
        }
        Commands::Build { release, target } => {
            let mode = if release { "release" } else { "debug" };
            println!("Building in {} mode for {}", mode, target);
        }
        Commands::Run { args } => {
            println!("Running with args: {:?}", args);
        }
        Commands::Clean => {
            println!("Cleaning build artifacts");
        }
    }
}
```

Usage examples:

```bash
# Initialize a new project
myapp init my-project --template rust

# Build in release mode
myapp build --release --target x86_64-unknown-linux-gnu

# Run with arguments
myapp run -- --port 8080 --config app.toml

# Clean with verbose output
myapp --verbose clean
```

### Nested Subcommands

For complex CLIs, you can nest subcommands multiple levels deep:

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "cloud")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Manage compute instances
    Compute {
        #[command(subcommand)]
        command: ComputeCommands,
    },
    /// Manage storage buckets
    Storage {
        #[command(subcommand)]
        command: StorageCommands,
    },
}

#[derive(Subcommand)]
enum ComputeCommands {
    /// List all instances
    List {
        /// Filter by region
        #[arg(short, long)]
        region: Option<String>,
    },
    /// Create a new instance
    Create {
        /// Instance name
        name: String,
        /// Instance type
        #[arg(short, long, default_value = "small")]
        instance_type: String,
    },
    /// Delete an instance
    Delete {
        /// Instance ID
        id: String,
        /// Skip confirmation prompt
        #[arg(short, long)]
        force: bool,
    },
}

#[derive(Subcommand)]
enum StorageCommands {
    /// List all buckets
    List,
    /// Create a new bucket
    Create {
        /// Bucket name
        name: String,
    },
    /// Upload a file
    Upload {
        /// Local file path
        source: String,
        /// Bucket name
        bucket: String,
        /// Remote path
        #[arg(short, long)]
        path: Option<String>,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Compute { command } => match command {
            ComputeCommands::List { region } => {
                println!("Listing instances");
                if let Some(r) = region {
                    println!("Filtered by region: {}", r);
                }
            }
            ComputeCommands::Create { name, instance_type } => {
                println!("Creating instance '{}' of type '{}'", name, instance_type);
            }
            ComputeCommands::Delete { id, force } => {
                if force {
                    println!("Force deleting instance {}", id);
                } else {
                    println!("Deleting instance {} (with confirmation)", id);
                }
            }
        },
        Commands::Storage { command } => match command {
            StorageCommands::List => println!("Listing buckets"),
            StorageCommands::Create { name } => println!("Creating bucket: {}", name),
            StorageCommands::Upload { source, bucket, path } => {
                let dest = path.unwrap_or_else(|| source.clone());
                println!("Uploading {} to {}:{}", source, bucket, dest);
            }
        },
    }
}
```

Usage:

```bash
# Nested subcommands
cloud compute list --region us-east-1
cloud compute create my-server --instance-type large
cloud storage upload ./data.csv my-bucket --path /backups/data.csv
```

## Advanced Features

### Argument Groups

Group related arguments and enforce constraints between them:

```rust
use clap::{Args, Parser};

// Args derive creates a reusable group of arguments
// This can be embedded in multiple commands
#[derive(Args)]
struct DatabaseConfig {
    /// Database host
    #[arg(long, default_value = "localhost")]
    db_host: String,

    /// Database port
    #[arg(long, default_value_t = 5432)]
    db_port: u16,

    /// Database name
    #[arg(long)]
    db_name: String,

    /// Database user
    #[arg(long)]
    db_user: String,

    /// Database password
    #[arg(long, env = "DB_PASSWORD")]
    db_password: Option<String>,
}

// Another argument group for output options
#[derive(Args)]
struct OutputOptions {
    /// Output file path (stdout if not specified)
    #[arg(short, long)]
    output: Option<String>,

    /// Output format
    #[arg(short, long, default_value = "json")]
    format: String,

    /// Pretty print output
    #[arg(long)]
    pretty: bool,
}

#[derive(Parser)]
struct Cli {
    // Flatten embeds the group's arguments at this level
    // Users see --db-host, not --database-db-host
    #[command(flatten)]
    database: DatabaseConfig,

    #[command(flatten)]
    output: OutputOptions,

    /// SQL query to execute
    query: String,
}

fn main() {
    let cli = Cli::parse();

    println!("Connecting to {}:{}", cli.database.db_host, cli.database.db_port);
    println!("Database: {}", cli.database.db_name);
    println!("Query: {}", cli.query);

    if cli.output.pretty {
        println!("Pretty printing {} output", cli.output.format);
    }
}
```

### Mutually Exclusive Arguments

When users should provide one option or the other, but not both:

```rust
use clap::{Args, Parser};

#[derive(Args)]
#[group(required = true, multiple = false)]
struct InputSource {
    /// Read from file
    #[arg(short, long)]
    file: Option<String>,

    /// Read from URL
    #[arg(short, long)]
    url: Option<String>,

    /// Read from stdin
    #[arg(long)]
    stdin: bool,
}

#[derive(Parser)]
struct Cli {
    #[command(flatten)]
    input: InputSource,

    /// Process the input
    #[arg(short, long)]
    process: bool,
}

fn main() {
    let cli = Cli::parse();

    // Exactly one of these will be set due to the group constraint
    if let Some(file) = cli.input.file {
        println!("Reading from file: {}", file);
    } else if let Some(url) = cli.input.url {
        println!("Fetching from URL: {}", url);
    } else if cli.input.stdin {
        println!("Reading from stdin");
    }
}
```

### Default Values from Functions

When default values need computation:

```rust
use clap::Parser;
use std::path::PathBuf;

// Function to compute default config path
fn default_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("myapp")
        .join("config.toml")
}

// Function to get default thread count
fn default_thread_count() -> usize {
    std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(4)
}

#[derive(Parser)]
struct Cli {
    // default_value_os_t for PathBuf (OS string)
    /// Configuration file path
    #[arg(short, long, default_value_os_t = default_config_path())]
    config: PathBuf,

    // default_value_t for regular types
    /// Number of worker threads
    #[arg(short, long, default_value_t = default_thread_count())]
    threads: usize,
}
```

### Environment Variable Integration

Clap can read values from environment variables as fallbacks:

```rust
use clap::Parser;

#[derive(Parser)]
#[command(name = "myapp")]
struct Cli {
    // Check CLI arg first, then environment variable
    /// API endpoint URL
    #[arg(long, env = "MYAPP_API_URL")]
    api_url: String,

    // Environment variable with a default value
    /// API key for authentication
    #[arg(long, env = "MYAPP_API_KEY")]
    api_key: Option<String>,

    // Hide the environment variable value in help (for secrets)
    /// Database connection string
    #[arg(long, env = "DATABASE_URL", hide_env_values = true)]
    database_url: String,

    /// Log level
    #[arg(long, env = "MYAPP_LOG_LEVEL", default_value = "info")]
    log_level: String,
}

fn main() {
    let cli = Cli::parse();

    println!("Connecting to: {}", cli.api_url);
    println!("Log level: {}", cli.log_level);

    if cli.api_key.is_some() {
        println!("API key provided");
    }
}
```

## Shell Completions

Generating shell completions significantly improves the user experience. Clap can generate completions for Bash, Zsh, Fish, PowerShell, and Elvish.

### Generating Completions

Add the `clap_complete` crate to your dependencies:

```bash
cargo add clap_complete
```

Create a build script or a separate binary to generate completions:

```rust
// src/main.rs
use clap::{CommandFactory, Parser, Subcommand};
use clap_complete::{generate, Shell};
use std::io;

#[derive(Parser)]
#[command(name = "myapp")]
#[command(about = "My awesome CLI tool")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Run the main process
    Run {
        #[arg(short, long)]
        config: Option<String>,
    },
    /// Check configuration
    Check,
    /// Generate shell completions
    Completions {
        /// Shell to generate completions for
        #[arg(value_enum)]
        shell: Shell,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Run { config } => {
            println!("Running with config: {:?}", config);
        }
        Commands::Check => {
            println!("Configuration OK");
        }
        Commands::Completions { shell } => {
            // Generate completions and print to stdout
            // Users redirect this to the appropriate file
            let mut cmd = Cli::command();
            generate(shell, &mut cmd, "myapp", &mut io::stdout());
        }
    }
}
```

Users can then install completions:

```bash
# Bash - add to ~/.bashrc
myapp completions bash > ~/.local/share/bash-completion/completions/myapp

# Zsh - add to fpath
myapp completions zsh > ~/.zfunc/_myapp

# Fish
myapp completions fish > ~/.config/fish/completions/myapp.fish

# PowerShell - add to profile
myapp completions powershell >> $PROFILE
```

### Build-time Completion Generation

For distribution, generate completions at build time:

```rust
// build.rs
use clap::CommandFactory;
use clap_complete::{generate_to, Shell};
use std::env;
use std::io::Error;

// Include the CLI definition
include!("src/cli.rs");

fn main() -> Result<(), Error> {
    // Get the output directory from Cargo
    let outdir = match env::var_os("OUT_DIR") {
        None => return Ok(()),
        Some(outdir) => outdir,
    };

    let mut cmd = Cli::command();

    // Generate completions for all supported shells
    generate_to(Shell::Bash, &mut cmd, "myapp", &outdir)?;
    generate_to(Shell::Zsh, &mut cmd, "myapp", &outdir)?;
    generate_to(Shell::Fish, &mut cmd, "myapp", &outdir)?;
    generate_to(Shell::PowerShell, &mut cmd, "myapp", &outdir)?;

    println!("cargo:rerun-if-changed=src/cli.rs");

    Ok(())
}
```

## Error Handling and User Experience

Good CLI tools provide helpful error messages. Here is how to handle errors gracefully:

```rust
use clap::Parser;
use std::fs;
use std::path::PathBuf;
use std::process;

#[derive(Parser)]
#[command(name = "processor")]
struct Cli {
    /// Input file to process
    #[arg(short, long)]
    input: PathBuf,

    /// Output file path
    #[arg(short, long)]
    output: PathBuf,
}

// Custom error type for our application
#[derive(Debug)]
enum AppError {
    InputNotFound(PathBuf),
    InputNotReadable(PathBuf, std::io::Error),
    OutputNotWritable(PathBuf, std::io::Error),
    ProcessingFailed(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::InputNotFound(path) => {
                write!(f, "Input file not found: {}", path.display())
            }
            AppError::InputNotReadable(path, err) => {
                write!(f, "Cannot read input file '{}': {}", path.display(), err)
            }
            AppError::OutputNotWritable(path, err) => {
                write!(f, "Cannot write to output file '{}': {}", path.display(), err)
            }
            AppError::ProcessingFailed(msg) => {
                write!(f, "Processing failed: {}", msg)
            }
        }
    }
}

fn run(cli: Cli) -> Result<(), AppError> {
    // Validate input file exists
    if !cli.input.exists() {
        return Err(AppError::InputNotFound(cli.input));
    }

    // Read input file
    let content = fs::read_to_string(&cli.input)
        .map_err(|e| AppError::InputNotReadable(cli.input.clone(), e))?;

    // Process content (example: uppercase)
    let processed = content.to_uppercase();

    // Write output
    fs::write(&cli.output, processed)
        .map_err(|e| AppError::OutputNotWritable(cli.output.clone(), e))?;

    println!("Successfully processed {} -> {}",
             cli.input.display(),
             cli.output.display());

    Ok(())
}

fn main() {
    let cli = Cli::parse();

    if let Err(e) = run(cli) {
        // Print error to stderr with the program name
        eprintln!("error: {}", e);

        // Exit with non-zero status code
        process::exit(1);
    }
}
```

### Colored Output

Add colors to make errors and warnings more visible:

```bash
cargo add colored
```

```rust
use colored::Colorize;

fn print_error(message: &str) {
    eprintln!("{}: {}", "error".red().bold(), message);
}

fn print_warning(message: &str) {
    eprintln!("{}: {}", "warning".yellow().bold(), message);
}

fn print_success(message: &str) {
    println!("{}: {}", "success".green().bold(), message);
}

fn print_info(message: &str) {
    println!("{}: {}", "info".blue().bold(), message);
}
```

## Complete Example: A File Processor CLI

Here is a complete example that ties together everything we have covered:

```rust
use clap::{Args, Parser, Subcommand, ValueEnum};
use std::fs;
use std::io::{self, Read, Write};
use std::path::PathBuf;

// === Enums for validated choices ===

#[derive(Clone, ValueEnum)]
enum OutputFormat {
    Json,
    Yaml,
    Csv,
    Text,
}

#[derive(Clone, ValueEnum)]
enum Encoding {
    Utf8,
    Ascii,
    Latin1,
}

// === Argument groups ===

#[derive(Args)]
struct InputOptions {
    /// Input file (use - for stdin)
    #[arg(short, long, default_value = "-")]
    input: String,

    /// Input encoding
    #[arg(long, value_enum, default_value_t = Encoding::Utf8)]
    input_encoding: Encoding,
}

#[derive(Args)]
struct OutputOptions {
    /// Output file (use - for stdout)
    #[arg(short, long, default_value = "-")]
    output: String,

    /// Output format
    #[arg(short, long, value_enum, default_value_t = OutputFormat::Text)]
    format: OutputFormat,

    /// Pretty print output (JSON and YAML only)
    #[arg(long)]
    pretty: bool,
}

// === Main CLI structure ===

#[derive(Parser)]
#[command(name = "fileproc")]
#[command(version = "1.0.0")]
#[command(about = "A powerful file processing utility")]
#[command(long_about = "fileproc is a command-line tool for processing, \
                         transforming, and analyzing files. It supports \
                         multiple input and output formats.")]
struct Cli {
    /// Enable verbose logging
    #[arg(short, long, global = true)]
    verbose: bool,

    /// Suppress all output except errors
    #[arg(short, long, global = true)]
    quiet: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Transform file contents
    Transform {
        #[command(flatten)]
        input: InputOptions,

        #[command(flatten)]
        output: OutputOptions,

        /// Convert to uppercase
        #[arg(long)]
        uppercase: bool,

        /// Convert to lowercase
        #[arg(long)]
        lowercase: bool,

        /// Trim whitespace from lines
        #[arg(long)]
        trim: bool,
    },

    /// Analyze file statistics
    Stats {
        #[command(flatten)]
        input: InputOptions,

        #[command(flatten)]
        output: OutputOptions,
    },

    /// Validate file format
    Validate {
        /// File to validate
        file: PathBuf,

        /// Expected format
        #[arg(short, long, value_enum)]
        format: OutputFormat,

        /// Strict validation mode
        #[arg(long)]
        strict: bool,
    },

    /// Generate shell completions
    Completions {
        /// Shell to generate for
        #[arg(value_enum)]
        shell: clap_complete::Shell,
    },
}

// === Helper functions ===

fn read_input(source: &str) -> io::Result<String> {
    if source == "-" {
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        Ok(buffer)
    } else {
        fs::read_to_string(source)
    }
}

fn write_output(dest: &str, content: &str) -> io::Result<()> {
    if dest == "-" {
        io::stdout().write_all(content.as_bytes())
    } else {
        fs::write(dest, content)
    }
}

fn transform_content(content: &str, uppercase: bool, lowercase: bool, trim: bool) -> String {
    let mut result = content.to_string();

    if uppercase {
        result = result.to_uppercase();
    } else if lowercase {
        result = result.to_lowercase();
    }

    if trim {
        result = result
            .lines()
            .map(|line| line.trim())
            .collect::<Vec<_>>()
            .join("\n");
    }

    result
}

fn calculate_stats(content: &str) -> Stats {
    let lines: Vec<&str> = content.lines().collect();
    let words: Vec<&str> = content.split_whitespace().collect();

    Stats {
        lines: lines.len(),
        words: words.len(),
        characters: content.len(),
        bytes: content.as_bytes().len(),
    }
}

#[derive(serde::Serialize)]
struct Stats {
    lines: usize,
    words: usize,
    characters: usize,
    bytes: usize,
}

// === Main entry point ===

fn main() {
    let cli = Cli::parse();

    // Handle conflicting flags
    if cli.verbose && cli.quiet {
        eprintln!("Error: --verbose and --quiet cannot be used together");
        std::process::exit(1);
    }

    let result = match cli.command {
        Commands::Transform {
            input,
            output,
            uppercase,
            lowercase,
            trim,
        } => {
            if uppercase && lowercase {
                eprintln!("Error: --uppercase and --lowercase are mutually exclusive");
                std::process::exit(1);
            }

            let content = read_input(&input.input).expect("Failed to read input");
            let transformed = transform_content(&content, uppercase, lowercase, trim);
            write_output(&output.output, &transformed)
        }

        Commands::Stats { input, output } => {
            let content = read_input(&input.input).expect("Failed to read input");
            let stats = calculate_stats(&content);

            let result = match output.format {
                OutputFormat::Json => {
                    if output.pretty {
                        serde_json::to_string_pretty(&stats).unwrap()
                    } else {
                        serde_json::to_string(&stats).unwrap()
                    }
                }
                OutputFormat::Text => {
                    format!(
                        "Lines: {}\nWords: {}\nCharacters: {}\nBytes: {}",
                        stats.lines, stats.words, stats.characters, stats.bytes
                    )
                }
                _ => {
                    eprintln!("Format not supported for stats output");
                    std::process::exit(1);
                }
            };

            write_output(&output.output, &result)
        }

        Commands::Validate { file, format, strict } => {
            if cli.verbose {
                println!("Validating {:?} as {:?}", file, format);
            }

            // Validation logic would go here
            if strict {
                println!("Strict mode enabled");
            }

            println!("Validation passed");
            Ok(())
        }

        Commands::Completions { shell } => {
            use clap::CommandFactory;
            use clap_complete::generate;

            let mut cmd = Cli::command();
            generate(shell, &mut cmd, "fileproc", &mut io::stdout());
            Ok(())
        }
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
```

## Best Practices

### 1. Consistent Naming

Follow conventions for flag and subcommand names:

```rust
// Use kebab-case for long flags
#[arg(long = "output-file")]  // Good
#[arg(long = "outputFile")]   // Avoid

// Use lowercase for subcommands
enum Commands {
    BuildProject,  // Becomes "build-project" - good
}
```

### 2. Helpful Error Messages

Always provide context in error messages:

```rust
// Bad: What file? What went wrong?
"Failed to read file"

// Good: Specific and actionable
"Failed to read config file '/etc/myapp/config.toml': Permission denied"
```

### 3. Support Common Patterns

Users expect certain behaviors:

```rust
#[derive(Parser)]
struct Cli {
    // Support stdin with "-"
    #[arg(default_value = "-")]
    input: String,

    // Support environment variables for secrets
    #[arg(env = "API_KEY", hide_env_values = true)]
    api_key: Option<String>,

    // Support verbose flags
    #[arg(short, long, action = clap::ArgAction::Count)]
    verbose: u8,  // -v, -vv, -vvv for increasing verbosity
}
```

### 4. Test Your CLI

Test argument parsing separately from business logic:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use clap::CommandFactory;

    #[test]
    fn verify_cli() {
        // Clap will verify the CLI definition is valid
        Cli::command().debug_assert();
    }

    #[test]
    fn test_default_values() {
        let cli = Cli::parse_from(["myapp", "input.txt"]);
        assert_eq!(cli.format, OutputFormat::Json);
    }

    #[test]
    fn test_all_flags() {
        let cli = Cli::parse_from([
            "myapp",
            "--verbose",
            "--format", "yaml",
            "input.txt",
        ]);
        assert!(cli.verbose);
    }
}
```

## Summary

Clap provides everything you need to build professional CLI applications in Rust:

| Feature | Benefit |
|---------|---------|
| Derive macros | Declarative, type-safe argument definitions |
| Automatic help | Generated from doc comments |
| Subcommands | Organize complex functionality |
| Validation | Catch errors early with clear messages |
| Shell completions | Better user experience |
| Environment variables | Configuration flexibility |

Building CLIs with Clap and Rust gives you fast, reliable tools that users enjoy working with. The compile-time guarantees catch errors before your users do, and the rich ecosystem means you can focus on your application logic rather than argument parsing boilerplate.

Start with a simple Parser struct, add arguments as you need them, and let Clap handle the complexity of parsing, validation, and help generation. Your users will appreciate the consistent, well-documented interface.

---

Building robust command-line tools is just one piece of running reliable software systems. When your CLI tools interact with services and APIs, you need visibility into their health and performance.

**[OneUptime](https://oneuptime.com)** provides complete observability for your infrastructure - monitoring, incident management, status pages, and more. Whether you are building developer tools, managing deployments, or running production services, OneUptime helps you catch issues before your users do. Check out the open-source project on [GitHub](https://github.com/OneUptime/oneuptime) and start monitoring your systems today.

# How to Build a CLI Tool in Go with Cobra

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, CLI, Cobra, Command Line, DevOps

Description: Build professional CLI tools in Go using Cobra with commands, flags, configuration files, and automatic shell completion.

---

Command-line interface (CLI) tools are essential in the DevOps ecosystem. From kubectl to docker, the best CLI tools share common patterns: intuitive commands, helpful flags, configuration files, and shell completion. Cobra is the Go library that powers many of these tools, and in this guide, you will learn how to build professional CLI tools using Cobra.

## Why Cobra?

Cobra is a library for creating powerful modern CLI applications in Go. It is used by Kubernetes, Hugo, GitHub CLI, and many other popular projects. Cobra provides:

- Easy subcommand-based CLIs
- Fully POSIX-compliant flags (including short and long versions)
- Nested subcommands
- Global, local, and persistent flags
- Automatic help generation
- Shell completions for Bash, Zsh, Fish, and PowerShell
- Man page generation
- Integration with Viper for configuration

## Prerequisites

Before starting, ensure you have:

- Go 1.21 or later installed
- Basic familiarity with Go programming
- A terminal with your preferred shell

## Project Setup

Let's build a CLI tool called `taskctl` that manages tasks. First, create your project directory and initialize the Go module.

```bash
mkdir taskctl
cd taskctl
go mod init github.com/yourusername/taskctl
```

Install Cobra and Viper dependencies.

```bash
go get -u github.com/spf13/cobra@latest
go get -u github.com/spf13/viper@latest
```

## Project Structure

A well-organized Cobra project follows a specific structure. This layout separates concerns and makes the codebase maintainable.

```
taskctl/
├── cmd/
│   ├── root.go           # Root command and global configuration
│   ├── add.go            # Add task subcommand
│   ├── list.go           # List tasks subcommand
│   ├── complete.go       # Mark task complete subcommand
│   ├── delete.go         # Delete task subcommand
│   └── completion.go     # Shell completion subcommand
├── internal/
│   └── task/
│       └── task.go       # Task business logic
├── main.go               # Entry point
├── go.mod
└── go.sum
```

## The Main Entry Point

The main.go file is minimal. It simply calls the root command's Execute function.

```go
// main.go
// Entry point for the taskctl CLI application.
// The main function delegates all work to the cmd package.
package main

import "github.com/yourusername/taskctl/cmd"

func main() {
    cmd.Execute()
}
```

## Building the Root Command

The root command is the base of your CLI. It defines global behavior, persistent flags, and configuration loading.

```go
// cmd/root.go
// Root command configuration and initialization.
// This file sets up the base command, global flags, and Viper configuration.
package cmd

import (
    "fmt"
    "os"
    "path/filepath"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var (
    // cfgFile holds the path to the configuration file
    cfgFile string

    // verbose enables detailed output when true
    verbose bool

    // dataDir specifies where task data is stored
    dataDir string
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
    Use:   "taskctl",
    Short: "A task management CLI tool",
    Long: `taskctl is a command-line task management tool built with Cobra.

It allows you to create, list, complete, and delete tasks from your terminal.
Tasks are stored locally and can be configured via command-line flags or
a configuration file.

Example usage:
  taskctl add "Complete the project documentation"
  taskctl list
  taskctl complete 1
  taskctl delete 1`,

    // PersistentPreRun executes before any subcommand runs
    // Use this for setup that applies to all commands
    PersistentPreRun: func(cmd *cobra.Command, args []string) {
        if verbose {
            fmt.Println("Verbose mode enabled")
        }
    },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once.
func Execute() {
    if err := rootCmd.Execute(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}

func init() {
    // cobra.OnInitialize runs before any command execution
    // Perfect for loading configuration files
    cobra.OnInitialize(initConfig)

    // Persistent flags are available to this command and all subcommands
    rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "",
        "config file (default is $HOME/.taskctl.yaml)")

    rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false,
        "enable verbose output")

    rootCmd.PersistentFlags().StringVar(&dataDir, "data-dir", "",
        "directory for storing task data")

    // Bind flags to Viper for configuration file support
    viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
    viper.BindPFlag("data-dir", rootCmd.PersistentFlags().Lookup("data-dir"))
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
    if cfgFile != "" {
        // Use config file from the flag
        viper.SetConfigFile(cfgFile)
    } else {
        // Find home directory
        home, err := os.UserHomeDir()
        cobra.CheckErr(err)

        // Search for config in home directory with name ".taskctl" (without extension)
        viper.AddConfigPath(home)
        viper.AddConfigPath(".")
        viper.SetConfigType("yaml")
        viper.SetConfigName(".taskctl")
    }

    // Read in environment variables that match
    // Environment variables are prefixed with TASKCTL_
    viper.SetEnvPrefix("TASKCTL")
    viper.AutomaticEnv()

    // If a config file is found, read it in
    if err := viper.ReadInConfig(); err == nil {
        if verbose {
            fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
        }
    }

    // Set default values
    if dataDir == "" {
        dataDir = viper.GetString("data-dir")
        if dataDir == "" {
            home, _ := os.UserHomeDir()
            dataDir = filepath.Join(home, ".taskctl", "data")
        }
    }
}
```

## Creating Subcommands

Subcommands extend the functionality of your CLI. Each subcommand is defined in its own file for better organization.

### The Add Command

The add command creates new tasks. It demonstrates required arguments and flag usage.

```go
// cmd/add.go
// Add command implementation for creating new tasks.
// Supports priority levels and optional due dates.
package cmd

import (
    "fmt"
    "time"

    "github.com/spf13/cobra"
)

var (
    // priority sets the task priority level (1-5)
    priority int

    // dueDate specifies when the task should be completed
    dueDate string

    // tags allows categorizing tasks
    tags []string
)

var addCmd = &cobra.Command{
    Use:   "add [task description]",
    Short: "Add a new task",
    Long: `Add a new task to your task list.

The task description is required and should describe what needs to be done.
You can optionally set a priority level (1-5, where 1 is highest) and a due date.

Examples:
  taskctl add "Write documentation"
  taskctl add "Fix critical bug" --priority 1
  taskctl add "Review PR" --due 2024-12-31 --tags review,code`,

    // Args validates the number of arguments
    // ExactArgs(1) ensures exactly one argument is provided
    Args: cobra.ExactArgs(1),

    // RunE is like Run but returns an error
    // Use RunE when your command can fail
    RunE: func(cmd *cobra.Command, args []string) error {
        description := args[0]

        // Validate priority range
        if priority < 1 || priority > 5 {
            return fmt.Errorf("priority must be between 1 and 5, got %d", priority)
        }

        // Parse due date if provided
        var due time.Time
        var err error
        if dueDate != "" {
            due, err = time.Parse("2006-01-02", dueDate)
            if err != nil {
                return fmt.Errorf("invalid date format, use YYYY-MM-DD: %w", err)
            }
        }

        // Create the task (simplified for demonstration)
        task := map[string]interface{}{
            "description": description,
            "priority":    priority,
            "due":         due,
            "tags":        tags,
            "created":     time.Now(),
            "completed":   false,
        }

        if verbose {
            fmt.Printf("Creating task: %+v\n", task)
        }

        fmt.Printf("Task added: %s\n", description)
        return nil
    },
}

func init() {
    // Add this command as a subcommand of root
    rootCmd.AddCommand(addCmd)

    // Local flags are only available to this command
    addCmd.Flags().IntVarP(&priority, "priority", "p", 3,
        "task priority (1-5, where 1 is highest)")

    addCmd.Flags().StringVarP(&dueDate, "due", "d", "",
        "due date in YYYY-MM-DD format")

    // StringSliceVarP allows multiple values: --tags a,b or --tags a --tags b
    addCmd.Flags().StringSliceVarP(&tags, "tags", "t", []string{},
        "comma-separated list of tags")
}
```

### The List Command

The list command displays tasks with filtering and output format options.

```go
// cmd/list.go
// List command implementation for displaying tasks.
// Supports filtering by status, priority, and output format selection.
package cmd

import (
    "encoding/json"
    "fmt"
    "os"
    "text/tabwriter"

    "github.com/spf13/cobra"
)

var (
    // showCompleted includes completed tasks in the output
    showCompleted bool

    // filterPriority shows only tasks with this priority
    filterPriority int

    // outputFormat specifies the output format (table, json, simple)
    outputFormat string

    // limit restricts the number of tasks shown
    limit int
)

var listCmd = &cobra.Command{
    Use:   "list",
    Short: "List all tasks",
    Long: `Display all tasks in your task list.

By default, only incomplete tasks are shown. Use --all to include completed tasks.
You can filter by priority and choose different output formats.

Examples:
  taskctl list
  taskctl list --all
  taskctl list --priority 1
  taskctl list --format json
  taskctl list --limit 10`,

    Aliases: []string{"ls", "l"},

    RunE: func(cmd *cobra.Command, args []string) error {
        // Sample tasks for demonstration
        tasks := []map[string]interface{}{
            {"id": 1, "description": "Write documentation", "priority": 2, "completed": false},
            {"id": 2, "description": "Fix bug", "priority": 1, "completed": false},
            {"id": 3, "description": "Review PR", "priority": 3, "completed": true},
        }

        // Filter tasks based on flags
        var filtered []map[string]interface{}
        for _, task := range tasks {
            if !showCompleted && task["completed"].(bool) {
                continue
            }
            if filterPriority > 0 && task["priority"].(int) != filterPriority {
                continue
            }
            filtered = append(filtered, task)
        }

        // Apply limit
        if limit > 0 && len(filtered) > limit {
            filtered = filtered[:limit]
        }

        // Output based on format
        switch outputFormat {
        case "json":
            return outputJSON(filtered)
        case "simple":
            return outputSimple(filtered)
        default:
            return outputTable(filtered)
        }
    },
}

// outputTable prints tasks in a formatted table
func outputTable(tasks []map[string]interface{}) error {
    w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
    fmt.Fprintln(w, "ID\tDESCRIPTION\tPRIORITY\tSTATUS")
    fmt.Fprintln(w, "--\t-----------\t--------\t------")

    for _, task := range tasks {
        status := "pending"
        if task["completed"].(bool) {
            status = "done"
        }
        fmt.Fprintf(w, "%d\t%s\t%d\t%s\n",
            task["id"].(int),
            task["description"].(string),
            task["priority"].(int),
            status,
        )
    }
    return w.Flush()
}

// outputJSON prints tasks as JSON
func outputJSON(tasks []map[string]interface{}) error {
    encoder := json.NewEncoder(os.Stdout)
    encoder.SetIndent("", "  ")
    return encoder.Encode(tasks)
}

// outputSimple prints tasks one per line
func outputSimple(tasks []map[string]interface{}) error {
    for _, task := range tasks {
        fmt.Printf("[%d] %s\n", task["id"].(int), task["description"].(string))
    }
    return nil
}

func init() {
    rootCmd.AddCommand(listCmd)

    listCmd.Flags().BoolVarP(&showCompleted, "all", "a", false,
        "show all tasks including completed")

    listCmd.Flags().IntVarP(&filterPriority, "priority", "p", 0,
        "filter by priority level")

    listCmd.Flags().StringVarP(&outputFormat, "format", "f", "table",
        "output format (table, json, simple)")

    listCmd.Flags().IntVarP(&limit, "limit", "n", 0,
        "limit number of tasks shown")
}
```

### The Complete Command

The complete command marks tasks as done. It shows how to handle positional arguments.

```go
// cmd/complete.go
// Complete command implementation for marking tasks as done.
// Accepts task IDs as arguments.
package cmd

import (
    "fmt"
    "strconv"

    "github.com/spf13/cobra"
)

var completeCmd = &cobra.Command{
    Use:   "complete [task IDs...]",
    Short: "Mark tasks as complete",
    Long: `Mark one or more tasks as complete.

Provide the task ID(s) to mark as done. You can mark multiple tasks
at once by providing multiple IDs.

Examples:
  taskctl complete 1
  taskctl complete 1 2 3
  taskctl complete $(taskctl list --format simple | grep "urgent" | cut -d']' -f1 | tr -d '[')`,

    Aliases: []string{"done", "finish"},

    // MinimumNArgs ensures at least one argument is provided
    Args: cobra.MinimumNArgs(1),

    RunE: func(cmd *cobra.Command, args []string) error {
        var completed []int
        var errors []string

        for _, arg := range args {
            id, err := strconv.Atoi(arg)
            if err != nil {
                errors = append(errors, fmt.Sprintf("invalid task ID: %s", arg))
                continue
            }

            // Here you would actually update the task in your data store
            completed = append(completed, id)
            fmt.Printf("Task %d marked as complete\n", id)
        }

        if len(errors) > 0 {
            for _, e := range errors {
                fmt.Fprintln(os.Stderr, e)
            }
            if len(completed) == 0 {
                return fmt.Errorf("no tasks were completed")
            }
        }

        if verbose && len(completed) > 0 {
            fmt.Printf("Successfully completed %d task(s)\n", len(completed))
        }

        return nil
    },
}

func init() {
    rootCmd.AddCommand(completeCmd)
}
```

### The Delete Command

The delete command removes tasks with a confirmation flag for safety.

```go
// cmd/delete.go
// Delete command implementation for removing tasks.
// Includes a force flag to skip confirmation.
package cmd

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"

    "github.com/spf13/cobra"
)

var (
    // force skips confirmation prompt
    force bool
)

var deleteCmd = &cobra.Command{
    Use:   "delete [task ID]",
    Short: "Delete a task",
    Long: `Delete a task from your task list.

By default, you will be prompted to confirm the deletion.
Use --force to skip the confirmation prompt.

Examples:
  taskctl delete 1
  taskctl delete 1 --force`,

    Aliases: []string{"rm", "remove"},

    Args: cobra.ExactArgs(1),

    RunE: func(cmd *cobra.Command, args []string) error {
        id, err := strconv.Atoi(args[0])
        if err != nil {
            return fmt.Errorf("invalid task ID: %s", args[0])
        }

        // Confirm deletion unless force flag is set
        if !force {
            fmt.Printf("Are you sure you want to delete task %d? [y/N]: ", id)
            reader := bufio.NewReader(os.Stdin)
            response, err := reader.ReadString('\n')
            if err != nil {
                return fmt.Errorf("failed to read response: %w", err)
            }

            response = strings.ToLower(strings.TrimSpace(response))
            if response != "y" && response != "yes" {
                fmt.Println("Deletion cancelled")
                return nil
            }
        }

        // Here you would actually delete the task from your data store
        fmt.Printf("Task %d deleted\n", id)
        return nil
    },
}

func init() {
    rootCmd.AddCommand(deleteCmd)

    deleteCmd.Flags().BoolVarP(&force, "force", "f", false,
        "skip confirmation prompt")
}
```

## Required Flags and Validation

Sometimes flags are mandatory. Cobra provides built-in support for required flags.

```go
// cmd/export.go
// Export command demonstrating required flags and custom validation.
package cmd

import (
    "fmt"
    "os"
    "path/filepath"

    "github.com/spf13/cobra"
)

var (
    exportPath   string
    exportFormat string
)

var exportCmd = &cobra.Command{
    Use:   "export",
    Short: "Export tasks to a file",
    Long: `Export all tasks to a file in the specified format.

The --output flag is required and specifies the destination file.
Supported formats: json, csv, yaml

Examples:
  taskctl export --output tasks.json
  taskctl export --output tasks.csv --format csv`,

    // PreRunE runs before RunE and is perfect for validation
    PreRunE: func(cmd *cobra.Command, args []string) error {
        // Validate export format
        validFormats := map[string]bool{"json": true, "csv": true, "yaml": true}
        if !validFormats[exportFormat] {
            return fmt.Errorf("invalid format %q, must be one of: json, csv, yaml", exportFormat)
        }

        // Ensure output directory exists
        dir := filepath.Dir(exportPath)
        if dir != "." {
            if _, err := os.Stat(dir); os.IsNotExist(err) {
                return fmt.Errorf("output directory does not exist: %s", dir)
            }
        }

        return nil
    },

    RunE: func(cmd *cobra.Command, args []string) error {
        fmt.Printf("Exporting tasks to %s in %s format\n", exportPath, exportFormat)
        // Implementation would go here
        return nil
    },
}

func init() {
    rootCmd.AddCommand(exportCmd)

    exportCmd.Flags().StringVarP(&exportPath, "output", "o", "",
        "output file path (required)")
    exportCmd.Flags().StringVarP(&exportFormat, "format", "f", "json",
        "export format (json, csv, yaml)")

    // Mark the output flag as required
    // Cobra will automatically return an error if not provided
    exportCmd.MarkFlagRequired("output")
}
```

## Viper Integration for Configuration

Viper allows users to set defaults via configuration files, environment variables, or flags. Here is a comprehensive configuration setup.

```go
// Example configuration file: ~/.taskctl.yaml
// This YAML file shows all available configuration options.
/*
# Default priority for new tasks
default-priority: 2

# Directory for storing task data
data-dir: ~/.taskctl/data

# Enable verbose output by default
verbose: false

# Default output format for list command
output-format: table

# Default number of tasks to show
list-limit: 20

# Color settings
colors:
  enabled: true
  priority-high: red
  priority-medium: yellow
  priority-low: green

# Integration settings
integrations:
  slack:
    enabled: false
    webhook: ""
  email:
    enabled: false
    address: ""
*/
```

```go
// cmd/config.go
// Configuration management commands.
// Allows viewing and setting configuration values.
package cmd

import (
    "fmt"
    "os"
    "path/filepath"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
    "gopkg.in/yaml.v3"
)

var configCmd = &cobra.Command{
    Use:   "config",
    Short: "Manage configuration",
    Long:  `View and modify taskctl configuration settings.`,
}

var configViewCmd = &cobra.Command{
    Use:   "view",
    Short: "View current configuration",
    RunE: func(cmd *cobra.Command, args []string) error {
        settings := viper.AllSettings()

        output, err := yaml.Marshal(settings)
        if err != nil {
            return fmt.Errorf("failed to marshal config: %w", err)
        }

        fmt.Println("Current configuration:")
        fmt.Println(string(output))

        if viper.ConfigFileUsed() != "" {
            fmt.Printf("Configuration file: %s\n", viper.ConfigFileUsed())
        }

        return nil
    },
}

var configSetCmd = &cobra.Command{
    Use:   "set [key] [value]",
    Short: "Set a configuration value",
    Args:  cobra.ExactArgs(2),
    RunE: func(cmd *cobra.Command, args []string) error {
        key := args[0]
        value := args[1]

        viper.Set(key, value)

        // Write to config file
        configPath := viper.ConfigFileUsed()
        if configPath == "" {
            home, _ := os.UserHomeDir()
            configPath = filepath.Join(home, ".taskctl.yaml")
        }

        if err := viper.WriteConfigAs(configPath); err != nil {
            return fmt.Errorf("failed to write config: %w", err)
        }

        fmt.Printf("Set %s = %s\n", key, value)
        return nil
    },
}

var configInitCmd = &cobra.Command{
    Use:   "init",
    Short: "Initialize configuration file with defaults",
    RunE: func(cmd *cobra.Command, args []string) error {
        home, err := os.UserHomeDir()
        if err != nil {
            return err
        }

        configPath := filepath.Join(home, ".taskctl.yaml")

        // Check if config already exists
        if _, err := os.Stat(configPath); err == nil {
            return fmt.Errorf("configuration file already exists: %s", configPath)
        }

        // Set default values
        viper.SetDefault("default-priority", 3)
        viper.SetDefault("data-dir", filepath.Join(home, ".taskctl", "data"))
        viper.SetDefault("verbose", false)
        viper.SetDefault("output-format", "table")
        viper.SetDefault("list-limit", 20)
        viper.SetDefault("colors.enabled", true)

        if err := viper.SafeWriteConfigAs(configPath); err != nil {
            return fmt.Errorf("failed to write config: %w", err)
        }

        fmt.Printf("Configuration file created: %s\n", configPath)
        return nil
    },
}

func init() {
    rootCmd.AddCommand(configCmd)
    configCmd.AddCommand(configViewCmd)
    configCmd.AddCommand(configSetCmd)
    configCmd.AddCommand(configInitCmd)
}
```

## Shell Completion

Shell completion is essential for a good user experience. Cobra has built-in support for generating completion scripts.

```go
// cmd/completion.go
// Shell completion script generation.
// Supports Bash, Zsh, Fish, and PowerShell.
package cmd

import (
    "os"

    "github.com/spf13/cobra"
)

var completionCmd = &cobra.Command{
    Use:   "completion [bash|zsh|fish|powershell]",
    Short: "Generate shell completion scripts",
    Long: `Generate shell completion scripts for taskctl.

To load completions:

Bash:
  $ source <(taskctl completion bash)

  # To load completions for each session, execute once:
  # Linux:
  $ taskctl completion bash > /etc/bash_completion.d/taskctl
  # macOS:
  $ taskctl completion bash > $(brew --prefix)/etc/bash_completion.d/taskctl

Zsh:
  # If shell completion is not already enabled in your environment,
  # you will need to enable it. Execute the following once:
  $ echo "autoload -U compinit; compinit" >> ~/.zshrc

  # To load completions for each session, execute once:
  $ taskctl completion zsh > "${fpath[1]}/_taskctl"

  # You will need to start a new shell for this setup to take effect.

Fish:
  $ taskctl completion fish | source

  # To load completions for each session, execute once:
  $ taskctl completion fish > ~/.config/fish/completions/taskctl.fish

PowerShell:
  PS> taskctl completion powershell | Out-String | Invoke-Expression

  # To load completions for every new session, run:
  PS> taskctl completion powershell > taskctl.ps1
  # and source this file from your PowerShell profile.
`,
    DisableFlagsInUseLine: true,
    ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
    Args:                  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
    Run: func(cmd *cobra.Command, args []string) {
        switch args[0] {
        case "bash":
            cmd.Root().GenBashCompletion(os.Stdout)
        case "zsh":
            cmd.Root().GenZshCompletion(os.Stdout)
        case "fish":
            cmd.Root().GenFishCompletion(os.Stdout, true)
        case "powershell":
            cmd.Root().GenPowerShellCompletionWithDesc(os.Stdout)
        }
    },
}

func init() {
    rootCmd.AddCommand(completionCmd)
}
```

### Custom Completions

You can provide dynamic completions for specific flags and arguments.

```go
// cmd/custom_completion.go
// Custom completion functions for dynamic suggestions.
package cmd

import (
    "github.com/spf13/cobra"
)

// RegisterCustomCompletions adds custom completion functions to commands.
// Call this from init() in root.go after all commands are registered.
func RegisterCustomCompletions() {
    // Custom completion for add command tags
    addCmd.RegisterFlagCompletionFunc("tags", func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        // Return common tags as suggestions
        // In a real application, you might fetch these from a database
        tags := []string{
            "urgent",
            "important",
            "review",
            "documentation",
            "bug",
            "feature",
            "testing",
            "deployment",
        }
        return tags, cobra.ShellCompDirectiveNoFileComp
    })

    // Custom completion for list format flag
    listCmd.RegisterFlagCompletionFunc("format", func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        formats := []string{"table", "json", "simple"}
        return formats, cobra.ShellCompDirectiveNoFileComp
    })

    // Custom completion for complete command arguments (task IDs)
    completeCmd.ValidArgsFunction = func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        // In a real application, return pending task IDs
        return []string{"1\tWrite documentation", "2\tFix bug", "3\tReview PR"}, cobra.ShellCompDirectiveNoFileComp
    }

    // Custom completion for delete command
    deleteCmd.ValidArgsFunction = func(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
        if len(args) != 0 {
            // Only complete one argument
            return nil, cobra.ShellCompDirectiveNoFileComp
        }
        // Return all task IDs
        return []string{"1", "2", "3"}, cobra.ShellCompDirectiveNoFileComp
    }
}
```

## Man Page Generation

Cobra can generate man pages for Unix systems. This is useful for distributing your CLI tool.

```go
// cmd/docs.go
// Documentation generation commands.
// Generates man pages and markdown documentation.
package cmd

import (
    "fmt"
    "os"
    "path/filepath"

    "github.com/spf13/cobra"
    "github.com/spf13/cobra/doc"
)

var docsCmd = &cobra.Command{
    Use:    "docs",
    Short:  "Generate documentation",
    Hidden: true, // Hide from regular help
}

var manCmd = &cobra.Command{
    Use:   "man [output-dir]",
    Short: "Generate man pages",
    Long: `Generate man pages for taskctl and all subcommands.

The man pages are generated in the specified output directory.
Default output directory is ./man/

Examples:
  taskctl docs man
  taskctl docs man /usr/local/share/man/man1`,

    Args: cobra.MaximumNArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        outputDir := "./man"
        if len(args) > 0 {
            outputDir = args[0]
        }

        // Create output directory if it doesn't exist
        if err := os.MkdirAll(outputDir, 0755); err != nil {
            return fmt.Errorf("failed to create output directory: %w", err)
        }

        header := &doc.GenManHeader{
            Title:   "TASKCTL",
            Section: "1",
            Source:  "taskctl",
            Manual:  "User Commands",
        }

        if err := doc.GenManTree(rootCmd, header, outputDir); err != nil {
            return fmt.Errorf("failed to generate man pages: %w", err)
        }

        fmt.Printf("Man pages generated in %s\n", outputDir)
        return nil
    },
}

var markdownCmd = &cobra.Command{
    Use:   "markdown [output-dir]",
    Short: "Generate markdown documentation",
    Long: `Generate markdown documentation for taskctl and all subcommands.

The markdown files are generated in the specified output directory.
Default output directory is ./docs/

Examples:
  taskctl docs markdown
  taskctl docs markdown ./documentation`,

    Args: cobra.MaximumNArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        outputDir := "./docs"
        if len(args) > 0 {
            outputDir = args[0]
        }

        if err := os.MkdirAll(outputDir, 0755); err != nil {
            return fmt.Errorf("failed to create output directory: %w", err)
        }

        if err := doc.GenMarkdownTree(rootCmd, outputDir); err != nil {
            return fmt.Errorf("failed to generate markdown docs: %w", err)
        }

        fmt.Printf("Markdown documentation generated in %s\n", outputDir)
        return nil
    },
}

func init() {
    rootCmd.AddCommand(docsCmd)
    docsCmd.AddCommand(manCmd)
    docsCmd.AddCommand(markdownCmd)
}
```

## Advanced Patterns

### Command Groups

Organize related commands into logical groups for better help output.

```go
// cmd/groups.go
// Command grouping for better organization in help output.
package cmd

import "github.com/spf13/cobra"

func init() {
    // Create command groups
    rootCmd.AddGroup(&cobra.Group{
        ID:    "task",
        Title: "Task Commands:",
    })

    rootCmd.AddGroup(&cobra.Group{
        ID:    "config",
        Title: "Configuration Commands:",
    })

    rootCmd.AddGroup(&cobra.Group{
        ID:    "util",
        Title: "Utility Commands:",
    })

    // Assign commands to groups
    addCmd.GroupID = "task"
    listCmd.GroupID = "task"
    completeCmd.GroupID = "task"
    deleteCmd.GroupID = "task"

    configCmd.GroupID = "config"

    completionCmd.GroupID = "util"
    docsCmd.GroupID = "util"
}
```

### Middleware Pattern with PersistentPreRun

Use persistent hooks to implement middleware patterns.

```go
// cmd/middleware.go
// Middleware pattern implementation using Cobra hooks.
// Demonstrates authentication and logging middleware.
package cmd

import (
    "fmt"
    "os"
    "time"

    "github.com/spf13/cobra"
)

// setupMiddleware configures persistent hooks for all commands.
// Call this from root.go's init() function.
func setupMiddleware() {
    // Store the original PersistentPreRunE if it exists
    originalPreRun := rootCmd.PersistentPreRunE

    rootCmd.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
        // Timing middleware
        start := time.Now()

        // Defer the timing log
        defer func() {
            if verbose {
                fmt.Fprintf(os.Stderr, "Command took %v\n", time.Since(start))
            }
        }()

        // Check for required environment variables
        if os.Getenv("TASKCTL_DEBUG") == "1" {
            fmt.Fprintf(os.Stderr, "Debug mode enabled\n")
            fmt.Fprintf(os.Stderr, "Command: %s\n", cmd.Name())
            fmt.Fprintf(os.Stderr, "Args: %v\n", args)
        }

        // Run original PreRunE if it exists
        if originalPreRun != nil {
            return originalPreRun(cmd, args)
        }

        return nil
    }
}
```

### Error Handling

Implement consistent error handling across all commands.

```go
// cmd/errors.go
// Custom error types and handling for consistent error messages.
package cmd

import (
    "errors"
    "fmt"
    "os"

    "github.com/spf13/cobra"
)

// TaskError represents a task-related error
type TaskError struct {
    ID      int
    Op      string
    Message string
    Err     error
}

func (e *TaskError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s task %d: %s: %v", e.Op, e.ID, e.Message, e.Err)
    }
    return fmt.Sprintf("%s task %d: %s", e.Op, e.ID, e.Message)
}

func (e *TaskError) Unwrap() error {
    return e.Err
}

// Common errors
var (
    ErrTaskNotFound = errors.New("task not found")
    ErrInvalidID    = errors.New("invalid task ID")
    ErrNoTasks      = errors.New("no tasks found")
)

// handleError provides consistent error output
func handleError(cmd *cobra.Command, err error) {
    if err == nil {
        return
    }

    var taskErr *TaskError
    if errors.As(err, &taskErr) {
        fmt.Fprintf(os.Stderr, "Error: %s\n", taskErr.Error())
        if verbose && taskErr.Err != nil {
            fmt.Fprintf(os.Stderr, "Cause: %v\n", taskErr.Err)
        }
    } else {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
    }
}
```

## Building and Installing

Build your CLI tool and install it system-wide.

```bash
# Build the binary
go build -o taskctl .

# Install to GOPATH/bin
go install .

# Or install to a specific location
go build -o /usr/local/bin/taskctl .
```

## Testing Your CLI

Write tests for your commands using Cobra's testing utilities.

```go
// cmd/root_test.go
// Tests for CLI commands.
package cmd

import (
    "bytes"
    "strings"
    "testing"
)

func TestRootCommand(t *testing.T) {
    cmd := rootCmd
    buf := new(bytes.Buffer)
    cmd.SetOut(buf)
    cmd.SetErr(buf)
    cmd.SetArgs([]string{"--help"})

    err := cmd.Execute()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    output := buf.String()
    if !strings.Contains(output, "taskctl") {
        t.Errorf("expected output to contain 'taskctl', got: %s", output)
    }
}

func TestAddCommand(t *testing.T) {
    tests := []struct {
        name    string
        args    []string
        wantErr bool
    }{
        {
            name:    "valid task",
            args:    []string{"add", "Test task"},
            wantErr: false,
        },
        {
            name:    "missing description",
            args:    []string{"add"},
            wantErr: true,
        },
        {
            name:    "invalid priority",
            args:    []string{"add", "Test", "--priority", "10"},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            cmd := rootCmd
            buf := new(bytes.Buffer)
            cmd.SetOut(buf)
            cmd.SetErr(buf)
            cmd.SetArgs(tt.args)

            err := cmd.Execute()
            if (err != nil) != tt.wantErr {
                t.Errorf("Execute() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

## Conclusion

Building CLI tools with Cobra and Viper provides a professional foundation for command-line applications. The key takeaways are:

1. **Structure matters**: Organize commands into separate files for maintainability
2. **Use persistent flags**: For global options that apply to all commands
3. **Validate early**: Use PreRunE for validation before command execution
4. **Integrate Viper**: Allow configuration via files, environment variables, and flags
5. **Provide completions**: Shell completion significantly improves user experience
6. **Document thoroughly**: Generate man pages and markdown documentation

With these patterns, you can build CLI tools that match the quality and usability of industry-standard tools like kubectl, docker, and the GitHub CLI.

## Further Reading

- [Cobra Documentation](https://cobra.dev/)
- [Viper Documentation](https://github.com/spf13/viper)
- [Go CLI Best Practices](https://clig.dev/)
- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46)

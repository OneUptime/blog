# How to Build a Plugin System with Go's plugin Package

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Plugins, Extensibility, Architecture, Dynamic Loading

Description: Learn how to build extensible Go applications using the native plugin package for dynamic loading, including practical patterns, interface design, and production considerations.

---

Go's `plugin` package lets you load compiled code at runtime, enabling extensible applications where users can add functionality without recompiling the main program. Think of it like browser extensions or IDE plugins - the core application ships with a contract, and third parties implement that contract in separate modules.

This approach works well for applications like monitoring tools that need custom integrations, build systems with pluggable compilers, or any system where you want users to extend behavior without forking your codebase.

## How Go Plugins Work

A Go plugin is a shared object file (`.so`) compiled with `-buildmode=plugin`. The main application loads this file at runtime and accesses exported symbols - functions and variables with uppercase names. Both the plugin and the main application must be compiled with the same Go version on the same platform.

Here's the basic flow:

1. Define a contract (interface) in your main application
2. Plugin authors implement that interface
3. The plugin exports a function or variable that returns the implementation
4. Your application loads the plugin and type-asserts to your interface

## Defining the Plugin Contract

Start by defining what plugins can do. A clean interface is critical - it becomes your API that plugin authors must implement.

```go
// plugin_contract.go - This file is shared with plugin authors
package contract

// Plugin defines what every plugin must implement.
// Keep this interface focused and stable - changes break all plugins.
type Plugin interface {
    // Name returns a unique identifier for this plugin
    Name() string

    // Initialize is called once when the plugin loads.
    // Config contains plugin-specific settings from the host application.
    Initialize(config map[string]interface{}) error

    // Execute runs the plugin's main logic.
    // The context allows cancellation, data is plugin-specific input.
    Execute(ctx context.Context, data interface{}) (interface{}, error)

    // Shutdown is called before the plugin unloads.
    // Use this for cleanup - closing connections, flushing buffers, etc.
    Shutdown() error
}

// PluginInfo contains metadata about a plugin.
// This helps with discovery and version compatibility checks.
type PluginInfo struct {
    Name        string
    Version     string
    Description string
    Author      string
}
```

## Building a Plugin

Plugin authors import your contract and implement the interface. The crucial part is exporting a symbol that the host application can find.

```go
// plugins/logger/main.go
package main

import (
    "context"
    "fmt"
    "os"

    "yourapp/contract"
)

// LoggerPlugin writes execution data to a file.
// It demonstrates a simple but useful plugin pattern.
type LoggerPlugin struct {
    outputFile *os.File
    level      string
}

// Name identifies this plugin uniquely.
func (p *LoggerPlugin) Name() string {
    return "file-logger"
}

// Initialize opens the log file based on configuration.
// Config expects "path" (string) and optionally "level" (string).
func (p *LoggerPlugin) Initialize(config map[string]interface{}) error {
    // Extract path from config with type checking
    path, ok := config["path"].(string)
    if !ok {
        return fmt.Errorf("missing or invalid 'path' in config")
    }

    // Open file for appending, create if missing
    f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return fmt.Errorf("failed to open log file: %w", err)
    }

    p.outputFile = f

    // Optional log level, defaults to "info"
    if level, ok := config["level"].(string); ok {
        p.level = level
    } else {
        p.level = "info"
    }

    return nil
}

// Execute writes the data to the log file.
// Respects context cancellation for long operations.
func (p *LoggerPlugin) Execute(ctx context.Context, data interface{}) (interface{}, error) {
    // Check if we should abort
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }

    // Format and write the log entry
    entry := fmt.Sprintf("[%s] %v\n", p.level, data)
    _, err := p.outputFile.WriteString(entry)
    if err != nil {
        return nil, fmt.Errorf("write failed: %w", err)
    }

    return len(entry), nil
}

// Shutdown closes the file handle.
func (p *LoggerPlugin) Shutdown() error {
    if p.outputFile != nil {
        return p.outputFile.Close()
    }
    return nil
}

// CRITICAL: This exported variable is how the host finds your plugin.
// The name "PluginInstance" must match what the host expects.
// Using a variable (not a function) keeps the API simple.
var PluginInstance contract.Plugin = &LoggerPlugin{}
```

Compile the plugin as a shared object:

```bash
# Build the plugin - must use -buildmode=plugin
go build -buildmode=plugin -o plugins/logger.so plugins/logger/main.go
```

## Loading Plugins in Your Application

The host application discovers and loads plugins, then manages their lifecycle.

```go
// plugin_manager.go
package main

import (
    "context"
    "fmt"
    "os"
    "path/filepath"
    "plugin"
    "sync"

    "yourapp/contract"
)

// PluginManager handles loading, executing, and unloading plugins.
type PluginManager struct {
    plugins map[string]contract.Plugin
    mu      sync.RWMutex
}

// NewPluginManager creates a manager ready to load plugins.
func NewPluginManager() *PluginManager {
    return &PluginManager{
        plugins: make(map[string]contract.Plugin),
    }
}

// LoadPlugin loads a single plugin from a .so file.
// The symbolName parameter specifies which exported symbol contains the plugin.
func (pm *PluginManager) LoadPlugin(path string, symbolName string) error {
    // Open the shared object file
    p, err := plugin.Open(path)
    if err != nil {
        return fmt.Errorf("failed to open plugin %s: %w", path, err)
    }

    // Look up the exported symbol by name
    sym, err := p.Lookup(symbolName)
    if err != nil {
        return fmt.Errorf("symbol %s not found in %s: %w", symbolName, path, err)
    }

    // Type assert to our interface
    // This is where version mismatches or bad plugins will fail
    plug, ok := sym.(*contract.Plugin)
    if !ok {
        return fmt.Errorf("symbol %s is not a Plugin (got %T)", symbolName, sym)
    }

    // Store the plugin, keyed by its self-reported name
    pm.mu.Lock()
    pm.plugins[(*plug).Name()] = *plug
    pm.mu.Unlock()

    return nil
}

// LoadPluginsFromDir discovers and loads all .so files in a directory.
// This enables drop-in plugin installation.
func (pm *PluginManager) LoadPluginsFromDir(dir string) error {
    entries, err := os.ReadDir(dir)
    if err != nil {
        return fmt.Errorf("failed to read plugin directory: %w", err)
    }

    for _, entry := range entries {
        if entry.IsDir() {
            continue
        }

        // Only load .so files
        if filepath.Ext(entry.Name()) != ".so" {
            continue
        }

        path := filepath.Join(dir, entry.Name())

        // Try to load with the standard symbol name
        if err := pm.LoadPlugin(path, "PluginInstance"); err != nil {
            // Log but don't fail - one bad plugin shouldn't break everything
            fmt.Printf("Warning: failed to load %s: %v\n", path, err)
            continue
        }

        fmt.Printf("Loaded plugin: %s\n", path)
    }

    return nil
}

// InitializeAll calls Initialize on every loaded plugin.
// Pass plugin-specific config keyed by plugin name.
func (pm *PluginManager) InitializeAll(configs map[string]map[string]interface{}) error {
    pm.mu.RLock()
    defer pm.mu.RUnlock()

    for name, plug := range pm.plugins {
        config := configs[name]
        if config == nil {
            config = make(map[string]interface{})
        }

        if err := plug.Initialize(config); err != nil {
            return fmt.Errorf("plugin %s initialization failed: %w", name, err)
        }
    }

    return nil
}

// Execute runs a specific plugin by name.
func (pm *PluginManager) Execute(ctx context.Context, pluginName string, data interface{}) (interface{}, error) {
    pm.mu.RLock()
    plug, exists := pm.plugins[pluginName]
    pm.mu.RUnlock()

    if !exists {
        return nil, fmt.Errorf("plugin %s not found", pluginName)
    }

    return plug.Execute(ctx, data)
}

// ShutdownAll gracefully shuts down all plugins.
// Call this before your application exits.
func (pm *PluginManager) ShutdownAll() {
    pm.mu.Lock()
    defer pm.mu.Unlock()

    for name, plug := range pm.plugins {
        if err := plug.Shutdown(); err != nil {
            fmt.Printf("Warning: plugin %s shutdown error: %v\n", name, err)
        }
    }
}
```

## Putting It Together

Here's how the main application uses the plugin manager:

```go
// main.go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Create the plugin manager
    pm := NewPluginManager()

    // Load all plugins from the plugins directory
    if err := pm.LoadPluginsFromDir("./plugins"); err != nil {
        fmt.Printf("Failed to load plugins: %v\n", err)
        os.Exit(1)
    }

    // Configure each plugin
    configs := map[string]map[string]interface{}{
        "file-logger": {
            "path":  "/var/log/myapp/plugins.log",
            "level": "debug",
        },
    }

    // Initialize all loaded plugins
    if err := pm.InitializeAll(configs); err != nil {
        fmt.Printf("Plugin initialization failed: %v\n", err)
        os.Exit(1)
    }

    // Set up graceful shutdown
    shutdown := make(chan os.Signal, 1)
    signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

    // Use plugins in your application logic
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := pm.Execute(ctx, "file-logger", "Application started successfully")
    if err != nil {
        fmt.Printf("Plugin execution failed: %v\n", err)
    } else {
        fmt.Printf("Plugin returned: %v\n", result)
    }

    // Wait for shutdown signal
    <-shutdown
    fmt.Println("Shutting down...")
    pm.ShutdownAll()
}
```

## Common Pitfalls

**Version Mismatch**: The plugin and host must be compiled with identical Go versions. A plugin built with Go 1.21 won't load in a host built with Go 1.22. Consider embedding version checks in your plugin contract.

**Platform Limitations**: Plugins only work on Linux, FreeBSD, and macOS. They don't work on Windows. If you need cross-platform support, consider alternatives like HashiCorp's go-plugin (uses RPC) or embedded scripting languages.

**No Unloading**: Once loaded, a plugin stays in memory until the process exits. You can't hot-reload plugins without restarting the application. Design your plugin lifecycle around this constraint.

**Symbol Naming**: The symbol name is case-sensitive. `pluginInstance` and `PluginInstance` are different. Stick to a documented convention.

**CGO Dependency**: The plugin package requires CGO. Set `CGO_ENABLED=1` when building both the host and plugins.

## Best Practices

**Version Your Contract**: Include a version number in your plugin interface. Check it at load time:

```go
type Plugin interface {
    Version() int  // Return 1 for v1 of your plugin API
    // ... other methods
}

// In your loader
if plug.Version() != 1 {
    return fmt.Errorf("unsupported plugin version: %d", plug.Version())
}
```

**Sandbox Plugin Operations**: Plugins run in your process with full access. Validate inputs, set timeouts, and consider resource limits:

```go
// Always use context with timeout for plugin execution
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

result, err := plugin.Execute(ctx, data)
```

**Document Your Contract**: Plugin authors need clear documentation. Include example plugins, explain every interface method, and document the config map structure.

**Consider Alternatives**: For many use cases, embedded scripting (Lua, JavaScript via goja) or RPC-based plugins (gRPC, net/rpc) offer better flexibility and safety. The native plugin package works best when you control both the host and plugins, and when you need maximum performance without serialization overhead.

## Summary

Go's plugin package enables dynamic extensibility for applications that need it. Define a stable interface, export a symbol for discovery, and manage the plugin lifecycle carefully. Watch out for version mismatches, platform limitations, and the inability to unload plugins. For production systems, pair plugins with proper validation, timeouts, and graceful error handling.

The pattern works well for build tools, monitoring systems, and internal platforms where you control the deployment environment. For public plugin ecosystems or Windows support, look at RPC-based alternatives that trade some performance for flexibility.

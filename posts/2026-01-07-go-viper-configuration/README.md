# How to Manage Configuration in Go with Viper

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Configuration, Viper, DevOps, Twelve-Factor

Description: Master configuration management in Go using Viper for environment variables, config files, remote config, and live reloading.

---

Configuration management is a critical aspect of building production-ready applications. Following the Twelve-Factor App methodology, configuration should be stored in the environment and separated from code. In Go, the Viper library has emerged as the de facto standard for configuration management, offering a comprehensive solution that handles environment variables, config files, remote configuration stores, and live reloading.

This guide covers everything you need to know about managing configuration in Go applications using Viper, from basic setup to advanced patterns used in production systems.

## Why Viper?

Viper provides a complete configuration solution for Go applications with these key features:

- **Multiple formats**: Support for JSON, TOML, YAML, HCL, envfile, and Java properties
- **Environment variables**: Automatic binding and prefix support
- **Live watching**: Reload configuration without restarting
- **Remote config**: Integration with etcd, Consul, and other key-value stores
- **Flag binding**: Integration with pflag for command-line flags
- **Type safety**: Strongly typed configuration access
- **Default values**: Fallback values when configuration is missing

## Installation

Install Viper using Go modules:

```bash
go get github.com/spf13/viper
```

For remote configuration support, you also need:

```bash
go get github.com/spf13/viper/remote
```

## Basic Setup and Usage

Let's start with a simple example that demonstrates Viper's core functionality.

### Initializing Viper

The following code shows how to create a basic Viper setup with defaults:

```go
package main

import (
    "fmt"
    "log"

    "github.com/spf13/viper"
)

func main() {
    // Set default values that will be used if not overridden
    viper.SetDefault("server.host", "localhost")
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("database.max_connections", 100)
    viper.SetDefault("log.level", "info")

    // Access configuration values
    host := viper.GetString("server.host")
    port := viper.GetInt("server.port")
    maxConn := viper.GetInt("database.max_connections")

    fmt.Printf("Server: %s:%d\n", host, port)
    fmt.Printf("Max DB Connections: %d\n", maxConn)
}
```

### Reading Configuration Files

Viper can read from configuration files in multiple formats. Here's how to set up file-based configuration:

```go
package main

import (
    "fmt"
    "log"

    "github.com/spf13/viper"
)

func initConfig() error {
    // Set the name of the config file (without extension)
    viper.SetConfigName("config")

    // Set the type of config file
    viper.SetConfigType("yaml")

    // Add paths where Viper should look for the config file
    viper.AddConfigPath(".")           // Current directory
    viper.AddConfigPath("./config")    // Config subdirectory
    viper.AddConfigPath("$HOME/.app")  // Home directory
    viper.AddConfigPath("/etc/app/")   // System config directory

    // Read the config file
    if err := viper.ReadInConfig(); err != nil {
        // Handle the case where config file is not found
        if _, ok := err.(viper.ConfigFileNotFoundError); ok {
            log.Println("No config file found, using defaults")
            return nil
        }
        return fmt.Errorf("error reading config file: %w", err)
    }

    log.Printf("Using config file: %s", viper.ConfigFileUsed())
    return nil
}

func main() {
    // Set defaults before reading config
    viper.SetDefault("server.host", "localhost")
    viper.SetDefault("server.port", 8080)

    if err := initConfig(); err != nil {
        log.Fatalf("Failed to initialize config: %v", err)
    }

    // Values from config file override defaults
    fmt.Printf("Host: %s\n", viper.GetString("server.host"))
    fmt.Printf("Port: %d\n", viper.GetInt("server.port"))
}
```

## Configuration File Formats

Viper supports multiple configuration file formats. Here are examples of each:

### YAML Configuration

YAML is the most popular format due to its readability:

```yaml
# config.yaml
server:
  host: 0.0.0.0
  port: 8080
  timeout: 30s

database:
  host: localhost
  port: 5432
  name: myapp
  user: admin
  password: ${DB_PASSWORD}  # Can reference env vars
  max_connections: 50

redis:
  host: localhost
  port: 6379
  db: 0

logging:
  level: debug
  format: json
  output: stdout

features:
  enable_cache: true
  enable_metrics: true
  rate_limit: 1000
```

### JSON Configuration

JSON is widely supported and works well with APIs:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 8080,
    "timeout": "30s"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp",
    "user": "admin",
    "max_connections": 50
  },
  "logging": {
    "level": "debug",
    "format": "json"
  }
}
```

### TOML Configuration

TOML provides a good balance between readability and structure:

```toml
# config.toml
[server]
host = "0.0.0.0"
port = 8080
timeout = "30s"

[database]
host = "localhost"
port = 5432
name = "myapp"
user = "admin"
max_connections = 50

[logging]
level = "debug"
format = "json"

[features]
enable_cache = true
enable_metrics = true
```

## Environment Variables

Environment variables are essential for containerized deployments and following Twelve-Factor principles.

### Basic Environment Variable Binding

This example shows how to bind environment variables with automatic prefix handling:

```go
package main

import (
    "fmt"
    "os"

    "github.com/spf13/viper"
)

func main() {
    // Set a prefix for all environment variables
    // APP_SERVER_PORT will map to server.port
    viper.SetEnvPrefix("APP")

    // Replace dots and dashes with underscores in env var names
    // server.port becomes APP_SERVER_PORT
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))

    // Automatically bind all existing env vars
    viper.AutomaticEnv()

    // Set defaults
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("database.host", "localhost")

    // Environment variables now override config file and defaults
    // Set APP_SERVER_PORT=9090 to override server.port
    fmt.Printf("Server Port: %d\n", viper.GetInt("server.port"))
    fmt.Printf("Database Host: %s\n", viper.GetString("database.host"))
}
```

### Explicit Environment Variable Binding

For more control, you can explicitly bind environment variables:

```go
package main

import (
    "fmt"
    "os"

    "github.com/spf13/viper"
)

func main() {
    // Bind specific config keys to specific env vars
    viper.BindEnv("database.password", "DB_PASSWORD")
    viper.BindEnv("api.key", "API_KEY")
    viper.BindEnv("server.port", "PORT")  // Common in cloud platforms

    // Set some environment variables for testing
    os.Setenv("DB_PASSWORD", "secret123")
    os.Setenv("PORT", "3000")

    fmt.Printf("DB Password: %s\n", viper.GetString("database.password"))
    fmt.Printf("Server Port: %d\n", viper.GetInt("server.port"))
}
```

## Type-Safe Configuration Access

Viper provides type-safe accessors to prevent runtime type errors.

### Available Type Accessors

Here's a comprehensive example of all type-safe accessors:

```go
package main

import (
    "fmt"
    "time"

    "github.com/spf13/viper"
)

func main() {
    // Set various configuration values
    viper.Set("string_val", "hello")
    viper.Set("int_val", 42)
    viper.Set("float_val", 3.14)
    viper.Set("bool_val", true)
    viper.Set("duration_val", "5m30s")
    viper.Set("slice_val", []string{"a", "b", "c"})
    viper.Set("map_val", map[string]interface{}{
        "key1": "value1",
        "key2": 123,
    })

    // String accessors
    str := viper.GetString("string_val")
    fmt.Printf("String: %s\n", str)

    // Integer accessors
    intVal := viper.GetInt("int_val")
    int32Val := viper.GetInt32("int_val")
    int64Val := viper.GetInt64("int_val")
    uintVal := viper.GetUint("int_val")
    fmt.Printf("Int: %d, Int32: %d, Int64: %d, Uint: %d\n",
        intVal, int32Val, int64Val, uintVal)

    // Float accessors
    float64Val := viper.GetFloat64("float_val")
    fmt.Printf("Float64: %f\n", float64Val)

    // Boolean accessor
    boolVal := viper.GetBool("bool_val")
    fmt.Printf("Bool: %v\n", boolVal)

    // Duration accessor - parses strings like "5m30s"
    duration := viper.GetDuration("duration_val")
    fmt.Printf("Duration: %v\n", duration)

    // Time accessor
    viper.Set("time_val", "2024-01-15T10:30:00Z")
    timeVal := viper.GetTime("time_val")
    fmt.Printf("Time: %v\n", timeVal)

    // Slice accessors
    stringSlice := viper.GetStringSlice("slice_val")
    fmt.Printf("String Slice: %v\n", stringSlice)

    // Map accessors
    stringMap := viper.GetStringMap("map_val")
    stringMapString := viper.GetStringMapString("map_val")
    fmt.Printf("Map: %v\n", stringMap)
    fmt.Printf("MapString: %v\n", stringMapString)
}
```

## Config Struct Binding with Unmarshal

For larger applications, binding configuration to structs provides type safety and better organization.

### Defining Configuration Structs

Create well-organized configuration structs with mapstructure tags:

```go
package config

import (
    "time"
)

// Config holds all application configuration
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    Logging  LoggingConfig  `mapstructure:"logging"`
    Features FeatureFlags   `mapstructure:"features"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
    Host         string        `mapstructure:"host"`
    Port         int           `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
    IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
}

// DatabaseConfig holds database connection settings
type DatabaseConfig struct {
    Host           string `mapstructure:"host"`
    Port           int    `mapstructure:"port"`
    Name           string `mapstructure:"name"`
    User           string `mapstructure:"user"`
    Password       string `mapstructure:"password"`
    SSLMode        string `mapstructure:"ssl_mode"`
    MaxConnections int    `mapstructure:"max_connections"`
    MaxIdleConns   int    `mapstructure:"max_idle_connections"`
}

// RedisConfig holds Redis connection settings
type RedisConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Password string `mapstructure:"password"`
    DB       int    `mapstructure:"db"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
    Level  string `mapstructure:"level"`
    Format string `mapstructure:"format"`
    Output string `mapstructure:"output"`
}

// FeatureFlags holds feature toggle settings
type FeatureFlags struct {
    EnableCache   bool `mapstructure:"enable_cache"`
    EnableMetrics bool `mapstructure:"enable_metrics"`
    RateLimit     int  `mapstructure:"rate_limit"`
}
```

### Unmarshaling Configuration

Use Viper's Unmarshal function to populate your struct:

```go
package main

import (
    "fmt"
    "log"

    "github.com/spf13/viper"
)

// Config struct definition (from above)
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
}

type ServerConfig struct {
    Host string `mapstructure:"host"`
    Port int    `mapstructure:"port"`
}

type DatabaseConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Name     string `mapstructure:"name"`
    User     string `mapstructure:"user"`
    Password string `mapstructure:"password"`
}

func LoadConfig() (*Config, error) {
    // Set defaults
    viper.SetDefault("server.host", "localhost")
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("database.host", "localhost")
    viper.SetDefault("database.port", 5432)

    // Configure Viper
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.AddConfigPath("./config")

    // Enable environment variables
    viper.SetEnvPrefix("APP")
    viper.AutomaticEnv()

    // Read config file
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("error reading config: %w", err)
        }
    }

    // Unmarshal into struct
    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("error unmarshaling config: %w", err)
    }

    return &config, nil
}

func main() {
    config, err := LoadConfig()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }

    fmt.Printf("Server: %s:%d\n", config.Server.Host, config.Server.Port)
    fmt.Printf("Database: %s@%s:%d/%s\n",
        config.Database.User,
        config.Database.Host,
        config.Database.Port,
        config.Database.Name)
}
```

### Unmarshaling Specific Sections

You can unmarshal just a portion of your configuration:

```go
package main

import (
    "fmt"
    "log"

    "github.com/spf13/viper"
)

type DatabaseConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Name     string `mapstructure:"name"`
    User     string `mapstructure:"user"`
    Password string `mapstructure:"password"`
}

func main() {
    viper.SetConfigFile("config.yaml")

    if err := viper.ReadInConfig(); err != nil {
        log.Fatal(err)
    }

    // Unmarshal only the database section
    var dbConfig DatabaseConfig
    if err := viper.UnmarshalKey("database", &dbConfig); err != nil {
        log.Fatalf("Failed to unmarshal database config: %v", err)
    }

    fmt.Printf("Database Config: %+v\n", dbConfig)
}
```

## Live Configuration Reloading

One of Viper's most powerful features is the ability to watch for configuration changes and reload without restarting the application.

### Basic File Watching

Set up automatic configuration reloading when files change:

```go
package main

import (
    "fmt"
    "log"
    "sync"
    "time"

    "github.com/fsnotify/fsnotify"
    "github.com/spf13/viper"
)

// ConfigManager handles thread-safe configuration access
type ConfigManager struct {
    config *Config
    mu     sync.RWMutex
}

type Config struct {
    Server struct {
        Host string `mapstructure:"host"`
        Port int    `mapstructure:"port"`
    } `mapstructure:"server"`
    Features struct {
        EnableCache bool `mapstructure:"enable_cache"`
        RateLimit   int  `mapstructure:"rate_limit"`
    } `mapstructure:"features"`
}

var manager = &ConfigManager{}

func (cm *ConfigManager) Get() Config {
    cm.mu.RLock()
    defer cm.mu.RUnlock()
    return *cm.config
}

func (cm *ConfigManager) Update(cfg *Config) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.config = cfg
}

func initConfig() error {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")

    if err := viper.ReadInConfig(); err != nil {
        return err
    }

    // Initial config load
    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return err
    }
    manager.Update(&cfg)

    // Watch for changes
    viper.WatchConfig()
    viper.OnConfigChange(func(e fsnotify.Event) {
        log.Printf("Config file changed: %s", e.Name)

        var newCfg Config
        if err := viper.Unmarshal(&newCfg); err != nil {
            log.Printf("Error reloading config: %v", err)
            return
        }

        manager.Update(&newCfg)
        log.Printf("Configuration reloaded successfully")
    })

    return nil
}

func main() {
    if err := initConfig(); err != nil {
        log.Fatalf("Failed to initialize config: %v", err)
    }

    // Simulate application running and accessing config
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        cfg := manager.Get()
        fmt.Printf("Current config - Cache: %v, Rate Limit: %d\n",
            cfg.Features.EnableCache, cfg.Features.RateLimit)
    }
}
```

### Advanced Reload with Callbacks

Implement a callback system to notify components of configuration changes:

```go
package main

import (
    "fmt"
    "log"
    "sync"

    "github.com/fsnotify/fsnotify"
    "github.com/spf13/viper"
)

// ConfigChangeCallback is called when configuration changes
type ConfigChangeCallback func(oldConfig, newConfig *Config)

// ConfigWatcher manages configuration and change notifications
type ConfigWatcher struct {
    config    *Config
    callbacks []ConfigChangeCallback
    mu        sync.RWMutex
}

type Config struct {
    LogLevel  string `mapstructure:"log_level"`
    RateLimit int    `mapstructure:"rate_limit"`
    Features  struct {
        EnableCache   bool `mapstructure:"enable_cache"`
        EnableMetrics bool `mapstructure:"enable_metrics"`
    } `mapstructure:"features"`
}

func NewConfigWatcher() (*ConfigWatcher, error) {
    cw := &ConfigWatcher{
        callbacks: make([]ConfigChangeCallback, 0),
    }

    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")

    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }

    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, err
    }
    cw.config = &cfg

    // Set up file watching
    viper.WatchConfig()
    viper.OnConfigChange(func(e fsnotify.Event) {
        cw.handleConfigChange()
    })

    return cw, nil
}

// OnChange registers a callback for configuration changes
func (cw *ConfigWatcher) OnChange(callback ConfigChangeCallback) {
    cw.mu.Lock()
    defer cw.mu.Unlock()
    cw.callbacks = append(cw.callbacks, callback)
}

// Get returns the current configuration
func (cw *ConfigWatcher) Get() *Config {
    cw.mu.RLock()
    defer cw.mu.RUnlock()

    // Return a copy to prevent modification
    configCopy := *cw.config
    return &configCopy
}

func (cw *ConfigWatcher) handleConfigChange() {
    cw.mu.Lock()

    oldConfig := cw.config

    var newConfig Config
    if err := viper.Unmarshal(&newConfig); err != nil {
        cw.mu.Unlock()
        log.Printf("Failed to unmarshal new config: %v", err)
        return
    }

    cw.config = &newConfig
    callbacks := make([]ConfigChangeCallback, len(cw.callbacks))
    copy(callbacks, cw.callbacks)

    cw.mu.Unlock()

    // Notify all callbacks
    for _, cb := range callbacks {
        cb(oldConfig, &newConfig)
    }
}

func main() {
    watcher, err := NewConfigWatcher()
    if err != nil {
        log.Fatalf("Failed to create config watcher: %v", err)
    }

    // Register callbacks for different components
    watcher.OnChange(func(old, new *Config) {
        if old.LogLevel != new.LogLevel {
            fmt.Printf("Log level changed: %s -> %s\n", old.LogLevel, new.LogLevel)
            // Update logger configuration
        }
    })

    watcher.OnChange(func(old, new *Config) {
        if old.RateLimit != new.RateLimit {
            fmt.Printf("Rate limit changed: %d -> %d\n", old.RateLimit, new.RateLimit)
            // Update rate limiter
        }
    })

    // Keep application running
    select {}
}
```

## Remote Configuration

Viper supports reading configuration from remote key-value stores like etcd and Consul.

### Using etcd for Configuration

Set up Viper to read from etcd:

```go
package main

import (
    "fmt"
    "log"

    "github.com/spf13/viper"
    _ "github.com/spf13/viper/remote" // Import remote package
)

func main() {
    // Connect to etcd
    err := viper.AddRemoteProvider("etcd3",
        "http://localhost:2379",
        "/config/myapp.yaml")
    if err != nil {
        log.Fatalf("Failed to add remote provider: %v", err)
    }

    viper.SetConfigType("yaml")

    // Read configuration from etcd
    if err := viper.ReadRemoteConfig(); err != nil {
        log.Fatalf("Failed to read remote config: %v", err)
    }

    fmt.Printf("Server Port: %d\n", viper.GetInt("server.port"))
    fmt.Printf("Database Host: %s\n", viper.GetString("database.host"))
}
```

### Using Consul for Configuration

Configure Viper to read from Consul:

```go
package main

import (
    "fmt"
    "log"
    "time"

    "github.com/spf13/viper"
    _ "github.com/spf13/viper/remote"
)

func main() {
    // Connect to Consul
    err := viper.AddRemoteProvider("consul",
        "localhost:8500",
        "myapp/config")
    if err != nil {
        log.Fatalf("Failed to add Consul provider: %v", err)
    }

    viper.SetConfigType("json")

    // Read configuration from Consul
    if err := viper.ReadRemoteConfig(); err != nil {
        log.Fatalf("Failed to read remote config: %v", err)
    }

    // Watch for remote changes
    go func() {
        for {
            time.Sleep(5 * time.Second)

            err := viper.WatchRemoteConfig()
            if err != nil {
                log.Printf("Error watching remote config: %v", err)
                continue
            }

            log.Println("Remote config updated")
        }
    }()

    fmt.Printf("Server Port: %d\n", viper.GetInt("server.port"))

    // Keep running
    select {}
}
```

### Secure Remote Configuration

For production environments, use encrypted configuration:

```go
package main

import (
    "log"

    "github.com/spf13/viper"
    _ "github.com/spf13/viper/remote"
)

func main() {
    // Add secure remote provider with encryption
    viper.AddSecureRemoteProvider(
        "etcd3",
        "https://localhost:2379",
        "/config/myapp.yaml",
        "/path/to/gpg/keyring.gpg",
    )

    viper.SetConfigType("yaml")

    if err := viper.ReadRemoteConfig(); err != nil {
        log.Fatalf("Failed to read secure remote config: %v", err)
    }

    // Configuration is now decrypted and available
    log.Printf("Loaded secure configuration")
}
```

## Production-Ready Configuration Pattern

Here's a complete, production-ready configuration package:

```go
package config

import (
    "fmt"
    "log"
    "strings"
    "sync"
    "time"

    "github.com/fsnotify/fsnotify"
    "github.com/spf13/viper"
)

// Config represents the application configuration
type Config struct {
    Environment string         `mapstructure:"environment"`
    Server      ServerConfig   `mapstructure:"server"`
    Database    DatabaseConfig `mapstructure:"database"`
    Redis       RedisConfig    `mapstructure:"redis"`
    Logging     LogConfig      `mapstructure:"logging"`
    Features    FeatureConfig  `mapstructure:"features"`
}

type ServerConfig struct {
    Host            string        `mapstructure:"host"`
    Port            int           `mapstructure:"port"`
    ReadTimeout     time.Duration `mapstructure:"read_timeout"`
    WriteTimeout    time.Duration `mapstructure:"write_timeout"`
    ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type DatabaseConfig struct {
    Host            string        `mapstructure:"host"`
    Port            int           `mapstructure:"port"`
    Name            string        `mapstructure:"name"`
    User            string        `mapstructure:"user"`
    Password        string        `mapstructure:"password"`
    SSLMode         string        `mapstructure:"ssl_mode"`
    MaxOpenConns    int           `mapstructure:"max_open_conns"`
    MaxIdleConns    int           `mapstructure:"max_idle_conns"`
    ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

type RedisConfig struct {
    Host         string        `mapstructure:"host"`
    Port         int           `mapstructure:"port"`
    Password     string        `mapstructure:"password"`
    DB           int           `mapstructure:"db"`
    PoolSize     int           `mapstructure:"pool_size"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type LogConfig struct {
    Level  string `mapstructure:"level"`
    Format string `mapstructure:"format"`
    Output string `mapstructure:"output"`
}

type FeatureConfig struct {
    EnableMetrics    bool `mapstructure:"enable_metrics"`
    EnableTracing    bool `mapstructure:"enable_tracing"`
    EnableProfiling  bool `mapstructure:"enable_profiling"`
    MaintenanceMode  bool `mapstructure:"maintenance_mode"`
}

// Manager provides thread-safe access to configuration
type Manager struct {
    config    *Config
    mu        sync.RWMutex
    callbacks []func(*Config)
}

var (
    manager *Manager
    once    sync.Once
)

// Initialize sets up the configuration manager
func Initialize(configPath string) error {
    var initErr error

    once.Do(func() {
        manager = &Manager{
            callbacks: make([]func(*Config), 0),
        }
        initErr = manager.load(configPath)
    })

    return initErr
}

func (m *Manager) load(configPath string) error {
    // Set defaults
    setDefaults()

    // Configure viper
    if configPath != "" {
        viper.SetConfigFile(configPath)
    } else {
        viper.SetConfigName("config")
        viper.SetConfigType("yaml")
        viper.AddConfigPath(".")
        viper.AddConfigPath("./config")
        viper.AddConfigPath("/etc/myapp")
    }

    // Environment variables
    viper.SetEnvPrefix("APP")
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    viper.AutomaticEnv()

    // Read config
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return fmt.Errorf("error reading config: %w", err)
        }
        log.Println("No config file found, using defaults and env vars")
    }

    // Parse into struct
    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return fmt.Errorf("error parsing config: %w", err)
    }

    // Validate
    if err := cfg.Validate(); err != nil {
        return fmt.Errorf("config validation failed: %w", err)
    }

    m.mu.Lock()
    m.config = &cfg
    m.mu.Unlock()

    // Set up file watching
    viper.WatchConfig()
    viper.OnConfigChange(func(e fsnotify.Event) {
        log.Printf("Config file changed: %s", e.Name)
        m.reload()
    })

    return nil
}

func (m *Manager) reload() {
    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        log.Printf("Error reloading config: %v", err)
        return
    }

    if err := cfg.Validate(); err != nil {
        log.Printf("Invalid config on reload: %v", err)
        return
    }

    m.mu.Lock()
    m.config = &cfg
    callbacks := make([]func(*Config), len(m.callbacks))
    copy(callbacks, m.callbacks)
    m.mu.Unlock()

    for _, cb := range callbacks {
        cb(&cfg)
    }

    log.Println("Configuration reloaded successfully")
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
    if c.Server.Port < 1 || c.Server.Port > 65535 {
        return fmt.Errorf("invalid server port: %d", c.Server.Port)
    }

    if c.Database.Host == "" {
        return fmt.Errorf("database host is required")
    }

    validLogLevels := map[string]bool{
        "debug": true, "info": true, "warn": true, "error": true,
    }
    if !validLogLevels[c.Logging.Level] {
        return fmt.Errorf("invalid log level: %s", c.Logging.Level)
    }

    return nil
}

func setDefaults() {
    // Server defaults
    viper.SetDefault("server.host", "0.0.0.0")
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.read_timeout", "30s")
    viper.SetDefault("server.write_timeout", "30s")
    viper.SetDefault("server.shutdown_timeout", "30s")

    // Database defaults
    viper.SetDefault("database.host", "localhost")
    viper.SetDefault("database.port", 5432)
    viper.SetDefault("database.ssl_mode", "disable")
    viper.SetDefault("database.max_open_conns", 25)
    viper.SetDefault("database.max_idle_conns", 5)
    viper.SetDefault("database.conn_max_lifetime", "5m")

    // Redis defaults
    viper.SetDefault("redis.host", "localhost")
    viper.SetDefault("redis.port", 6379)
    viper.SetDefault("redis.db", 0)
    viper.SetDefault("redis.pool_size", 10)

    // Logging defaults
    viper.SetDefault("logging.level", "info")
    viper.SetDefault("logging.format", "json")
    viper.SetDefault("logging.output", "stdout")
}

// Get returns the current configuration
func Get() *Config {
    manager.mu.RLock()
    defer manager.mu.RUnlock()

    cfg := *manager.config
    return &cfg
}

// OnReload registers a callback for configuration changes
func OnReload(callback func(*Config)) {
    manager.mu.Lock()
    defer manager.mu.Unlock()
    manager.callbacks = append(manager.callbacks, callback)
}
```

### Using the Configuration Package

Here's how to use the production configuration package:

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"

    "myapp/config"
)

func main() {
    // Initialize configuration
    configPath := os.Getenv("CONFIG_PATH")
    if err := config.Initialize(configPath); err != nil {
        log.Fatalf("Failed to initialize config: %v", err)
    }

    cfg := config.Get()
    log.Printf("Starting server in %s mode", cfg.Environment)

    // Register reload callback
    config.OnReload(func(newCfg *config.Config) {
        log.Printf("Configuration updated - new log level: %s",
            newCfg.Logging.Level)
        // Reconfigure components as needed
    })

    // Start server
    addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
    server := &http.Server{
        Addr:         addr,
        ReadTimeout:  cfg.Server.ReadTimeout,
        WriteTimeout: cfg.Server.WriteTimeout,
    }

    go func() {
        log.Printf("Server listening on %s", addr)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")
}
```

## Best Practices

When using Viper in production, follow these best practices:

1. **Always set defaults**: Provide sensible defaults for all configuration values to ensure your application can start even without a config file.

2. **Validate configuration**: Always validate your configuration after loading to catch errors early.

3. **Use struct binding**: Prefer `Unmarshal` into structs over individual `Get` calls for better type safety and organization.

4. **Handle reload safely**: Use proper synchronization when implementing live reloading to prevent race conditions.

5. **Environment variable prefix**: Use a consistent prefix for environment variables to avoid conflicts.

6. **Secure sensitive data**: Never log passwords or API keys. Consider using remote config stores for secrets.

7. **Document your configuration**: Maintain a reference configuration file with all available options and their descriptions.

## Conclusion

Viper provides a comprehensive solution for configuration management in Go applications. By combining environment variables, configuration files, and remote stores with live reloading capabilities, you can build flexible, production-ready applications that follow modern deployment practices.

The patterns shown in this guide enable you to start simple with basic configuration and progressively add more sophisticated features like live reloading and remote configuration as your application grows. Following Twelve-Factor App principles with Viper ensures your Go applications are well-suited for containerized and cloud-native deployments.

For more information, visit the [official Viper documentation](https://github.com/spf13/viper) and explore additional features like integration with cobra for CLI applications.

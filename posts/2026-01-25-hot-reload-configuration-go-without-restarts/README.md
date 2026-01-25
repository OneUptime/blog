# How to Hot-Reload Configuration in Go Without Restarts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Configuration, Hot Reload, Viper, DevOps

Description: Learn how to implement hot-reloading configuration in Go applications using file watchers and Viper, enabling seamless runtime updates without service restarts.

---

Restarting services to pick up configuration changes is one of those things that feels harmless in development but becomes a real headache in production. Every restart means brief downtime, dropped connections, and cold caches. What if your Go application could detect configuration changes and apply them instantly?

This guide walks through implementing hot-reload configuration in Go, from simple file-watching approaches to production-ready solutions with Viper.

## Why Hot-Reload Configuration?

Before diving into code, let's consider when hot-reload makes sense:

| Scenario | Cold Restart | Hot Reload |
|----------|--------------|------------|
| Feature flags | Service disruption | Instant toggle |
| Rate limits | Brief outage | Seamless adjustment |
| Log levels | Lost requests | Debug on the fly |
| Timeouts | Connection drops | Smooth transition |

Hot-reload shines for operational settings - things you need to tweak quickly without a full deployment cycle. Database connection strings or TLS certificates? Those typically need a restart. But feature flags, rate limits, and log verbosity are perfect candidates.

## The Basic Approach: File Watching

Go's standard library does not include a file watcher, but the `fsnotify` package provides cross-platform file system notifications. Here's a minimal implementation:

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "sync"

    "github.com/fsnotify/fsnotify"
)

// Config holds your application settings
type Config struct {
    LogLevel    string `json:"log_level"`
    RateLimit   int    `json:"rate_limit"`
    FeatureFlag bool   `json:"feature_flag"`
}

// ConfigManager handles thread-safe config access
type ConfigManager struct {
    mu     sync.RWMutex
    config Config
    path   string
}

func NewConfigManager(path string) (*ConfigManager, error) {
    cm := &ConfigManager{path: path}

    // Load initial configuration
    if err := cm.load(); err != nil {
        return nil, err
    }

    return cm, nil
}

func (cm *ConfigManager) load() error {
    data, err := os.ReadFile(cm.path)
    if err != nil {
        return err
    }

    var newConfig Config
    if err := json.Unmarshal(data, &newConfig); err != nil {
        return err
    }

    cm.mu.Lock()
    cm.config = newConfig
    cm.mu.Unlock()

    log.Printf("Configuration loaded: %+v", newConfig)
    return nil
}

// Get returns a copy of the current config
func (cm *ConfigManager) Get() Config {
    cm.mu.RLock()
    defer cm.mu.RUnlock()
    return cm.config
}

// Watch starts watching for file changes
func (cm *ConfigManager) Watch() error {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return err
    }

    go func() {
        for {
            select {
            case event, ok := <-watcher.Events:
                if !ok {
                    return
                }
                // Reload on write or create events
                if event.Op&fsnotify.Write == fsnotify.Write ||
                   event.Op&fsnotify.Create == fsnotify.Create {
                    log.Println("Config file changed, reloading...")
                    if err := cm.load(); err != nil {
                        log.Printf("Error reloading config: %v", err)
                    }
                }
            case err, ok := <-watcher.Errors:
                if !ok {
                    return
                }
                log.Printf("Watcher error: %v", err)
            }
        }
    }()

    return watcher.Add(cm.path)
}
```

This works, but there are edge cases. Some editors save files by writing to a temp file and renaming, which can cause the watcher to lose track of the original file. You also need to handle rapid successive changes without reloading multiple times.

## Production-Ready Solution with Viper

Viper is the go-to configuration library in the Go ecosystem. It handles file watching, multiple config formats, and environment variable overrides out of the box.

```go
package main

import (
    "log"
    "sync"
    "time"

    "github.com/fsnotify/fsnotify"
    "github.com/spf13/viper"
)

type AppConfig struct {
    Server   ServerConfig   `mapstructure:"server"`
    Features FeaturesConfig `mapstructure:"features"`
    Logging  LoggingConfig  `mapstructure:"logging"`
}

type ServerConfig struct {
    Port         int           `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type FeaturesConfig struct {
    EnableBetaAPI    bool `mapstructure:"enable_beta_api"`
    MaxRequestsPerIP int  `mapstructure:"max_requests_per_ip"`
}

type LoggingConfig struct {
    Level  string `mapstructure:"level"`
    Format string `mapstructure:"format"`
}

type ConfigService struct {
    mu        sync.RWMutex
    config    AppConfig
    callbacks []func(AppConfig)
}

func NewConfigService(configPath string) (*ConfigService, error) {
    cs := &ConfigService{
        callbacks: make([]func(AppConfig), 0),
    }

    // Set up Viper
    viper.SetConfigFile(configPath)
    viper.SetConfigType("yaml")

    // Allow environment variable overrides
    // CONFIG_SERVER_PORT will override server.port
    viper.SetEnvPrefix("CONFIG")
    viper.AutomaticEnv()

    // Read initial config
    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }

    if err := cs.updateConfig(); err != nil {
        return nil, err
    }

    // Set up file watching
    viper.OnConfigChange(func(e fsnotify.Event) {
        log.Printf("Config file changed: %s", e.Name)

        if err := cs.updateConfig(); err != nil {
            log.Printf("Error updating config: %v", err)
            return
        }

        // Notify all registered callbacks
        cs.notifyCallbacks()
    })

    viper.WatchConfig()

    return cs, nil
}

func (cs *ConfigService) updateConfig() error {
    var newConfig AppConfig
    if err := viper.Unmarshal(&newConfig); err != nil {
        return err
    }

    cs.mu.Lock()
    cs.config = newConfig
    cs.mu.Unlock()

    return nil
}

// OnChange registers a callback for config updates
func (cs *ConfigService) OnChange(callback func(AppConfig)) {
    cs.mu.Lock()
    cs.callbacks = append(cs.callbacks, callback)
    cs.mu.Unlock()
}

func (cs *ConfigService) notifyCallbacks() {
    cs.mu.RLock()
    config := cs.config
    callbacks := cs.callbacks
    cs.mu.RUnlock()

    for _, cb := range callbacks {
        cb(config)
    }
}

func (cs *ConfigService) Get() AppConfig {
    cs.mu.RLock()
    defer cs.mu.RUnlock()
    return cs.config
}
```

The corresponding YAML config file:

```yaml
server:
  port: 8080
  read_timeout: 30s
  write_timeout: 30s

features:
  enable_beta_api: false
  max_requests_per_ip: 100

logging:
  level: info
  format: json
```

## Integrating with Your Application

Here's how to wire up the config service with actual application components:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "golang.org/x/time/rate"
)

type RateLimiter struct {
    mu      sync.RWMutex
    limiter *rate.Limiter
}

func NewRateLimiter(rps int) *RateLimiter {
    return &RateLimiter{
        limiter: rate.NewLimiter(rate.Limit(rps), rps),
    }
}

func (rl *RateLimiter) UpdateLimit(rps int) {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    rl.limiter.SetLimit(rate.Limit(rps))
    rl.limiter.SetBurst(rps)
    log.Printf("Rate limit updated to %d requests/second", rps)
}

func (rl *RateLimiter) Allow() bool {
    rl.mu.RLock()
    defer rl.mu.RUnlock()
    return rl.limiter.Allow()
}

func main() {
    // Initialize config service
    configService, err := NewConfigService("config.yaml")
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }

    config := configService.Get()

    // Initialize rate limiter with config
    rateLimiter := NewRateLimiter(config.Features.MaxRequestsPerIP)

    // Subscribe to config changes
    configService.OnChange(func(newConfig AppConfig) {
        // Update rate limiter when config changes
        rateLimiter.UpdateLimit(newConfig.Features.MaxRequestsPerIP)

        // Update log level dynamically
        log.Printf("Log level changed to: %s", newConfig.Logging.Level)
    })

    // Set up HTTP server with middleware
    mux := http.NewServeMux()

    mux.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
        // Check rate limit
        if !rateLimiter.Allow() {
            http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
            return
        }

        // Check feature flag from current config
        cfg := configService.Get()
        if r.URL.Path == "/api/beta" && !cfg.Features.EnableBetaAPI {
            http.Error(w, "Beta API is disabled", http.StatusNotFound)
            return
        }

        w.Write([]byte("OK"))
    })

    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  config.Server.ReadTimeout,
        WriteTimeout: config.Server.WriteTimeout,
    }

    // Graceful shutdown
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan

        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        server.Shutdown(ctx)
    }()

    log.Printf("Server starting on port %d", config.Server.Port)
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

## Handling Validation and Rollback

Config changes can break things. Adding validation prevents bad configs from taking effect:

```go
func (cs *ConfigService) updateConfig() error {
    var newConfig AppConfig
    if err := viper.Unmarshal(&newConfig); err != nil {
        return err
    }

    // Validate before applying
    if err := validateConfig(newConfig); err != nil {
        return fmt.Errorf("invalid configuration: %w", err)
    }

    cs.mu.Lock()
    cs.config = newConfig
    cs.mu.Unlock()

    return nil
}

func validateConfig(cfg AppConfig) error {
    if cfg.Server.Port < 1 || cfg.Server.Port > 65535 {
        return fmt.Errorf("invalid port: %d", cfg.Server.Port)
    }

    if cfg.Features.MaxRequestsPerIP < 1 {
        return fmt.Errorf("rate limit must be positive")
    }

    validLogLevels := map[string]bool{
        "debug": true, "info": true, "warn": true, "error": true,
    }
    if !validLogLevels[cfg.Logging.Level] {
        return fmt.Errorf("invalid log level: %s", cfg.Logging.Level)
    }

    return nil
}
```

## Best Practices for Production

A few lessons learned from running hot-reload configs in production:

**Debounce rapid changes.** Editors sometimes trigger multiple write events. Add a small delay before reloading:

```go
var debounceTimer *time.Timer
var debounceMu sync.Mutex

viper.OnConfigChange(func(e fsnotify.Event) {
    debounceMu.Lock()
    defer debounceMu.Unlock()

    if debounceTimer != nil {
        debounceTimer.Stop()
    }

    debounceTimer = time.AfterFunc(500*time.Millisecond, func() {
        cs.updateConfig()
        cs.notifyCallbacks()
    })
})
```

**Log all config changes.** You want an audit trail when debugging production issues.

**Test config changes in staging first.** Hot-reload does not mean skip your deployment process - it means faster iteration on operational parameters.

**Consider config versioning.** Adding a version field helps track which config is active:

```yaml
version: "2024-01-25-v3"
server:
  port: 8080
```

## When Not to Use Hot-Reload

Some settings should require a restart:

- Database connection strings (connection pools need rebuilding)
- TLS certificates (security-sensitive, needs careful handling)
- Server bind address (requires re-binding the socket)
- Critical security settings (you want the restart to ensure clean state)

For these, a graceful restart with rolling deployments is the safer approach.

## Wrapping Up

Hot-reloading configuration gives you operational flexibility without the overhead of restarts. The combination of Viper for config management and proper synchronization primitives makes it straightforward to implement in Go.

Start with feature flags and logging levels - low risk, high value. Once you're comfortable with the pattern, expand to rate limits and other operational parameters. Your on-call engineers will thank you when they can adjust settings without triggering a deployment at 3 AM.

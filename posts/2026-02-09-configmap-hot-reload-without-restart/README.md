# How to Implement ConfigMap Hot Reload in Applications Without Pod Restart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ConfigMaps, Hot Reload

Description: Learn how to implement ConfigMap hot reload in Kubernetes applications without restarting pods, using file watchers and signal handlers for zero-downtime configuration updates.

---

Restarting pods every time you update a ConfigMap creates unnecessary downtime and disrupts your services. Hot reloading configuration allows your applications to pick up changes automatically while continuing to serve traffic. This approach is critical for production environments where availability matters.

In this guide, you'll learn how to implement ConfigMap hot reload in your applications without pod restarts. We'll cover file watching mechanisms, signal-based reloads, and practical implementation patterns in different programming languages.

## Understanding ConfigMap Updates

When you update a ConfigMap mounted as a volume, Kubernetes eventually updates the files inside the pod. This process uses atomic symlink swaps and typically takes 30-60 seconds due to kubelet's sync period.

The key insight is that your application needs to detect these file changes and reload its configuration, rather than relying on pod restarts.

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  config.json: |
    {
      "log_level": "info",
      "max_connections": 100,
      "timeout": 30
    }
```

Mount this ConfigMap as a volume in your deployment:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:latest
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: app-config
```

## Implementing File Watcher in Go

Go applications can use the fsnotify library to watch for file system changes. This approach is efficient and works well for configuration hot reload.

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "sync"

    "github.com/fsnotify/fsnotify"
)

// Config holds application configuration
type Config struct {
    LogLevel       string `json:"log_level"`
    MaxConnections int    `json:"max_connections"`
    Timeout        int    `json:"timeout"`
}

// ConfigManager handles configuration loading and reloading
type ConfigManager struct {
    mu       sync.RWMutex
    config   *Config
    path     string
    watcher  *fsnotify.Watcher
    onChange func(*Config)
}

func NewConfigManager(path string, onChange func(*Config)) (*ConfigManager, error) {
    cm := &ConfigManager{
        path:     path,
        onChange: onChange,
    }

    // Load initial configuration
    if err := cm.loadConfig(); err != nil {
        return nil, err
    }

    // Set up file watcher
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return nil, err
    }
    cm.watcher = watcher

    // Watch the parent directory because Kubernetes uses symlinks
    // Watching the file directly won't catch updates
    if err := watcher.Add("/etc/config"); err != nil {
        return nil, err
    }

    go cm.watch()

    return cm, nil
}

func (cm *ConfigManager) loadConfig() error {
    data, err := os.ReadFile(cm.path)
    if err != nil {
        return err
    }

    var config Config
    if err := json.Unmarshal(data, &config); err != nil {
        return err
    }

    cm.mu.Lock()
    cm.config = &config
    cm.mu.Unlock()

    return nil
}

func (cm *ConfigManager) watch() {
    for {
        select {
        case event, ok := <-cm.watcher.Events:
            if !ok {
                return
            }

            // Look for Create or Write events on our config file
            // Kubernetes creates a new symlink, so we watch for Create
            if event.Op&fsnotify.Create == fsnotify.Create {
                log.Println("Config file changed, reloading...")

                if err := cm.loadConfig(); err != nil {
                    log.Printf("Error reloading config: %v", err)
                    continue
                }

                if cm.onChange != nil {
                    cm.mu.RLock()
                    cm.onChange(cm.config)
                    cm.mu.RUnlock()
                }
            }

        case err, ok := <-cm.watcher.Errors:
            if !ok {
                return
            }
            log.Printf("Watcher error: %v", err)
        }
    }
}

func (cm *ConfigManager) Get() *Config {
    cm.mu.RLock()
    defer cm.mu.RUnlock()
    return cm.config
}

func (cm *ConfigManager) Close() error {
    return cm.watcher.Close()
}

func main() {
    // Initialize config manager with callback
    configManager, err := NewConfigManager("/etc/config/config.json", func(cfg *Config) {
        log.Printf("Configuration reloaded: %+v", cfg)
        // Apply new configuration here
        // Update log level, connection pool, etc.
    })
    if err != nil {
        log.Fatalf("Failed to initialize config manager: %v", err)
    }
    defer configManager.Close()

    // Your application logic here
    select {}
}
```

## Implementing Hot Reload in Python

Python applications can use the watchdog library to monitor file changes. This pattern works well for Flask, FastAPI, or Django applications.

```python
import json
import logging
import time
from pathlib import Path
from threading import RLock
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ConfigReloader(FileSystemEventHandler):
    """Watches for configuration file changes and reloads automatically"""

    def __init__(self, config_path, on_reload=None):
        self.config_path = Path(config_path)
        self.config = {}
        self.lock = RLock()
        self.on_reload = on_reload
        self.observer = Observer()

        # Load initial config
        self.load_config()

        # Watch the parent directory
        # Kubernetes uses symlink swaps, so we watch the directory
        watch_dir = self.config_path.parent
        self.observer.schedule(self, str(watch_dir), recursive=False)
        self.observer.start()

        logging.info(f"Watching {watch_dir} for configuration changes")

    def load_config(self):
        """Load configuration from file"""
        try:
            with open(self.config_path, 'r') as f:
                new_config = json.load(f)

            with self.lock:
                self.config = new_config

            logging.info(f"Configuration loaded: {self.config}")

            if self.on_reload:
                self.on_reload(new_config)

        except Exception as e:
            logging.error(f"Failed to load config: {e}")

    def on_created(self, event):
        """Handle file creation events (Kubernetes symlink updates)"""
        # Check if the event is for our config file
        if Path(event.src_path).name == self.config_path.name:
            logging.info("Configuration file changed, reloading...")
            time.sleep(0.1)  # Brief delay to ensure file is fully written
            self.load_config()

    def get_config(self):
        """Thread-safe config access"""
        with self.lock:
            return self.config.copy()

    def stop(self):
        """Stop watching for changes"""
        self.observer.stop()
        self.observer.join()

# Example usage
def on_config_change(config):
    """Callback when configuration changes"""
    print(f"New configuration applied: {config}")
    # Update application settings here
    # Reconfigure logging, update connection pools, etc.

# Initialize the reloader
reloader = ConfigReloader('/etc/config/config.json', on_reload=on_config_change)

# Your application code
try:
    while True:
        current_config = reloader.get_config()
        # Use current_config in your application
        time.sleep(1)
except KeyboardInterrupt:
    reloader.stop()
```

## Using Signal Handlers for Manual Reload

Another approach is to use Unix signals to trigger configuration reload. This gives you manual control over when to reload configuration.

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
)

func setupSignalHandlers(cm *ConfigManager) {
    sigChan := make(chan os.Signal, 1)
    // Listen for SIGHUP (traditionally used for configuration reload)
    signal.Notify(sigChan, syscall.SIGHUP)

    go func() {
        for {
            sig := <-sigChan
            log.Printf("Received signal: %v", sig)

            if sig == syscall.SIGHUP {
                log.Println("Reloading configuration...")
                if err := cm.loadConfig(); err != nil {
                    log.Printf("Error reloading config: %v", err)
                    continue
                }
                log.Println("Configuration reloaded successfully")
            }
        }
    }()
}
```

You can then trigger a reload by sending SIGHUP to the process:

```bash
# Find the process ID
kubectl exec -it my-app-pod -- ps aux | grep my-app

# Send SIGHUP signal
kubectl exec -it my-app-pod -- kill -HUP <PID>
```

## Node.js Implementation with Chokidar

For Node.js applications, chokidar provides robust file watching capabilities.

```javascript
const chokidar = require('chokidar');
const fs = require('fs').promises;

class ConfigManager {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = {};
        this.callbacks = [];
    }

    async init() {
        // Load initial configuration
        await this.loadConfig();

        // Watch for changes
        // Watch the parent directory because Kubernetes uses symlinks
        const watcher = chokidar.watch('/etc/config', {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100
            }
        });

        watcher.on('add', async (path) => {
            if (path.includes('config.json')) {
                console.log('Configuration file changed, reloading...');
                await this.loadConfig();
            }
        });

        console.log('Configuration watcher initialized');
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(data);
            console.log('Configuration loaded:', this.config);

            // Notify all callbacks
            this.callbacks.forEach(cb => cb(this.config));
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    onChange(callback) {
        this.callbacks.push(callback);
    }

    get() {
        return { ...this.config };
    }
}

// Usage
const configManager = new ConfigManager('/etc/config/config.json');

configManager.onChange((config) => {
    console.log('New configuration:', config);
    // Apply configuration changes
    // Update log level, connection settings, etc.
});

configManager.init();
```

## Best Practices for Hot Reload

When implementing hot reload, keep these practices in mind:

1. **Watch directories, not files**: Kubernetes updates ConfigMaps using atomic symlink swaps, so watch the parent directory instead of the file directly.

2. **Add stabilization delays**: File systems may emit multiple events during updates. Add a small delay before reloading to ensure the file is fully written.

3. **Validate before applying**: Always validate new configuration before applying it. Invalid configuration should not crash your application.

4. **Use atomic updates**: Make configuration updates atomic to avoid serving requests with partially updated settings.

5. **Log reload events**: Always log when configuration is reloaded, including what changed and whether the reload succeeded.

6. **Handle errors gracefully**: If reloading fails, continue using the old configuration rather than crashing.

## Testing Your Implementation

Create a test script to verify hot reload works correctly:

```bash
#!/bin/bash

# Update ConfigMap
kubectl create configmap app-config \
  --from-literal=config.json='{"log_level":"debug","max_connections":200}' \
  --dry-run=client -o yaml | kubectl apply -f -

# Wait for kubelet to propagate changes (30-60 seconds)
echo "Waiting for configuration to propagate..."
sleep 60

# Check application logs for reload message
kubectl logs -l app=my-app --tail=20 | grep -i "reload"
```

Hot reloading ConfigMaps eliminates unnecessary pod restarts and keeps your services available during configuration updates. By implementing file watchers or signal handlers, you can build applications that adapt to configuration changes in real-time without disrupting traffic.

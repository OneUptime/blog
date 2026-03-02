# How to Set Up Watchman for File System Events on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Watchman, File Monitoring, Facebook, Automation

Description: Install and configure Watchman on Ubuntu to watch large directory trees for file changes and trigger automated actions efficiently, with persistent subscriptions across restarts.

---

Watchman is a file watching service developed by Meta (Facebook). It's designed for large codebases and project directories where inotifywait would be too slow or hit kernel limits. Watchman maintains a persistent server process that keeps state between queries - it can tell you what changed since the last time you asked, rather than just streaming all events. This makes it more efficient for development workflows and build systems.

Watchman is used internally by tools like Watchman-enabled Jest, Mercurial's watchman integration, and Buck build system.

## Why Watchman Over inotifywait

For small setups, inotifywait works fine. Watchman offers advantages for:

- **Large directory trees**: Watchman handles millions of files efficiently
- **Persistent state**: Knows what changed since your last query without streaming all events
- **Conditional triggers**: Rich query language to filter what you care about
- **Multiple clients**: Multiple tools can subscribe to the same directory concurrently
- **Cross-platform**: Same API works on Linux, macOS, and Windows

## Installing Watchman

### From Binary Release (Recommended)

```bash
# Install latest Watchman release
WATCHMAN_VERSION="2024.01.22.00"

# Download binary release
wget "https://github.com/facebook/watchman/releases/download/v${WATCHMAN_VERSION}/watchman-v${WATCHMAN_VERSION}-linux.zip" \
    -O /tmp/watchman.zip

cd /tmp
unzip watchman.zip

# Install binary
sudo install -d /usr/local/var/run/watchman
sudo install watchman-v${WATCHMAN_VERSION}-linux/bin/watchman \
    /usr/local/bin/watchman
```

### From Ubuntu Package (Older Version)

```bash
# Available in Ubuntu's repos but usually older version
sudo apt install watchman
```

### Build from Source

```bash
sudo apt install -y \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    libssl-dev \
    libz-dev \
    libpcre2-dev

git clone https://github.com/facebook/watchman.git
cd watchman
git checkout v$(curl -s https://api.github.com/repos/facebook/watchman/releases/latest | grep '"tag_name"' | cut -d'"' -f4 | tr -d 'v')

./autogen.sh
./configure --enable-lenient
make -j$(nproc)
sudo make install
```

Verify:

```bash
watchman --version
```

## Basic Usage

Watchman runs as a background server process. The `watchman` command communicates with it:

```bash
# Start watching a directory
watchman watch ~/project

# Query for recent changes (files modified in the last 10 seconds)
watchman find ~/project -- --since 10s

# Get all files in the directory
watchman find ~/project
```

### Getting Changes Since Last Query

The key Watchman feature is the "clock" concept - each watch has a clock value that advances with each change:

```bash
# Get the current clock for a watch
watchman clock ~/project

# Output: {"clock":"c:1706000000:1234:1:0"}

# Get files that changed since a clock value
watchman query ~/project '{
    "since": "c:1706000000:1234:1:0",
    "fields": ["name", "type", "mtime"]
}'
```

This is how build tools efficiently detect what needs rebuilding.

## Setting Up Watchman Triggers

Triggers run commands when files match a query. This is the automation backbone of Watchman.

### Basic Trigger

```bash
# Trigger: run build when JS files change
watchman -- trigger ~/project build-js '**/*.js' -- ./run-build.sh
```

This creates a persistent trigger named `build-js` that runs `run-build.sh` whenever any `.js` file changes.

### Trigger with JSON Configuration

More complex triggers use JSON:

```bash
watchman -j << 'EOF'
["trigger", "/home/user/project", {
    "name": "rebuild-on-change",
    "expression": ["anyof",
        ["match", "*.js", "wholename"],
        ["match", "*.ts", "wholename"],
        ["match", "*.css", "wholename"]
    ],
    "command": ["bash", "/home/user/project/build.sh"],
    "append_files": false,
    "stdin": "/dev/null",
    "stdout": "/tmp/watchman-build.log",
    "stderr": "/tmp/watchman-build-errors.log"
}]
EOF
```

This trigger:
- Runs `build.sh` when any `.js`, `.ts`, or `.css` file changes
- Logs output to `/tmp/watchman-build.log`
- Only runs once even if multiple files change simultaneously

### List Active Triggers

```bash
watchman trigger-list ~/project
```

### Delete a Trigger

```bash
watchman trigger-del ~/project rebuild-on-change
```

## Watchman Query Language

Watchman uses expression trees for filtering:

```bash
# All JavaScript files modified in the last 5 minutes
watchman query ~/project '{
    "expression": ["allof",
        ["match", "*.js", "wholename"],
        ["since", "5m", "mtime"]
    ],
    "fields": ["name", "mtime", "size"]
}'

# Files that don't match certain patterns
watchman query ~/project '{
    "expression": ["allof",
        ["type", "f"],
        ["not", ["match", "node_modules/**", "wholename"]]
    ],
    "fields": ["name"]
}'
```

### Expression Types

| Expression | Description |
|-----------|-------------|
| `["match", "*.js", "basename"]` | Glob match against basename |
| `["match", "src/*.js", "wholename"]` | Glob match against full path |
| `["type", "f"]` | File type: `f`=file, `d`=directory, `l`=symlink |
| `["since", "5m", "mtime"]` | Modified within last 5 minutes |
| `["allof", ...]` | All conditions must match |
| `["anyof", ...]` | Any condition must match |
| `["not", ...]` | Negate condition |
| `["suffix", "js"]` | File has this suffix |
| `["name", "package.json"]` | Exact name match |

## Watchman with Node.js

Many Node.js tools integrate with Watchman. Install the npm client:

```bash
npm install fb-watchman

# Or globally
npm install -g fb-watchman
```

Basic Node.js subscription:

```javascript
// watch-changes.js - Subscribe to file changes via Watchman
const watchman = require('fb-watchman');
const client = new watchman.Client();

const watchRoot = '/home/user/project';

client.capabilityCheck(
    { optional: [], required: ['relative_root'] },
    (error, resp) => {
        if (error) {
            console.error('Capability check failed:', error);
            client.end();
            return;
        }

        // Watch the directory
        client.command(['watch-project', watchRoot], (error, resp) => {
            if (error) {
                console.error('Error initiating watch:', error);
                return;
            }

            const watch = resp.watch;
            const relativeRoot = resp.relative_path || '';

            // Get initial clock
            client.command(['clock', watch], (error, resp) => {
                if (error) {
                    console.error('Error getting clock:', error);
                    return;
                }

                const subscriptionName = 'my-subscription';

                const sub = {
                    expression: ['allof',
                        ['type', 'f'],
                        ['not', ['match', '**/node_modules/**', 'wholename']]
                    ],
                    fields: ['name', 'size', 'mtime_ms', 'exists', 'type'],
                    since: resp.clock,
                };

                if (relativeRoot) {
                    sub.relative_root = relativeRoot;
                }

                // Create subscription
                client.command(
                    ['subscribe', watch, subscriptionName, sub],
                    (error, resp) => {
                        if (error) {
                            console.error('Subscribe error:', error);
                            return;
                        }
                        console.log('Subscription established:', resp.subscribe);
                    }
                );
            });
        });

        // Handle subscription events
        client.on('subscription', (resp) => {
            if (!resp.files) return;

            resp.files.forEach(file => {
                const action = file.exists ? 'modified' : 'deleted';
                console.log(`${action}: ${file.name}`);
            });
        });
    }
);
```

Run:

```bash
node watch-changes.js
```

## Watchman State Management

Watchman persists its state between restarts. State files are in `~/.watchman/`:

```bash
# Show all current watches
watchman watch-list

# Show Watchman version and state
watchman version

# Get server information
watchman get-sockname
```

## Configuring Watchman

Create a configuration file:

```bash
sudo nano /etc/watchman.json
```

```json
{
    "settle": 20,
    "ignore_dirs": [
        ".git",
        "node_modules",
        ".svn",
        ".hg"
    ]
}
```

Or user-level configuration:

```bash
nano ~/.watchmanconfig
```

```json
{
    "ignore_dirs": ["node_modules", ".git"],
    "settle": 50
}
```

The `settle` value (in milliseconds) controls how long Watchman waits after the last event before triggering callbacks - this implements debouncing.

## Increasing inotify Limits for Watchman

Watchman uses inotify under the hood on Linux:

```bash
sudo nano /etc/sysctl.d/10-watchman.conf
```

```ini
# Required for large projects
fs.inotify.max_user_watches = 1048576
fs.inotify.max_user_instances = 256
```

```bash
sudo sysctl -p /etc/sysctl.d/10-watchman.conf
```

## Stopping and Restarting Watchman

```bash
# Shutdown the Watchman server (it restarts on next command)
watchman shutdown-server

# Or kill the process
pkill watchman
```

Watchman restores its watches and triggers when it restarts, though it can take time to recrawl large trees.

## Debugging and Troubleshooting

```bash
# View Watchman logs
watchman --debug-watchman-version

# Check the log file
tail -f ~/.watchman/*.log

# Verbose output
watchman --foreground watch ~/project

# Recrawl if state seems stale
watchman watch-del ~/project
watchman watch ~/project
```

**"inotify limit reached":**

Increase `max_user_watches` as shown above.

**Trigger not firing:**

```bash
# Verify the trigger exists
watchman trigger-list ~/project

# Test the expression manually
watchman query ~/project '{"expression": ["match", "*.js", "wholename"], "fields": ["name"]}'
```

## Summary

Watchman excels at handling large directory trees where inotify-based tools struggle. Its persistent server model, clock-based change detection, and rich query language make it the right choice for development environments and build systems that need reliable, efficient file change detection. The integration with Node.js and Meta's build toolchain makes it especially useful in JavaScript/TypeScript development workflows on Ubuntu.

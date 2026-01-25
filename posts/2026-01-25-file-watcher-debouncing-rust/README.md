# How to Build a File Watcher with Debouncing in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, File Watcher, Debouncing, notify, File System

Description: Learn how to build a robust file watcher in Rust using the notify crate, with proper debouncing to handle rapid file system events without overwhelming your application.

---

File watchers are everywhere. Your IDE uses one to reload files. Build tools like Cargo watch your source files to trigger rebuilds. Hot-reload frameworks watch for changes to update your running application. But file systems are noisy. A single save operation can trigger multiple events within milliseconds. Without debouncing, your watcher becomes a firehose of duplicate notifications.

This guide walks through building a production-ready file watcher in Rust that handles the real-world messiness of file system events.

## Why File System Events Are Noisy

When you save a file in your editor, you might expect a single "modified" event. Reality is messier. Depending on the editor and OS, you might see:

- A write event when content is flushed
- A metadata change event for the timestamp
- A rename event if the editor uses atomic saves (write to temp, rename to original)
- Multiple partial write events for large files

On Linux with inotify, a simple save can generate 3-5 events. On macOS with FSEvents, you might see batched events with ambiguous types. Windows has its own quirks with ReadDirectoryChangesW.

Debouncing solves this by collecting events over a short window and collapsing duplicates into a single notification.

## Setting Up the Project

Start with the dependencies. The `notify` crate is the standard choice for cross-platform file watching in Rust.

```toml
# Cargo.toml
[dependencies]
notify = "6.1"
notify-debouncer-mini = "0.4"
```

The `notify-debouncer-mini` crate provides a simple debouncer built on top of `notify`. For more control, we will also build a custom debouncer from scratch.

## Basic File Watcher Without Debouncing

First, let's see what raw file system events look like without any debouncing.

```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;

fn main() -> notify::Result<()> {
    // Channel to receive file system events
    let (tx, rx) = channel();

    // Create a watcher with default config
    // RecommendedWatcher picks the best backend for each OS
    let mut watcher = RecommendedWatcher::new(
        move |result| {
            // Send events through the channel
            tx.send(result).expect("Failed to send event");
        },
        Config::default(),
    )?;

    // Watch the current directory recursively
    let path = Path::new(".");
    watcher.watch(path, RecursiveMode::Recursive)?;

    println!("Watching {:?} for changes...", path);

    // Process events as they arrive
    loop {
        match rx.recv_timeout(Duration::from_secs(1)) {
            Ok(Ok(event)) => {
                println!("Event: {:?}", event);
            }
            Ok(Err(e)) => {
                eprintln!("Watch error: {:?}", e);
            }
            Err(_) => {
                // Timeout - no events received
            }
        }
    }
}
```

Run this and save a file in the watched directory. You will likely see multiple events for that single save. This is where debouncing comes in.

## Using the Built-in Debouncer

The simplest approach is using `notify-debouncer-mini`, which handles the timing logic for you.

```rust
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;

fn main() -> notify::Result<()> {
    let (tx, rx) = channel();

    // Create a debouncer with a 500ms delay
    // Events within this window get collapsed into one notification
    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |result: Result<Vec<_>, _>| {
            tx.send(result).expect("Failed to send");
        },
    )?;

    // Watch the directory
    let path = Path::new("./src");
    debouncer.watcher().watch(path, notify::RecursiveMode::Recursive)?;

    println!("Watching {:?} with 500ms debounce...", path);

    loop {
        match rx.recv() {
            Ok(Ok(events)) => {
                // Events are now batched and deduplicated
                for event in events {
                    println!("Changed: {:?}", event.path);
                }
            }
            Ok(Err(e)) => eprintln!("Error: {:?}", e),
            Err(e) => eprintln!("Channel error: {:?}", e),
        }
    }
}
```

This works well for simple cases. The debouncer waits 500ms after the last event before delivering a batch of unique paths that changed.

## Building a Custom Debouncer

Sometimes you need more control. Maybe you want different debounce times for different file types, or you need to preserve event types instead of just paths. Here is a custom debouncer implementation.

```rust
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;
use std::time::{Duration, Instant};

// Tracks pending events with their first and last occurrence times
struct PendingEvent {
    first_seen: Instant,
    last_seen: Instant,
    event: Event,
}

pub struct DebouncedWatcher {
    watcher: RecommendedWatcher,
    event_rx: Receiver<Event>,
}

impl DebouncedWatcher {
    pub fn new(
        debounce_duration: Duration,
        callback: impl Fn(Vec<Event>) + Send + 'static,
    ) -> notify::Result<Self> {
        let (raw_tx, raw_rx) = channel::<Event>();
        let (debounced_tx, debounced_rx) = channel::<Event>();

        // Watcher sends raw events to the debounce thread
        let watcher = RecommendedWatcher::new(
            move |result: Result<Event, _>| {
                if let Ok(event) = result {
                    let _ = raw_tx.send(event);
                }
            },
            Config::default(),
        )?;

        // Spawn the debouncing thread
        thread::spawn(move || {
            Self::debounce_loop(raw_rx, debounce_duration, callback);
        });

        Ok(Self {
            watcher,
            event_rx: debounced_rx,
        })
    }

    fn debounce_loop(
        rx: Receiver<Event>,
        debounce_duration: Duration,
        callback: impl Fn(Vec<Event>),
    ) {
        // Map from path to pending event info
        let mut pending: HashMap<PathBuf, PendingEvent> = HashMap::new();
        let check_interval = Duration::from_millis(50);

        loop {
            // Drain all available events without blocking
            while let Ok(event) = rx.try_recv() {
                let now = Instant::now();

                // Process each path in the event
                for path in &event.paths {
                    pending
                        .entry(path.clone())
                        .and_modify(|p| {
                            p.last_seen = now;
                            // Keep the most recent event kind
                            p.event = event.clone();
                        })
                        .or_insert(PendingEvent {
                            first_seen: now,
                            last_seen: now,
                            event: event.clone(),
                        });
                }
            }

            // Check for events that have settled (no updates for debounce_duration)
            let now = Instant::now();
            let mut ready_events = Vec::new();

            pending.retain(|path, pending_event| {
                if now.duration_since(pending_event.last_seen) >= debounce_duration {
                    // Event has settled - add to ready batch
                    ready_events.push(pending_event.event.clone());
                    false // Remove from pending
                } else {
                    true // Keep waiting
                }
            });

            // Deliver settled events
            if !ready_events.is_empty() {
                callback(ready_events);
            }

            // Sleep before next check
            thread::sleep(check_interval);
        }
    }

    pub fn watch(&mut self, path: &std::path::Path, mode: RecursiveMode) -> notify::Result<()> {
        self.watcher.watch(path, mode)
    }
}
```

This custom implementation gives you access to the full `Event` struct, including the event kind (Create, Modify, Remove, etc.) and any attributes.

## Filtering Events by Type and Path

Real file watchers need to ignore certain paths and event types. Build tools should not rebuild when you edit a README. IDEs should not reload binary files.

```rust
use notify::{Event, EventKind};
use std::path::Path;

struct EventFilter {
    // Glob patterns to ignore
    ignore_patterns: Vec<glob::Pattern>,
    // File extensions to watch (empty means all)
    watch_extensions: Vec<String>,
    // Event kinds to process
    watch_kinds: Vec<EventKind>,
}

impl EventFilter {
    fn new() -> Self {
        Self {
            ignore_patterns: vec![
                glob::Pattern::new("**/target/**").unwrap(),
                glob::Pattern::new("**/.git/**").unwrap(),
                glob::Pattern::new("**/node_modules/**").unwrap(),
            ],
            watch_extensions: vec![
                "rs".to_string(),
                "toml".to_string(),
            ],
            watch_kinds: vec![
                EventKind::Create(notify::event::CreateKind::File),
                EventKind::Modify(notify::event::ModifyKind::Data(
                    notify::event::DataChange::Content,
                )),
                EventKind::Remove(notify::event::RemoveKind::File),
            ],
        }
    }

    fn should_process(&self, event: &Event) -> bool {
        // Check event kind
        if !self.watch_kinds.is_empty() {
            let kind_matches = self.watch_kinds.iter().any(|k| {
                std::mem::discriminant(k) == std::mem::discriminant(&event.kind)
            });
            if !kind_matches {
                return false;
            }
        }

        // Check paths
        for path in &event.paths {
            // Skip ignored patterns
            let path_str = path.to_string_lossy();
            if self.ignore_patterns.iter().any(|p| p.matches(&path_str)) {
                continue;
            }

            // Check extension if filtering by extension
            if !self.watch_extensions.is_empty() {
                if let Some(ext) = path.extension() {
                    if self.watch_extensions.iter().any(|e| e == ext.to_string_lossy().as_ref()) {
                        return true;
                    }
                }
                continue;
            }

            return true;
        }

        false
    }
}
```

## Handling Edge Cases

File watchers in production need to handle several tricky scenarios.

**Atomic saves**: Many editors save files by writing to a temporary file and renaming it. You will see a Create event for the temp file, then a Rename event. Your debouncer should track the final path.

**Rapid successive saves**: Some editors auto-save frequently. A 500ms debounce handles this well.

**Directory creation**: When someone creates a directory with files inside, you might see the directory event before the file events. Process these in order.

```rust
// Handle atomic saves by tracking renames
fn track_renames(events: &[Event]) -> Vec<PathBuf> {
    let mut final_paths = Vec::new();
    let mut rename_targets: HashMap<PathBuf, PathBuf> = HashMap::new();

    for event in events {
        match &event.kind {
            EventKind::Modify(notify::event::ModifyKind::Name(
                notify::event::RenameMode::Both,
            )) => {
                // Rename event with both source and destination
                if event.paths.len() >= 2 {
                    rename_targets.insert(
                        event.paths[0].clone(),
                        event.paths[1].clone(),
                    );
                }
            }
            _ => {
                for path in &event.paths {
                    // Check if this path was renamed
                    if let Some(final_path) = rename_targets.get(path) {
                        final_paths.push(final_path.clone());
                    } else {
                        final_paths.push(path.clone());
                    }
                }
            }
        }
    }

    final_paths
}
```

## Complete Example: A Build Watcher

Here is a complete example that watches Rust source files and triggers a build command after changes settle.

```rust
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Command;
use std::sync::mpsc::channel;
use std::thread;
use std::time::{Duration, Instant};

fn main() -> notify::Result<()> {
    let (tx, rx) = channel();
    let debounce_ms = 500;

    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, _>| {
            if let Ok(event) = result {
                let _ = tx.send(event);
            }
        },
        Config::default(),
    )?;

    watcher.watch("./src".as_ref(), RecursiveMode::Recursive)?;
    watcher.watch("./Cargo.toml".as_ref(), RecursiveMode::NonRecursive)?;

    println!("Watching for changes... Press Ctrl+C to stop.");

    let mut pending_paths: HashSet<PathBuf> = HashSet::new();
    let mut last_event_time = Instant::now();

    loop {
        // Collect events with a short timeout
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(event) => {
                for path in event.paths {
                    // Only watch .rs and .toml files
                    if let Some(ext) = path.extension() {
                        if ext == "rs" || ext == "toml" {
                            pending_paths.insert(path);
                            last_event_time = Instant::now();
                        }
                    }
                }
            }
            Err(_) => {
                // Check if we should trigger a build
                if !pending_paths.is_empty()
                    && last_event_time.elapsed() > Duration::from_millis(debounce_ms)
                {
                    println!("\nFiles changed:");
                    for path in &pending_paths {
                        println!("  - {}", path.display());
                    }
                    pending_paths.clear();

                    // Run the build
                    println!("Running cargo build...\n");
                    let status = Command::new("cargo")
                        .args(["build"])
                        .status()
                        .expect("Failed to run cargo");

                    if status.success() {
                        println!("\nBuild succeeded. Watching for changes...");
                    } else {
                        println!("\nBuild failed. Watching for changes...");
                    }
                }
            }
        }
    }
}
```

## Choosing the Right Debounce Duration

The optimal debounce duration depends on your use case:

- **IDE file reload**: 100-200ms for responsive feedback
- **Build triggers**: 500-1000ms to batch rapid saves
- **Backup or sync**: 2000-5000ms to avoid excessive operations
- **Log file monitoring**: 50-100ms for near-real-time processing

Start with 500ms and adjust based on how your application feels. Too short and you will still see duplicates. Too long and the application feels sluggish.

## Summary

Building a file watcher that behaves well in production requires more than just subscribing to OS events. Debouncing prevents duplicate processing, filtering focuses on relevant changes, and proper event handling deals with the quirks of different editors and operating systems.

The `notify` crate handles the cross-platform complexity of file system APIs. Combine it with thoughtful debouncing and filtering, and you have a reliable foundation for build tools, hot-reload systems, or any application that needs to react to file changes.

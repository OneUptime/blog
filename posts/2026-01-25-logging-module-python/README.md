# How to Use logging Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Logging, Debugging, Observability, Best Practices

Description: Learn how to use Python's logging module effectively. This guide covers log levels, handlers, formatters, configuration, and best practices for application logging.

---

Python's built-in `logging` module provides a flexible framework for emitting log messages from your applications. Unlike `print()` statements, logging gives you control over message severity, output destinations, and formatting. This guide covers everything from basic usage to production-ready configurations.

## Why Use logging Instead of print?

```python
# print() problems:
# - No severity levels
# - Hard to turn off in production
# - No timestamps or context
# - Goes to stdout only

print("Processing started")
print("Error: something went wrong")

# logging benefits:
# - Severity levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
# - Easy to configure output
# - Rich formatting with timestamps, module names, etc.
# - Multiple outputs (file, console, network, etc.)
# - Can be enabled/disabled by level

import logging
logging.info("Processing started")
logging.error("Something went wrong")
```

## Basic Logging

```python
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO)

# Log messages at different levels
logging.debug("Debug message")     # Not shown (level is INFO)
logging.info("Info message")       # Shown
logging.warning("Warning message") # Shown
logging.error("Error message")     # Shown
logging.critical("Critical!")      # Shown
```

## Log Levels

| Level | Numeric Value | When to Use |
|-------|---------------|-------------|
| DEBUG | 10 | Detailed info for diagnosing problems |
| INFO | 20 | Confirmation that things work as expected |
| WARNING | 30 | Something unexpected, but not an error |
| ERROR | 40 | A serious problem, some functionality failed |
| CRITICAL | 50 | A very serious error, program may crash |

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# Use appropriate levels
logging.debug("Variable x = %s", x)  # Debugging details
logging.info("User %s logged in", username)  # Normal operations
logging.warning("Disk space low: %s%% used", pct)  # Potential issues
logging.error("Failed to connect to database")  # Errors
logging.critical("System out of memory!")  # Critical failures
```

## Configuring Log Format

```python
import logging

# Custom format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

logging.info("Server started")
# Output: 2026-01-25 10:30:00 - root - INFO - Server started
```

### Common Format Variables

| Variable | Description |
|----------|-------------|
| `%(asctime)s` | Human-readable time |
| `%(created)f` | Unix timestamp |
| `%(levelname)s` | Level name (INFO, ERROR, etc.) |
| `%(name)s` | Logger name |
| `%(module)s` | Module name |
| `%(funcName)s` | Function name |
| `%(lineno)d` | Line number |
| `%(message)s` | The log message |

## Using Named Loggers

Named loggers let you configure logging per module:

```python
import logging

# Create a logger for this module
logger = logging.getLogger(__name__)

def process_data(data):
    logger.info("Processing %d items", len(data))
    for item in data:
        logger.debug("Processing item: %s", item)

# In another file
# logger = logging.getLogger("myapp.database")
```

## Handlers and Output Destinations

Handlers send log records to different destinations:

```python
import logging

# Create logger
logger = logging.getLogger("myapp")
logger.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_format = logging.Formatter("%(levelname)s - %(message)s")
console_handler.setFormatter(console_format)

# File handler
file_handler = logging.FileHandler("app.log")
file_handler.setLevel(logging.DEBUG)
file_format = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(file_format)

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# This goes to both console (INFO+) and file (DEBUG+)
logger.debug("Debug info")  # File only
logger.info("Information")  # Both
logger.error("Error!")      # Both
```

### Common Handlers

```python
import logging
from logging.handlers import (
    RotatingFileHandler,
    TimedRotatingFileHandler,
    SMTPHandler
)

# Rotating file handler - rotate when file reaches size
rotating = RotatingFileHandler(
    "app.log",
    maxBytes=10*1024*1024,  # 10 MB
    backupCount=5
)

# Time-based rotation - daily log files
timed = TimedRotatingFileHandler(
    "app.log",
    when="midnight",
    interval=1,
    backupCount=30
)

# Email handler for critical errors
email = SMTPHandler(
    mailhost="smtp.example.com",
    fromaddr="app@example.com",
    toaddrs=["admin@example.com"],
    subject="Application Error"
)
email.setLevel(logging.ERROR)
```

## Logging Exceptions

```python
import logging

logger = logging.getLogger(__name__)

def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        # exc_info=True adds stack trace
        logger.error("Division by zero", exc_info=True)
        # Or use exception() which automatically includes exc_info
        logger.exception("Division by zero")
        return None
```

## Configuration with Dictionary

For complex setups, use dictionary configuration:

```python
import logging
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        },
        "detailed": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard",
            "stream": "ext://sys.stdout"
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "detailed",
            "filename": "app.log",
            "maxBytes": 10485760,
            "backupCount": 5
        }
    },
    "loggers": {
        "": {  # Root logger
            "handlers": ["console", "file"],
            "level": "DEBUG"
        },
        "myapp.database": {
            "handlers": ["file"],
            "level": "DEBUG",
            "propagate": False
        }
    }
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger("myapp")
```

## Configuration from File

```ini
# logging.ini
[loggers]
keys=root,myapp

[handlers]
keys=console,file

[formatters]
keys=standard

[logger_root]
level=DEBUG
handlers=console

[logger_myapp]
level=DEBUG
handlers=file
qualname=myapp
propagate=0

[handler_console]
class=StreamHandler
level=INFO
formatter=standard
args=(sys.stdout,)

[handler_file]
class=FileHandler
level=DEBUG
formatter=standard
args=('app.log', 'a')

[formatter_standard]
format=%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

```python
import logging.config

logging.config.fileConfig("logging.ini")
logger = logging.getLogger("myapp")
```

## Structured Logging with Extra Fields

```python
import logging
import json

class JsonFormatter(logging.Formatter):
    """Format logs as JSON."""

    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add extra fields
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        return json.dumps(log_data)

# Setup
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger("myapp")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Log with extra fields
logger.info("User logged in", extra={"user_id": 123, "request_id": "abc-456"})
# {"timestamp": "2026-01-25 10:30:00", "level": "INFO", "message": "User logged in", "user_id": 123, ...}
```

## Context with Adapters

```python
import logging

class ContextAdapter(logging.LoggerAdapter):
    """Add context to all log messages."""

    def process(self, msg, kwargs):
        # Add context from extra dict
        context = " ".join(f"{k}={v}" for k, v in self.extra.items())
        return f"[{context}] {msg}", kwargs

# Usage
logger = logging.getLogger(__name__)
adapter = ContextAdapter(logger, {"request_id": "abc-123", "user": "john"})

adapter.info("Processing request")
# [request_id=abc-123 user=john] Processing request
```

## Best Practices

### 1. Use Module-Level Loggers

```python
# At the top of each module
import logging
logger = logging.getLogger(__name__)
```

### 2. Use Lazy String Formatting

```python
# Bad - string formatted even if not logged
logger.debug("User data: " + str(user_data))

# Good - string only formatted if DEBUG is enabled
logger.debug("User data: %s", user_data)
```

### 3. Do Not Log Sensitive Data

```python
# Bad
logger.info("User login: password=%s", password)

# Good
logger.info("User login attempt for: %s", username)
```

### 4. Configure Logging Early

```python
# main.py
import logging

def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

if __name__ == "__main__":
    configure_logging()
    # Rest of application
```

## Real World Example: Application Logger

```python
import logging
import logging.handlers
import sys
from pathlib import Path

def setup_logging(
    log_dir="logs",
    log_level=logging.INFO,
    app_name="myapp"
):
    """Configure logging for the application."""
    # Create log directory
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)

    # Create formatters
    console_format = logging.Formatter(
        "%(levelname)-8s %(message)s"
    )
    file_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(console_format)

    # File handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        log_path / f"{app_name}.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_format)

    # Error file handler
    error_handler = logging.handlers.RotatingFileHandler(
        log_path / f"{app_name}.error.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_format)

    # Configure root logger
    root = logging.getLogger()
    root.setLevel(log_level)
    root.addHandler(console)
    root.addHandler(file_handler)
    root.addHandler(error_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)

    return logging.getLogger(app_name)

# Usage
logger = setup_logging(log_level=logging.DEBUG)
logger.info("Application started")
logger.debug("Debug information")
logger.error("An error occurred")
```

## Summary

| Task | Code |
|------|------|
| Basic setup | `logging.basicConfig(level=logging.INFO)` |
| Named logger | `logger = logging.getLogger(__name__)` |
| Log message | `logger.info("Message: %s", value)` |
| Log exception | `logger.exception("Error occurred")` |
| File output | `FileHandler("app.log")` |
| Rotating files | `RotatingFileHandler("app.log", maxBytes=...)` |
| Custom format | `Formatter("%(asctime)s - %(message)s")` |

Use logging instead of print for any code that will run in production. Configure it early, use appropriate levels, and keep sensitive data out of your logs.
